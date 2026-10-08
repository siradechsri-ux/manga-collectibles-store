import { NextFunction, Request, RequestHandler, Response } from "express";
import { AuthService, AuthError } from "./auth.service";
import type { UserRole } from "./auth.types";

export function authenticateToken(authService: AuthService): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const authorization = request.header("authorization");
    const match = authorization?.match(/^Bearer ([^\s]+)$/);
    if (!match) {
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
      request.user = authService.verifyAccessToken(match[1]);
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
