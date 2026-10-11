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
