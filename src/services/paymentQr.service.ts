import generatePromptPayPayload = require("promptpay-qr");
import QRCode from "qrcode";

export class PaymentQrConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

function getPromptPayId(): string {
  const promptPayId = process.env.PROMPTPAY_ID?.replace(/[\s-]/g, "");
  if (!promptPayId) {
    throw new PaymentQrConfigurationError(
      "PROMPTPAY_ID is required to generate a PromptPay payment QR code.",
    );
  }

  const isMobileNumber = /^0\d{9}$/.test(promptPayId);
  const isNationalIdOrTaxId = /^\d{13}$/.test(promptPayId);
  if (!isMobileNumber && !isNationalIdOrTaxId) {
    throw new PaymentQrConfigurationError(
      "PROMPTPAY_ID must be a 10-digit mobile number or a 13-digit national/tax ID.",
    );
  }
  return promptPayId;
}

export async function generatePromptPayQrDataUrl(amount: number): Promise<string> {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
  ) {
    throw new RangeError("PromptPay QR amount must be a positive amount with at most two decimal places.");
  }

  const promptPayId = getPromptPayId();
  try {
    const payload = generatePromptPayPayload(promptPayId, { amount });
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      type: "image/png",
      width: 512,
    });
  } catch (error) {
    if (error instanceof PaymentQrConfigurationError) {
      throw error;
    }
    throw new Error("Failed to generate the PromptPay payment QR code.", {
      cause: error,
    });
  }
}
