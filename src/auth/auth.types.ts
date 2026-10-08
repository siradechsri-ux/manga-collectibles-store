export type UserRole = "CUSTOMER" | "STAFF" | "FINANCE" | "ADMIN";

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface PublicUser {
  id: number;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: UserRole;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: "15m";
  refreshTokenExpiresIn: "7d";
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
