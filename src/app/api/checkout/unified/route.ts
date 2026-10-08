import { NextResponse } from "next/server";
import { createMockCheckout, MockCheckoutError } from "../../../../mocks/checkout.mock";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MOCK_MODE_DISABLED",
          message: "โหมด Prototype ปิดอยู่",
        },
      },
      { status: 404 },
    );
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
