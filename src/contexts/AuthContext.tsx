"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import {
  getMockUser,
  loginAsMockRole,
  loginMockUser,
  logoutMockUser,
  updateMockUserDetails,
} from "../mocks/auth.mock";

export type AuthRole = "CUSTOMER" | "STAFF" | "FINANCE" | "ADMIN";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: AuthRole;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  fullName: string;
  phoneNumber?: string;
}

export interface AuthenticatedFetchOptions extends RequestInit {
  retryAfterRefresh?: boolean;
}

interface AuthApiSuccess<T> {
  success: true;
  data: T;
}

interface AuthApiFailure {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthUser>;
  quickLogin: (
    role: "CUSTOMER" | "ADMIN" | "STAFF" | "FINANCE",
  ) => Promise<AuthUser>;
  register: (credentials: RegisterCredentials) => Promise<AuthUser>;
  updateUserDetails: (fullName: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthUser | null>;
  authenticatedFetch: (
    input: RequestInfo | URL,
    init?: AuthenticatedFetchOptions,
  ) => Promise<Response>;
}

interface AuthProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

const authUserSchema = z
  .object({
    id: z.number().int().positive().safe(),
    email: z.string().email(),
    fullName: z.string().min(1),
    role: z.enum(["CUSTOMER", "STAFF", "FINANCE", "ADMIN"]),
  })
  .passthrough();

const loginResponseSchema = z
  .object({
    success: z.literal(true),
    data: z
      .object({
        user: authUserSchema,
        accessToken: z.string().min(1),
        tokenType: z.literal("Bearer"),
        expiresIn: z.string(),
      })
      .strict(),
  })
  .strict();

const apiErrorSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

function normalizeBaseUrl(value: string | undefined): string {
  const baseUrl = value?.trim() || "";
  return baseUrl.replace(/\/+$/, "");
}

async function parseError(response: Response): Promise<Error> {
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return new Error(`คำขอล้มเหลว (HTTP ${response.status})`);
  }

  const parsed = apiErrorSchema.safeParse(body);
  return new Error(
    parsed.success && parsed.data.error?.message
      ? parsed.data.error.message
      : `คำขอล้มเหลว (HTTP ${response.status})`,
  );
}

