export function isValidThaiTaxId(value: string): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  let weightedSum = 0;
  for (let index = 0; index < 12; index += 1) {
    const digit = Number(value[index]);
    weightedSum += digit * (13 - index);
  }
  const expectedCheckDigit = (11 - (weightedSum % 11)) % 10;
  return expectedCheckDigit === Number(value[12]);
}

export function validateThaiTaxId(value: string): void {
  if (!isValidThaiTaxId(value)) {
    throw new TypeError("เลขประจำตัวผู้เสียภาษีต้องเป็นเลข 13 หลักที่ผ่านการตรวจสอบ checksum");
  }
}
