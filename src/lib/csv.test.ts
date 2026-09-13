import { describe, expect, it } from "vitest";
import { buildExpensesCsv } from "./csv";

describe("buildExpensesCsv", () => {
  const nameById = new Map([
    ["a", "Asha"],
    ["b", "Ben"],
  ]);

  it("produces a header row and one row per expense", () => {
    const csv = buildExpensesCsv(
      [
        {
          description: "Hotel",
          amount: 100,
          disputed: false,
          created_at: "2026-09-13T00:00:00Z",
          payer_id: "a",
          splits: [
            { member_id: "a", share_amount: 50 },
            { member_id: "b", share_amount: 50 },
          ],
        },
      ],
      nameById,
      "USD"
    );
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("Date,Description,Paid by,Amount,Currency,Disputed,Splits");
    expect(lines[1]).toBe("2026-09-13,Hotel,Asha,100.00,USD,No,Asha: 50.00; Ben: 50.00");
  });

  it("quotes and escapes fields containing commas or quotes", () => {
    const csv = buildExpensesCsv(
      [
        {
          description: 'Dinner, "the good one"',
          amount: 10,
          disputed: true,
          created_at: "2026-09-13T00:00:00Z",
          payer_id: "a",
          splits: [{ member_id: "a", share_amount: 10 }],
        },
      ],
      nameById,
      "USD"
    );
    expect(csv).toContain('"Dinner, ""the good one"""');
    expect(csv).toContain(",Yes,");
  });

  it("falls back to Unknown for a member id not in the map", () => {
    const csv = buildExpensesCsv(
      [
        {
          description: "Snacks",
          amount: 5,
          disputed: false,
          created_at: "2026-09-13T00:00:00Z",
          payer_id: "ghost",
          splits: [],
        },
      ],
      nameById,
      "USD"
    );
    expect(csv).toContain("Unknown");
  });
});
