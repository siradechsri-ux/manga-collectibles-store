import QRCode from "qrcode";

export interface MockQrRequest {
  orderId: number;
  orderNumber: string;
  amount: string;
}

export async function generateMockQrDataUrl(request: MockQrRequest): Promise<string> {
  const encodedValue = [
    "MANGA_STORE_DEMO_PAYMENT",
    `ORDER=${request.orderNumber}`,
    `AMOUNT=${request.amount}`,
    `ID=${request.orderId}`,
  ].join("|");

  try {
    const svg = await QRCode.toString(encodedValue, {
      errorCorrectionLevel: "M",
      margin: 2,
      type: "svg",
      width: 420,
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch (error) {
    console.error("Failed to generate the non-payment demo QR code.", error);
    throw new Error("ไม่สามารถสร้าง QR จำลองได้", { cause: error });
  }
}
