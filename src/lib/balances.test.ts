import { describe, expect, it } from "vitest";
import { applySettlements, computeNetCents, simplifyDebts } from "./balances";

describe("computeNetCents", () => {
  it("nets to zero across all members for a single expense", () => {
    const net = computeNetCents(["a", "b", "c"], [
      {
        payer_id: "a",
        amount: 90,
        splits: [
          { member_id: "a", share_amount: 30 },
          { member_id: "b", share_amount: 30 },
          { member_id: "c", share_amount: 30 },
        ],
      },
    ]);
    expect(net).toEqual({ a: 6000, b: -3000, c: -3000 });
    expect(Object.values(net).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it("accumulates across multiple expenses with different payers", () => {
    const net = computeNetCents(["a", "b"], [
      {
        payer_id: "a",
        amount: 100,
        splits: [
          { member_id: "a", share_amount: 50 },
          { member_id: "b", share_amount: 50 },
        ],
      },
      {
        payer_id: "b",
        amount: 40,
        splits: [
          { member_id: "a", share_amount: 20 },
          { member_id: "b", share_amount: 20 },
        ],
      },
    ]);
    // a: +10000 (paid) - 5000 (own share) - 2000 (share of b's expense) = 3000
    // b: +4000 (paid) - 5000 (share of a's expense) - 2000 (own share) = -3000
    expect(net).toEqual({ a: 3000, b: -3000 });
  });

  it("includes members with zero activity", () => {
    const net = computeNetCents(["a", "b", "ghost"], []);
    expect(net).toEqual({ a: 0, b: 0, ghost: 0 });
  });
});

describe("applySettlements", () => {
  it("moves the payer's net toward zero and the receiver's net down by the same amount", () => {
    const result = applySettlements({ a: -3000, b: 3000 }, [
      { from_member_id: "a", to_member_id: "b", amount: 30 },
    ]);
    expect(result).toEqual({ a: 0, b: 0 });
  });

  it("does not mutate the input", () => {
    const input = { a: -3000, b: 3000 };
    applySettlements(input, [{ from_member_id: "a", to_member_id: "b", amount: 10 }]);
    expect(input).toEqual({ a: -3000, b: 3000 });
  });
});

describe("simplifyDebts", () => {
  it("produces no suggestions when everyone is settled", () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });

  it("pairs a single debtor with a single creditor for the full amount", () => {
    const suggestions = simplifyDebts({ a: -5000, b: 5000 });
    expect(suggestions).toEqual([{ fromMemberId: "a", toMemberId: "b", amountCents: 5000 }]);
  });

  it("minimizes transaction count for a three-way debt (A owes B and C)", () => {
    // a owes 100 total, split 60 to b and 40 to c
    const suggestions = simplifyDebts({ a: -10000, b: 6000, c: 4000 });
    expect(suggestions).toHaveLength(2);
    const total = suggestions.reduce((s, x) => s + x.amountCents, 0);
    expect(total).toBe(10000);
    expect(suggestions.every((s) => s.fromMemberId === "a")).toBe(true);
  });

  it("settles a chain (A owes B, B owes C) in one hop from A to C where possible", () => {
    // Net effect: a is down 100, c is up 100, b is net zero.
    const suggestions = simplifyDebts({ a: -10000, b: 0, c: 10000 });
    expect(suggestions).toEqual([{ fromMemberId: "a", toMemberId: "c", amountCents: 10000 }]);
  });

  it("every suggested amount is positive", () => {
    const suggestions = simplifyDebts({ a: -100, b: -200, c: 150, d: 150 });
    expect(suggestions.every((s) => s.amountCents > 0)).toBe(true);
    const owed = suggestions.reduce((s, x) => s + x.amountCents, 0);
    expect(owed).toBe(300);
  });
});
