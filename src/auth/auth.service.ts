import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Pool, PoolClient } from "pg";
import type {
  AuthTokenPair,
  AuthenticatedUser,
  LoginInput,
  PublicUser,
  RegisterInput,
  UserRole,
} from "./auth.types";

const ACCESS_TOKEN_TTL = "15m" as const;
const REFRESH_TOKEN_TTL = "7d" as const;
const REFRESH_TOKEN_TTL_MILLISECONDS = 7 * 24 * 60 * 60 * 1_000;
const BCRYPT_SALT_ROUNDS = 10;
const USER_ROLES: readonly UserRole[] = ["CUSTOMER", "STAFF", "FINANCE", "ADMIN"];

export interface AuthServiceConfig {
  accessTokenSecret: string;
  issuer: string;
  audience: string;
}

interface UserDatabaseRow {
  id: number;
  email: string;
  password_hash?: string;
  full_name: string;
  phone_number: string | null;
  role: string;
  is_active: boolean;
}

interface RefreshDatabaseRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  user_email: string;
  user_role: string;
  is_active: boolean;
}

export class AuthError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class DuplicateEmailError extends AuthError {
  constructor() {
    super(409, "EMAIL_ALREADY_REGISTERED", "อีเมลนี้ถูกใช้งานแล้ว");
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super(401, "INVALID_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
}

export class InvalidRefreshTokenError extends AuthError {
  constructor() {
    super(401, "INVALID_REFRESH_TOKEN", "Refresh token ไม่ถูกต้องหรือหมดอายุ");
  }
}

export class InactiveAccountError extends AuthError {
  constructor() {
    super(403, "ACCOUNT_INACTIVE", "บัญชีผู้ใช้ถูกระงับ");
  }
}

export class InvalidAccessTokenError extends AuthError {
  constructor() {
    super(401, "INVALID_ACCESS_TOKEN", "Access token ไม่ถูกต้องหรือหมดอายุ");
  }
}

export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly pool: Pool,
    config: AuthServiceConfig,
  ) {
    if (Buffer.byteLength(config.accessTokenSecret, "utf8") < 32) {
      throw new TypeError("Access token secret must be at least 32 bytes.");
    }
    if (config.issuer.trim().length === 0 || config.audience.trim().length === 0) {
      throw new TypeError("JWT issuer and audience must not be empty.");
    }

    this.accessTokenSecret = config.accessTokenSecret;
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  async register(input: RegisterInput): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const phoneNumber = input.phoneNumber?.trim() || null;
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    try {
      const result = await this.pool.query<UserDatabaseRow>(
        `INSERT INTO users (email, password_hash, full_name, phone_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, phone_number, role, is_active`,
        [email, passwordHash, fullName, phoneNumber],
      );
      const user = result.rows[0];
      if (!user) {
        throw new Error("Database did not return the newly registered user.");
      }
      return this.toPublicUser(user);
    } catch (error) {
      if (this.isPostgresError(error, "23505")) {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<{ user: PublicUser; tokens: AuthTokenPair }> {
    const email = input.email.trim().toLowerCase();
    const result = await this.pool.query<UserDatabaseRow>(
      `SELECT id, email, password_hash, full_name, phone_number, role, is_active
       FROM users
       WHERE email = $1`,
      [email],
    );
    const user = result.rows[0];
    const passwordMatches = user?.password_hash
      ? await bcrypt.compare(input.password, user.password_hash)
      : false;

    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }
    if (!user.is_active) {
      throw new InactiveAccountError();
    }

    const authenticatedUser = this.toAuthenticatedUser(user);
    const refreshToken = randomBytes(64).toString("base64url");
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user: this.toPublicUser(user),
      tokens: {
        accessToken: this.createAccessToken(authenticatedUser),
        refreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_TTL,
        refreshTokenExpiresIn: REFRESH_TOKEN_TTL,
      },
    };
  }

  async refreshToken(
    currentRefreshToken: string,
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokenPair }> {
    if (!this.isRefreshTokenFormatValid(currentRefreshToken)) {
      throw new InvalidRefreshTokenError();
    }

    const currentHash = this.hashRefreshToken(currentRefreshToken);
    const replacementRefreshToken = randomBytes(64).toString("base64url");
    const replacementHash = this.hashRefreshToken(replacementRefreshToken);
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const tokenResult = await client.query<RefreshDatabaseRow>(
        `SELECT
           refresh.id,
           refresh.user_id,
           refresh.token_hash,
           refresh.expires_at,
           users.email AS user_email,
           users.role::text AS user_role,
           users.is_active
         FROM refresh_tokens AS refresh
         INNER JOIN users ON users.id = refresh.user_id
         WHERE refresh.token_hash = $1
           AND refresh.expires_at > CURRENT_TIMESTAMP
         FOR UPDATE OF refresh, users`,
        [currentHash],
      );
      const token = tokenResult.rows[0];
      if (!token) {
        throw new InvalidRefreshTokenError();
      }
      if (!token.is_active) {
        throw new InactiveAccountError();
      }

      const role = this.parseUserRole(token.user_role);
      const user: AuthenticatedUser = {
        id: token.user_id,
        email: token.user_email,
        role,
      };

      await client.query("DELETE FROM refresh_tokens WHERE id = $1", [token.id]);
      await this.insertRefreshToken(client, token.user_id, replacementHash);
      await client.query("COMMIT");
      transactionStarted = false;

      return {
        user,
        tokens: {
          accessToken: this.createAccessToken(user),
          refreshToken: replacementRefreshToken,
          accessTokenExpiresIn: ACCESS_TOKEN_TTL,
          refreshTokenExpiresIn: REFRESH_TOKEN_TTL,
        },
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back refresh-token rotation.", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken || !this.isRefreshTokenFormatValid(refreshToken)) {
      return;
    }
    await this.pool.query(
      "DELETE FROM refresh_tokens WHERE token_hash = $1",
      [this.hashRefreshToken(refreshToken)],
    );
  }

  verifyAccessToken(token: string): AuthenticatedUser {
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ["HS256"],
        issuer: this.issuer,
        audience: this.audience,
      });
    } catch {
      throw new InvalidAccessTokenError();
    }

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      !/^[1-9]\d*$/.test(payload.sub) ||
      !Number.isSafeInteger(Number(payload.sub)) ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new InvalidAccessTokenError();
    }

    return {
      id: Number(payload.sub),
      email: payload.email,
      role: this.parseUserRole(payload.role),
    };
  }

  createAccessToken(user: AuthenticatedUser): string {
    return jwt.sign(
      {
        email: user.email,
        role: user.role,
      },
      this.accessTokenSecret,
      {
        algorithm: "HS256",
        subject: String(user.id),
        issuer: this.issuer,
        audience: this.audience,
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );
  }

  private async storeRefreshToken(userId: number, token: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await this.insertRefreshToken(client, userId, this.hashRefreshToken(token));
    } finally {
      client.release();
    }
  }

  private async insertRefreshToken(
    client: PoolClient,
    userId: number,
    tokenHash: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [userId, tokenHash],
    );
  }

  private hashRefreshToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  private isRefreshTokenFormatValid(token: string): boolean {
    return /^[A-Za-z0-9_-]{80,100}$/.test(token);
  }

  private parseUserRole(role: string): UserRole {
    const matchedRole = USER_ROLES.find((allowedRole) => allowedRole === role);
    if (!matchedRole) {
      throw new InvalidAccessTokenError();
    }
    return matchedRole;
  }

  private toAuthenticatedUser(user: UserDatabaseRow): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: this.parseUserRole(user.role),
    };
  }

  private toPublicUser(user: UserDatabaseRow): PublicUser {
    return {
      ...this.toAuthenticatedUser(user),
      fullName: user.full_name,
      phoneNumber: user.phone_number,
    };
  }

  private isPostgresError(error: unknown, code: string): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === code
    );
  }
}
