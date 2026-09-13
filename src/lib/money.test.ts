import { describe, expect, it } from "vitest";
import { currencySymbol, formatAmount, fromCents, splitEqually, toCents } from "./money";

describe("toCents / fromCents", () => {
  it("round-trips whole and fractional amounts", () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents(10.5)).toBe(1050);
    expect(fromCents(1050)).toBe(10.5);
  });

  it("rounds floating-point noise to the nearest cent", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});

describe("currencySymbol", () => {
  it("maps known codes to their symbol", () => {
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("USD")).toBe("$");
  });

  it("falls back to the code itself for unknown currencies", () => {
    expect(currencySymbol("XYZ")).toBe("XYZ ");
  });
});

describe("formatAmount", () => {
  it("formats with two decimal places and a currency symbol", () => {
    expect(formatAmount(1234.5, "USD")).toBe("$1,234.50");
  });
});

describe("splitEqually", () => {
  it("splits evenly when the total divides cleanly", () => {
    const shares = splitEqually(300, ["a", "b", "c"]);
    expect(shares).toEqual({ a: 100, b: 100, c: 100 });
  });

  it("distributes the remainder by largest-remainder rounding, summing exactly to the total", () => {
    const shares = splitEqually(10, ["a", "b", "c"]);
    const total = Object.values(shares).reduce((sum, v) => sum + toCents(v), 0);
    expect(total).toBe(toCents(10));
    // 1000 cents / 3 = 333 base + 1 leftover cent -> one member gets 3.34, two get 3.33
    expect(Object.values(shares).sort()).toEqual([3.33, 3.33, 3.34]);
  });

  it("always sums exactly to the total in cents, even for awkward splits", () => {
    for (const [amount, n] of [[0.01, 3], [100.01, 7], [999.99, 11]] as const) {
      const memberIds = Array.from({ length: n }, (_, i) => `m${i}`);
      const shares = splitEqually(amount, memberIds);
      const totalCents = Object.values(shares).reduce((sum, v) => sum + toCents(v), 0);
      expect(totalCents).toBe(toCents(amount));
    }
  });
});
