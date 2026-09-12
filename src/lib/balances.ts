import { toCents } from "./money";

type ExpenseForBalance = {
  payer_id: string;
  amount: number;
  splits: { member_id: string; share_amount: number }[];
};

export type SettlementSuggestion = {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
};

/**
 * Net balance per member, in cents. Positive means the group owes them;
 * negative means they owe the group. Always sums to exactly zero across all
 * members, since add_expense/update_expense enforce splits summing exactly
 * to the expense amount — every expense contributes net zero.
 */
export function computeNetCents(
  memberIds: string[],
  expenses: ExpenseForBalance[]
): Record<string, number> {
  const netCents: Record<string, number> = {};
  memberIds.forEach((id) => (netCents[id] = 0));

  for (const exp of expenses) {
    netCents[exp.payer_id] = (netCents[exp.payer_id] ?? 0) + toCents(exp.amount);
    for (const split of exp.splits) {
      netCents[split.member_id] = (netCents[split.member_id] ?? 0) - toCents(split.share_amount);
    }
  }

  return netCents;
}

/**
 * Greedy debt simplification (largest creditor paired with largest debtor)
 * — the standard minimal-transaction-count approach, so the group gets a
 * short list of who should pay whom instead of a tangle of pairwise debts.
 */
export function simplifyDebts(netCents: Record<string, number>): SettlementSuggestion[] {
  const creditors = Object.entries(netCents)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, remaining: v }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = Object.entries(netCents)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, remaining: -v }))
    .sort((a, b) => b.remaining - a.remaining);

  const result: SettlementSuggestion[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].remaining, debtors[j].remaining);
    if (amount > 0) {
      result.push({ fromMemberId: debtors[j].id, toMemberId: creditors[i].id, amountCents: amount });
    }
    creditors[i].remaining -= amount;
    debtors[j].remaining -= amount;
    if (creditors[i].remaining <= 0) i++;
    if (debtors[j].remaining <= 0) j++;
  }
  return result;
}
