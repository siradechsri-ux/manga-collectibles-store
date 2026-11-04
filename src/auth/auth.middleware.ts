import { NextFunction, Request, RequestHandler, Response } from "express";
import { AuthService, AuthError } from "./auth.service";
import type { UserRole } from "./auth.types";

function extractToken(request: Request): string | null {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (match?.[1]) {
    return match[1];
  }
  const cookieToken = request.cookies?.access_token;
  if (typeof cookieToken === "string" && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }
  return null;
}

export function authenticateToken(authService: AuthService): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const token = extractToken(request);
    if (!token) {
      response.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "กรุณาเข้าสู่ระบบ",
        },
      });
      return;
    }

    try {
      request.user = authService.verifyAccessToken(token);
      next();
    } catch (error) {
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
      next(error);
    }
  };
}

export function optionalAuthenticateToken(authService: AuthService): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const token = extractToken(request);
    if (token) {
      try {
        request.user = authService.verifyAccessToken(token);
      } catch {
        // Ignore expired/invalid token on optional routes
      }
    }
    next();
  };
}

export function requireRoles(allowedRoles: readonly UserRole[]): RequestHandler {
  const allowedRoleSet = new Set(allowedRoles);

  return (request: Request, response: Response, next: NextFunction): void => {
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

    if (!allowedRoleSet.has(request.user.role)) {
      response.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "คุณไม่มีสิทธิ์ดำเนินการนี้",
        },
      });
      return;
    }

    next();
  };
}
