// Converts between what the artist types ("1450" or "1450.50") and integer
// minor units, using string arithmetic only, so no float ever touches money.

const AMOUNT_PATTERN = /^(\d{1,9})(?:[.,](\d{1,2}))?$/;

/** Parses a major-unit amount; null when it isn't a valid amount. */
export function parseAmount(input: string): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim().replace(/\s+/g, ""));
  if (!match) return null;
  const whole = match[1]!;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return Number(whole) * 100 + Number(fraction);
}

/** The value to prefill the amount field with ("1450", "640.50"). */
export function amountToInput(amountMinor: number | null): string {
  if (amountMinor === null) return "";
  const whole = Math.floor(amountMinor / 100);
  const cents = amountMinor % 100;
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, "0")}`;
}

/** Exchange rates are carried as integers in millionths (1.1206 is 1_120_600). */
export const RATE_SCALE = 1_000_000;

/**
 * Converts an amount at an exchange rate (in millionths) and rounds it to a
 * whole amount, so €1,450 at 1.1206 becomes $1,625. Integer arithmetic only.
 */
export function convertAmount(amountMinor: number, rateMillionths: number): number {
  const product = BigInt(amountMinor) * BigInt(rateMillionths);
  const perUnit = BigInt(RATE_SCALE) * BigInt(100);
  return Number((product + perUnit / BigInt(2)) / perUnit) * 100;
}
