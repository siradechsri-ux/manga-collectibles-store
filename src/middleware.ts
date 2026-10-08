import { NextRequest, NextResponse } from "next/server";

type EdgeUserRole = "CUSTOMER" | "STAFF" | "FINANCE" | "ADMIN";

interface AccessTokenPayload {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
}

const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function isAdminRole(role: unknown): role is EdgeUserRole {
  return (
    role === "ADMIN" ||
    role === "STAFF" ||
    role === "FINANCE"
  );
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!BASE64_URL_PATTERN.test(value)) {
    return null;
  }

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function decodeJsonSegment(value: string): unknown {
  const bytes = decodeBase64Url(value);
  if (!bytes) {
    return null;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

function hasValidPayloadShape(
  payload: unknown,
): payload is AccessTokenPayload & {
  sub: string;
  email: string;
  role: EdgeUserRole;
  iss: string;
  aud: string;
  exp: number;
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as AccessTokenPayload;
  return (
    typeof candidate.sub === "string" &&
    /^[1-9]\d*$/.test(candidate.sub) &&
    Number.isSafeInteger(Number(candidate.sub)) &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string" &&
    ["CUSTOMER", "STAFF", "FINANCE", "ADMIN"].includes(candidate.role) &&
    typeof candidate.iss === "string" &&
    typeof candidate.aud === "string" &&
    typeof candidate.exp === "number"
  );
}

async function verifyAccessToken(
  token: string,
): Promise<
  | (AccessTokenPayload & {
      sub: string;
      email: string;
      role: EdgeUserRole;
      iss: string;
      aud: string;
      exp: number;
    })
  | null
> {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET;
  const issuer = process.env.AUTH_JWT_ISSUER;
  const audience = process.env.AUTH_JWT_AUDIENCE;
  if (!secret || new TextEncoder().encode(secret).length < 32 || !issuer || !audience) {
    return null;
  }

  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const header = decodeJsonSegment(segments[0]);
  if (
    typeof header !== "object" ||
    header === null ||
    !("alg" in header) ||
    header.alg !== "HS256" ||
    !("typ" in header) ||
    header.typ !== "JWT"
  ) {
    return null;
  }

  const signature = decodeBase64Url(segments[2]);
  const payloadValue = decodeJsonSegment(segments[1]);
  if (!signature || !hasValidPayloadShape(payloadValue)) {
    return null;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signatureIsValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(`${segments[0]}.${segments[1]}`),
    );
    if (!signatureIsValid) {
      return null;
    }

    const currentTimeSeconds = Math.floor(Date.now() / 1_000);
    if (
      payloadValue.exp <= currentTimeSeconds ||
      payloadValue.iss !== issuer ||
      payloadValue.aud !== audience
    ) {
      return null;
    }

    return payloadValue;
  } catch {
    return null;
  }
}

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

function forbiddenRedirect(request: NextRequest): NextResponse {
  const forbiddenUrl = new URL("/access-denied", request.url);
  forbiddenUrl.searchParams.set(
    "from",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(forbiddenUrl);
}

function dashboardForRole(role: EdgeUserRole): string {
  if (role === "ADMIN") {
    return "/admin";
  }
  if (role === "STAFF") {
    return "/staff/packing";
  }
  if (role === "FINANCE") {
    return "/finance/slips";
  }
  return "/account/orders";
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isStaffPage = pathname === "/staff" || pathname.startsWith("/staff/");
  const isFinancePage =
    pathname === "/finance" || pathname.startsWith("/finance/");
  const isOrderListPage = pathname === "/orders";
  const isOrderDetailPage =
    pathname.startsWith("/orders/") && pathname !== "/orders/";
  const isProfilePage = pathname === "/profile" || pathname.startsWith("/profile/");
  const isCheckoutPage =
    pathname === "/checkout" || pathname.startsWith("/checkout/");
  const isProtectedCustomerPage =
    isCheckoutPage ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    isProfilePage ||
    isOrderListPage ||
    isOrderDetailPage;

  if (
    process.env.NEXT_PUBLIC_USE_MOCK === "true" &&
    (isAdminPage ||
      isStaffPage ||
      isFinancePage ||
      isCheckoutPage ||
      pathname === "/account" ||
      pathname.startsWith("/account/") ||
      isProfilePage ||
      isOrderListPage ||
      isOrderDetailPage)
  ) {
    return NextResponse.next();
  }

  if (!isAdminPage && !isStaffPage && !isFinancePage && !isProtectedCustomerPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  const user = token ? await verifyAccessToken(token) : null;
  if (!user) {
    return loginRedirect(request);
  }

  if (
    (isAdminPage && user.role !== "ADMIN") ||
    (isStaffPage && user.role !== "STAFF" && user.role !== "ADMIN") ||
    (isFinancePage && user.role !== "FINANCE" && user.role !== "ADMIN") ||
    ((pathname === "/account" ||
      pathname.startsWith("/account/") ||
      isOrderListPage) &&
      user.role !== "CUSTOMER")
  ) {
    return forbiddenRedirect(request);
  }

  if (
    isOrderDetailPage &&
    user.role !== "CUSTOMER" &&
    user.role !== "STAFF" &&
    user.role !== "ADMIN"
  ) {
    return forbiddenRedirect(request);
  }

  if (isCheckoutPage && user.role !== "CUSTOMER") {
    const dashboardUrl = new URL(dashboardForRole(user.role), request.url);
    dashboardUrl.searchParams.set("notice", "shopping-disabled");
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/finance/:path*",
    "/account/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/profile/:path*",
  ],
};
