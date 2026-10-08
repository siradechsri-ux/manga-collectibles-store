import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMockQrDataUrl } from "../../../../../mocks/qr.mock";
import { verifyMockSlip } from "../../../../../mocks/slip.mock";

export const runtime = "nodejs";

interface SlipRouteContext {
  params: Promise<{ id: string }>;
}

const paramsSchema = z.object({ id: z.string().regex(/^[1-9]\d*$/) }).strict();
const paymentStatusSchema = z.enum(["PAID", "DEPOSIT_PAID"]);
const paymentStageSchema = z.enum(["INITIAL", "BALANCE"]);
const amountSchema = z.string().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/);

export async function GET(
  request: Request,
  context: SlipRouteContext,
): Promise<NextResponse> {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MOCK_MODE_DISABLED", message: "โหมด Prototype ปิดอยู่" },
      },
      { status: 404 },
    );
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  const orderId = parsedParams.success ? Number(parsedParams.data.id) : Number.NaN;
  const amountValue = new URL(request.url).searchParams.get("amount");
  const parsedAmount = amountSchema.safeParse(amountValue);
  if (!parsedParams.success || !Number.isSafeInteger(orderId) || orderId <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ORDER_ID", message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" },
      },
      { status: 400 },
    );
  }
  if (!parsedAmount.success || Number(parsedAmount.data) <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_AMOUNT", message: "ยอดชำระจำลองไม่ถูกต้อง" },
      },
      { status: 400 },
    );
  }

  try {
    const dataUrl = await generateMockQrDataUrl({
      orderId,
      orderNumber: `DEMO-${orderId}`,
      amount: Number(parsedAmount.data).toFixed(2),
    });
    return NextResponse.json(
      { success: true, data: { orderId, amount: parsedAmount.data, dataUrl } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not generate the demo balance QR.", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MOCK_QR_GENERATION_FAILED",
          message: "ไม่สามารถสร้าง QR จำลองสำหรับยอดคงเหลือได้",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: SlipRouteContext,
): Promise<NextResponse> {
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

  const parsedParams = paramsSchema.safeParse(await context.params);
  const orderId = parsedParams.success ? Number(parsedParams.data.id) : Number.NaN;
  if (
    !parsedParams.success ||
    !Number.isSafeInteger(orderId) ||
    orderId <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ORDER_ID", message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" },
      },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_FORM_DATA", message: "ข้อมูลไฟล์สลิปไม่ถูกต้อง" },
      },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("slip");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SLIP_REQUIRED", message: "กรุณาแนบไฟล์สลิป" },
      },
      { status: 400 },
    );
  }
  const parsedStatus = paymentStatusSchema.safeParse(formData.get("paymentStatus"));
  const parsedStage = paymentStageSchema.safeParse(
    formData.get("paymentStage") ?? "INITIAL",
  );
  const amountValue = formData.get("amount");
  const amount =
    typeof amountValue === "string" && /^\d+(?:\.\d{1,2})?$/.test(amountValue)
      ? amountValue
      : null;
  if (!parsedStatus.success || !parsedStage.success || amount === null) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_PAYMENT_DATA", message: "ข้อมูลยอดชำระไม่ถูกต้อง" },
      },
      { status: 400 },
    );
  }

  try {
    const data = await verifyMockSlip(
      fileEntry,
      orderId,
      amount,
      parsedStatus.data,
      parsedStage.data,
    );
    return NextResponse.json(
      {
        success: true,
        data: {
          orderId,
          paymentStatus: data.paymentStatus,
          paymentStage: data.paymentStage,
          verifiedAmount: data.verifiedAmount,
          transactionRef: data.transactionRef,
          message:
            data.paymentStatus === "DEPOSIT_PAID"
              ? "ยืนยันการชำระมัดจำจำลองสำเร็จ"
              : "ยืนยันการชำระเงินจำลองสำเร็จ",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ตรวจสอบสลิปจำลองไม่สำเร็จ";
    const status =
      error instanceof RangeError
        ? 413
        : error instanceof TypeError
          ? 400
          : 500;
    if (status === 500) {
      console.error("Mock slip verification failed.", error);
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "MOCK_SLIP_REJECTED", message },
      },
      { status },
    );
  }
}
