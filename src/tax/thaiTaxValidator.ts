export function isValidThaiTaxId(value: string): boolean {
  return /^\d{13}$/.test(value.trim());
}

export function validateThaiTaxId(value: string): void {
  if (!isValidThaiTaxId(value)) {
    throw new TypeError("เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก");
  }
}
