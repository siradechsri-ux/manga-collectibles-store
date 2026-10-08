import {
  CookieOptions,
  RequestHandler,
  Response,
  Router,
} from "express";
import { z } from "zod";
import { AuthError, AuthService } from "./auth.service";
import { authenticateToken } from "./auth.middleware";
import { loginSchema, registerSchema } from "./auth.schemas";

export interface AuthControllerOptions {
  refreshCookieName?: string;
  cookieSecure?: boolean;
  cookieDomain?: string;
}

function authCookieOptions(options: AuthControllerOptions): CookieOptions {
  return {
    httpOnly: true,
    secure: options.cookieSecure ?? process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1_000,
    ...(options.cookieDomain ? { domain: options.cookieDomain } : {}),
  };
}

function accessCookieOptions(options: AuthControllerOptions): CookieOptions {
  return {
    httpOnly: true,
    secure: options.cookieSecure ?? process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60 * 1_000,
    ...(options.cookieDomain ? { domain: options.cookieDomain } : {}),
  };
}

function sendAuthError(response: Response, error: unknown): void {
  if (error instanceof AuthError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error("Authentication request failed.", error);
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถดำเนินการได้ในขณะนี้",
    },
  });
}

function sendValidationError(response: Response, error: z.ZodError): void {
  response.status(400).json({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; "),
    },
  });
}

export function createAuthController(
  authService: AuthService,
  options: AuthControllerOptions = {},
): {
  register: RequestHandler;
  login: RequestHandler;
  refreshToken: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
} {
  const refreshCookieName = options.refreshCookieName ?? "refresh_token";
  const accessCookieName = "access_token";
  const cookieOptions = authCookieOptions(options);
  const accessCookie = accessCookieOptions(options);
  const clearCookieOptions: CookieOptions = {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    ...(cookieOptions.domain ? { domain: cookieOptions.domain } : {}),
  };

  const register: RequestHandler = async (request, response): Promise<void> => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error);
      return;
    }

    try {
      const user = await authService.register({
        email: parsed.data.email,
        password: parsed.data.password,
        fullName: parsed.data.full_name,
        phoneNumber: parsed.data.phone,
      });
      response.status(201).json({ success: true, data: { user } });
    } catch (error) {
      sendAuthError(response, error);
    }
  };

  const login: RequestHandler = async (request, response): Promise<void> => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error);
      return;
    }

    try {
      const result = await authService.login(parsed.data);
      response.cookie(refreshCookieName, result.tokens.refreshToken, cookieOptions);
      response.cookie(accessCookieName, result.tokens.accessToken, accessCookie);
      response.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          tokenType: "Bearer",
          expiresIn: result.tokens.accessTokenExpiresIn,
        },
      });
    } catch (error) {
      sendAuthError(response, error);
    }
  };

  const refreshToken: RequestHandler = async (request, response): Promise<void> => {
    const refreshTokenValue: unknown = request.cookies?.[refreshCookieName];
    if (typeof refreshTokenValue !== "string") {
      response.status(401).json({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "Refresh token ไม่ถูกต้องหรือหมดอายุ",
        },
      });
      return;
    }

    try {
      const result = await authService.refreshToken(refreshTokenValue);
      response.cookie(refreshCookieName, result.tokens.refreshToken, cookieOptions);
      response.cookie(accessCookieName, result.tokens.accessToken, accessCookie);
      response.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          tokenType: "Bearer",
          expiresIn: result.tokens.accessTokenExpiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AuthError && error.statusCode === 401) {
        response.clearCookie(refreshCookieName, clearCookieOptions);
        response.clearCookie(accessCookieName, {
          httpOnly: true,
          secure: accessCookie.secure,
          sameSite: accessCookie.sameSite,
          path: accessCookie.path,
          ...(accessCookie.domain ? { domain: accessCookie.domain } : {}),
        });
      }
      sendAuthError(response, error);
    }
  };

  const logout: RequestHandler = async (request, response): Promise<void> => {
    const refreshTokenValue: unknown = request.cookies?.[refreshCookieName];
    try {
      await authService.logout(
        typeof refreshTokenValue === "string" ? refreshTokenValue : undefined,
      );
      response.clearCookie(refreshCookieName, clearCookieOptions);
      response.clearCookie(accessCookieName, {
        httpOnly: true,
        secure: accessCookie.secure,
        sameSite: accessCookie.sameSite,
        path: accessCookie.path,
        ...(accessCookie.domain ? { domain: accessCookie.domain } : {}),
      });
      response.status(200).json({ success: true, data: { loggedOut: true } });
    } catch (error) {
      sendAuthError(response, error);
    }
  };

  const me: RequestHandler = (request, response): void => {
    if (!request.user) {
      response.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "กรุณาเข้าสู่ระบบ",
        },
      });
      return;
    }
    response.status(200).json({ success: true, data: { user: request.user } });
  };

  return { register, login, refreshToken, logout, me };
}

export function createAuthRouter(
  authService: AuthService,
  options: AuthControllerOptions = {},
): Router {
  const router = Router();
  const controller = createAuthController(authService, options);
  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.post("/refresh", controller.refreshToken);
  router.post("/logout", controller.logout);
  router.get("/me", authenticateToken(authService), controller.me);
  return router;
}