async function parseLoginResponse(response: Response): Promise<{
  user: AuthUser;
  accessToken: string;
}> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("เซิร์ฟเวอร์ส่งข้อมูลตอบกลับไม่ถูกต้อง");
  }

  const parsed = loginResponseSchema.safeParse(body);
  if (!response.ok || !parsed.success) {
    if (response.ok) {
      throw new Error("รูปแบบข้อมูลจากระบบยืนยันตัวตนไม่ถูกต้อง");
    }
    const parsedError = apiErrorSchema.safeParse(body);
    throw new Error(
      parsedError.success && parsedError.data.error?.message
        ? parsedError.data.error.message
        : `เข้าสู่ระบบไม่สำเร็จ (HTTP ${response.status})`,
    );
  }

  return {
    user: parsed.data.data.user,
    accessToken: parsed.data.data.accessToken,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, apiBaseUrl }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<AuthUser | null> | null>(null);
  const apiBase = useMemo(
    () => normalizeBaseUrl(apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL),
    [apiBaseUrl],
  );

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const mockUser = getMockUser();
      setUser(mockUser);
      return mockUser;
    }
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const response = await fetch(`${apiBase}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          accessTokenRef.current = null;
          setUser(null);
          return null;
        }

        const result = await parseLoginResponse(response);
        accessTokenRef.current = result.accessToken;
        setUser(result.user);
        return result.user;
      } catch {
        accessTokenRef.current = null;
        setUser(null);
        return null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [apiBase]);

  useEffect(() => {
    let mounted = true;
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      accessTokenRef.current = null;
      setUser(getMockUser());
      setIsLoading(false);
      const handleStorage = (event: StorageEvent): void => {
        if (event.key === "manga-collectibles-mock-user-v1") {
          setUser(getMockUser());
        }
      };
      window.addEventListener("storage", handleStorage);
      return () => {
        mounted = false;
        window.removeEventListener("storage", handleStorage);
      };
    }
    void refreshSession().finally(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  const login = useCallback(
    async (credentials: AuthCredentials): Promise<AuthUser> => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        const mockUser = loginMockUser(credentials.email);
        setUser(mockUser);
        return mockUser;
      }
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        cache: "no-store",
      });

      const result = await parseLoginResponse(response);
      accessTokenRef.current = result.accessToken;
      setUser(result.user);
      return result.user;
    },
    [apiBase],
  );

  const quickLogin = useCallback(
    async (
      role: "CUSTOMER" | "ADMIN" | "STAFF" | "FINANCE",
    ): Promise<AuthUser> => {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
        throw new Error("Quick Test Login ใช้ได้เฉพาะเมื่อเปิดโหมด Prototype");
      }
      const mockUser = loginAsMockRole(role);
      setUser(mockUser);
      return mockUser;
    },
    [],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<AuthUser> => {
      const response = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          full_name: credentials.fullName,
          phone: credentials.phoneNumber,
        }),
        cache: "no-store",
      });

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("เซิร์ฟเวอร์ส่งข้อมูลตอบกลับไม่ถูกต้อง");
      }
      const resultSchema = z
        .object({
          success: z.literal(true),
          data: z.object({ user: authUserSchema }).strict(),
        })
        .strict();
      const parsed = resultSchema.safeParse(body);

      if (!response.ok || !parsed.success) {
        if (response.ok) {
          throw new Error("รูปแบบข้อมูลจากระบบสมัครสมาชิกไม่ถูกต้อง");
        }
        const parsedError = apiErrorSchema.safeParse(body);
        throw new Error(
          parsedError.success && parsedError.data.error?.message
            ? parsedError.data.error.message
            : `สมัครสมาชิกไม่สำเร็จ (HTTP ${response.status})`,
        );
      }

      return parsed.data.data.user;
    },
    [apiBase],
  );

  const updateUserDetails = useCallback((fullName: string): void => {
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
      throw new Error("การแก้ไขชื่อบัญชีต้องเชื่อมต่อ API โปรไฟล์");
    }
    const updatedUser = updateMockUserDetails(fullName);
    if (!updatedUser) {
      throw new Error("กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูลบัญชี");
    }
    setUser(updatedUser);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      logoutMockUser();
      setUser(null);
      return;
    }
    try {
      const response = await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        throw await parseError(response);
      }
    } finally {
      accessTokenRef.current = null;
      setUser(null);
    }
  }, [apiBase]);

  const authenticatedFetch = useCallback(
    async (
      input: RequestInfo | URL,
      init: AuthenticatedFetchOptions = {},
    ): Promise<Response> => {
      const { retryAfterRefresh = true, ...requestInit } = init;
      const headers = new Headers(requestInit.headers);
      if (accessTokenRef.current) {
        headers.set("Authorization", `Bearer ${accessTokenRef.current}`);
      }

      const request = new Request(input, {
        ...requestInit,
        headers,
        credentials: requestInit.credentials ?? "include",
      });
      const requestForRetry = request.clone();
      const response = await fetch(request);

      if (response.status !== 401 || !retryAfterRefresh) {
        return response;
      }

      const refreshedUser = await refreshSession();
      if (!refreshedUser || !accessTokenRef.current) {
        return response;
      }

      const retryHeaders = new Headers(request.headers);
      retryHeaders.set("Authorization", `Bearer ${accessTokenRef.current}`);
      return fetch(
        new Request(requestForRetry, {
          headers: retryHeaders,
          credentials: request.credentials,
        }),
      );
    },
    [refreshSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      quickLogin,
      register,
      updateUserDetails,
      logout,
      refreshSession,
      authenticatedFetch,
    }),
    [
      user,
      isLoading,
      login,
      quickLogin,
      register,
      updateUserDetails,
      logout,
      refreshSession,
      authenticatedFetch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
