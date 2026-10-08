export interface MockSlipVerificationResult {
  paymentStatus: "PAID" | "DEPOSIT_PAID";
  paymentStage: "INITIAL" | "BALANCE";
  transactionRef: string;
  verifiedAmount: string;
  verifiedAt: string;
  settlementStatus: "READY_TO_PACK" | "WAITING_FOR_ARRIVAL";
}

export async function verifyMockSlip(
  file: File,
  orderId: number,
  amount: string,
  paymentStatus: "PAID" | "DEPOSIT_PAID",
  paymentStage: "INITIAL" | "BALANCE" = "INITIAL",
): Promise<MockSlipVerificationResult> {
  if (!(file instanceof File) || file.size === 0) {
    throw new TypeError("กรุณาแนบไฟล์สลิปจำลอง");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new RangeError("ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB");
  }
  if (!file.type.startsWith("image/")) {
    throw new TypeError("กรุณาเลือกไฟล์รูปภาพสำหรับจำลองสลิป");
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  return {
    paymentStatus,
    paymentStage,
    transactionRef: `DEMO-${orderId}-${Date.now()}`,
    verifiedAmount: amount,
    verifiedAt: new Date().toISOString(),
    settlementStatus:
      paymentStatus === "DEPOSIT_PAID" ? "WAITING_FOR_ARRIVAL" : "READY_TO_PACK",
  };
}
