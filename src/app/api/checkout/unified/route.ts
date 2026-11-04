import { NextResponse } from "next/server";
import { createMockCheckout, MockCheckoutError } from "../../../../mocks/checkout.mock";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
    const headers = new Headers();
    const auth = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const contentType = request.headers.get("content-type");
    if (auth) headers.set("authorization", auth);
    if (cookie) headers.set("cookie", cookie);
    if (contentType) headers.set("content-type", contentType);
    headers.set("accept", "application/json");

    const rawBody = await request.text();
    const upstream = await fetch(`${apiBase}/api/checkout/unified`, {
      method: "POST",
      headers,
      body: rawBody,
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => ({
      success: false,
      error: { code: "UPSTREAM_ERROR", message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" },
    }));
    return NextResponse.json(data, { status: upstream.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_JSON", message: "ข้อมูลคำสั่งซื้อไม่ถูกต้อง" },
      },
      { status: 400 },
    );
  }

  try {
    const data = await createMockCheckout(body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof MockCheckoutError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MOCK_CHECKOUT_REJECTED", message: error.message },
        },
        { status: error.statusCode },
      );
    }
    console.error("Mock checkout failed.", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MOCK_CHECKOUT_FAILED",
          message: "ไม่สามารถสร้างคำสั่งซื้อจำลองได้",
        },
      },
      { status: 500 },
    );
  }
}
