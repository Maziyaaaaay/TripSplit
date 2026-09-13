"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { splitEqually, toCents } from "@/lib/money";

export type ExpenseState = { error?: string; success?: boolean };

const MAX_DESCRIPTION_LENGTH = 80;
const MAX_NOTES_LENGTH = 500;
const MAX_AMOUNT = 10_000_000;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

type Split = { member_id: string; share_amount: number };

function readExpenseForm(formData: FormData): { error: string } | {
  description: string;
  notes: string | null;
  amount: number;
  payerId: string;
  splits: Split[];
} {
  const description = String(formData.get("description") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const payerId = String(formData.get("payerId") ?? "").trim();
  const splitMode = String(formData.get("splitMode") ?? "equal");
  const selectedMembers = formData.getAll("members").map(String).filter(Boolean);

  if (!description) return { error: "Add a short description." };
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return { error: `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.` };
  if (notesRaw.length > MAX_NOTES_LENGTH)
    return { error: `Keep notes under ${MAX_NOTES_LENGTH} characters.` };

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

  return { description, notes: notesRaw || null, amount: roundedAmount, payerId, splits };
}

async function uploadReceipt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  expenseId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  if (file.size > MAX_RECEIPT_BYTES) return { error: "Receipt image must be under 5MB." };
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type))
    return { error: "Receipt must be a JPEG, PNG, WEBP, or HEIC image." };

  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const path = `${tripId}/${expenseId}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    contentType: file.type,
  });

  if (error) return { error: "Could not upload the receipt. Try again." };
  return { path };
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
  const expenseId = crypto.randomUUID();

  let receiptPath: string | null = null;
  const receiptFile = formData.get("receipt");
  if (receiptFile instanceof File && receiptFile.size > 0) {
    const result = await uploadReceipt(supabase, tripId, expenseId, receiptFile);
    if ("error" in result) return { error: result.error };
    receiptPath = result.path;
  }

  const { error } = await supabase.rpc("add_expense", {
    p_trip_id: tripId,
    p_payer_id: parsed.payerId,
    p_amount: parsed.amount,
    p_description: parsed.description,
    p_splits: parsed.splits,
    p_notes: parsed.notes,
    p_receipt_path: receiptPath,
    p_expense_id: expenseId,
  });

  if (error) {
    if (receiptPath) await supabase.storage.from("receipts").remove([receiptPath]);
    return { error: "Could not add the expense. Try again." };
  }

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

  const { data: existing } = await supabase
    .from("expenses")
    .select("trip_id, receipt_path")
    .eq("id", expenseId)
    .single();

  if (!existing) return { error: "Expense not found." };

  const tripId = existing.trip_id as string;
  const existingReceiptPath = existing.receipt_path as string | null;
  const removeReceipt = formData.get("removeReceipt") === "on";
  const receiptFile = formData.get("receipt");

  let receiptPath = existingReceiptPath;
  let uploadedNewPath: string | null = null;

  if (receiptFile instanceof File && receiptFile.size > 0) {
    const result = await uploadReceipt(supabase, tripId, expenseId, receiptFile);
    if ("error" in result) return { error: result.error };
    uploadedNewPath = result.path;
    receiptPath = result.path;
  } else if (removeReceipt) {
    receiptPath = null;
  }

  const { error } = await supabase.rpc("update_expense", {
    p_expense_id: expenseId,
    p_payer_id: parsed.payerId,
    p_amount: parsed.amount,
    p_description: parsed.description,
    p_splits: parsed.splits,
    p_notes: parsed.notes,
    p_receipt_path: receiptPath,
  });

  if (error) {
    if (uploadedNewPath) await supabase.storage.from("receipts").remove([uploadedNewPath]);
    return { error: "Could not save changes. Try again." };
  }

  // Only clean up the old file once the new state is safely persisted.
  if (existingReceiptPath && existingReceiptPath !== receiptPath) {
    await supabase.storage.from("receipts").remove([existingReceiptPath]);
  }

  revalidatePath(`/t/${tripSlug}`);
  return { success: true };
}

export async function deleteExpense(expenseId: string, tripSlug: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", expenseId)
    .single();

  const { error } = await supabase.rpc("delete_expense", { p_expense_id: expenseId });

  // Only clean up the receipt once the row is actually gone — e.g. a
  // non-creator's delete attempt is rejected by the RPC and must leave the
  // expense (and its receipt) untouched.
  if (!error && existing?.receipt_path) {
    await supabase.storage.from("receipts").remove([existing.receipt_path]);
  }

  revalidatePath(`/t/${tripSlug}`);
}

export async function toggleDispute(expenseId: string, tripSlug: string) {
  const supabase = await createClient();
  await supabase.rpc("toggle_dispute", { p_expense_id: expenseId });
  revalidatePath(`/t/${tripSlug}`);
}
