"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { splitEqually, toCents } from "@/lib/money";

export type ExpenseState = { error?: string; success?: boolean };

const MAX_DESCRIPTION_LENGTH = 80;
const MAX_AMOUNT = 10_000_000;

type Split = { member_id: string; share_amount: number };

function readExpenseForm(formData: FormData): { error: string } | {
  description: string;
  amount: number;
  payerId: string;
  splits: Split[];
} {
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const payerId = String(formData.get("payerId") ?? "").trim();
  const splitMode = String(formData.get("splitMode") ?? "equal");
  const selectedMembers = formData.getAll("members").map(String).filter(Boolean);

  if (!description) return { error: "Add a short description." };
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return { error: `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.` };

  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0)
    return { error: "Enter a valid amount." };
  if (amount > MAX_AMOUNT) return { error: "That amount looks too large." };

  if (!payerId) return { error: "Choose who paid." };
  if (selectedMembers.length === 0) return { error: "Select at least one person to split with." };

  const roundedAmount = Math.round(amount * 100) / 100;

  let splits: Split[];
  if (splitMode === "custom") {
    splits = selectedMembers.map((memberId) => {
      const raw = String(formData.get(`share_${memberId}`) ?? "0");
      return { member_id: memberId, share_amount: Math.round(Number(raw) * 100) / 100 };
    });
    const sum = splits.reduce((s, x) => s + toCents(x.share_amount), 0);
    if (sum !== toCents(roundedAmount)) {
      return { error: "Custom amounts must add up to the total." };
    }
  } else {
    const shares = splitEqually(roundedAmount, selectedMembers);
    splits = selectedMembers.map((memberId) => ({ member_id: memberId, share_amount: shares[memberId] }));
  }

  return { description, amount: roundedAmount, payerId, splits };
}

export async function addExpense(
  tripId: string,
  tripSlug: string,
  _prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const parsed = readExpenseForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_expense", {
    p_trip_id: tripId,
    p_payer_id: parsed.payerId,
    p_amount: parsed.amount,
    p_description: parsed.description,
    p_splits: parsed.splits,
  });

  if (error) return { error: "Could not add the expense. Try again." };

  revalidatePath(`/t/${tripSlug}`);
  return { success: true };
}

export async function updateExpense(
  expenseId: string,
  tripSlug: string,
  _prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const parsed = readExpenseForm(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_expense", {
    p_expense_id: expenseId,
    p_payer_id: parsed.payerId,
    p_amount: parsed.amount,
    p_description: parsed.description,
    p_splits: parsed.splits,
  });

  if (error) return { error: "Could not save changes. Try again." };

  revalidatePath(`/t/${tripSlug}`);
  return { success: true };
}

export async function deleteExpense(expenseId: string, tripSlug: string) {
  const supabase = await createClient();
  await supabase.rpc("delete_expense", { p_expense_id: expenseId });
  revalidatePath(`/t/${tripSlug}`);
}

export async function toggleDispute(expenseId: string, tripSlug: string) {
  const supabase = await createClient();
  await supabase.rpc("toggle_dispute", { p_expense_id: expenseId });
  revalidatePath(`/t/${tripSlug}`);
}
