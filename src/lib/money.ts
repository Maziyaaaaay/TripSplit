export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code + " ";
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatAmount(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Splits a total evenly across member ids using largest-remainder rounding,
 * so the shares always sum exactly to the total even when it doesn't divide
 * evenly (e.g. ₹10 / 3 → 3.34 + 3.33 + 3.33, not 3.33 × 3 = 9.99).
 */
export function splitEqually(totalAmount: number, memberIds: string[]): Record<string, number> {
  const totalCents = toCents(totalAmount);
  const n = memberIds.length;
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;

  const shares: Record<string, number> = {};
  memberIds.forEach((id, i) => {
    shares[id] = fromCents(base + (i < remainder ? 1 : 0));
  });
  return shares;
}
