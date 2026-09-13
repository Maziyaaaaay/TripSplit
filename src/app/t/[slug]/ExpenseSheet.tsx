"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ExpenseState } from "@/app/actions/expenses";
import { currencySymbol, splitEqually, toCents } from "@/lib/money";

type Member = { id: string; display_name: string };

export type EditingExpense = {
  id: string;
  payer_id: string;
  amount: number;
  description: string;
  notes: string | null;
  receiptUrl: string | null;
  splits: { member_id: string; share_amount: number }[];
};

const initialState: ExpenseState = {};

export default function ExpenseSheet({
  action,
  members,
  currency,
  myMemberId,
  editing,
  onClose,
}: {
  action: (prevState: ExpenseState, formData: FormData) => Promise<ExpenseState>;
  members: Member[];
  currency: string;
  myMemberId: string;
  editing: EditingExpense | null;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [newReceiptName, setNewReceiptName] = useState<string | null>(null);
  const [payerId, setPayerId] = useState(editing?.payer_id ?? myMemberId);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(editing ? editing.splits.map((s) => s.member_id) : members.map((m) => m.id))
  );
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => {
    if (!editing) return {};
    const map: Record<string, string> = {};
    editing.splits.forEach((s) => (map[s.member_id] = String(s.share_amount)));
    return map;
  });

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const selectedIds = useMemo(() => members.filter((m) => selected.has(m.id)).map((m) => m.id), [members, selected]);
  const numericAmount = Number(amount) || 0;

  const equalPreview = useMemo(
    () => splitEqually(numericAmount, selectedIds),
    [numericAmount, selectedIds]
  );

  const customTotalCents = selectedIds.reduce(
    (sum, id) => sum + toCents(Number(customAmounts[id]) || 0),
    0
  );
  const customMatches = customTotalCents === toCents(numericAmount);

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit =
    description.trim().length > 0 &&
    numericAmount > 0 &&
    payerId &&
    selectedIds.length > 0 &&
    (splitMode === "equal" || customMatches);

  const sym = currencySymbol(currency);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/45 z-50 flex items-end justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-t-[28px] px-6 pt-3 pb-8 max-h-[88vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-[#E4E6EA] rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="text-[17px] font-extrabold text-[#14141A]">
            {editing ? "Edit expense" : "Add expense"}
          </div>
          <button onClick={onClose} className="text-[13px] font-semibold text-[#9AA1AC] cursor-pointer">
            Cancel
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">Amount</label>
            <div className="flex items-center h-[52px] rounded-2xl border-[1.5px] border-[#E4E6EA] px-4">
              <span className="text-[15px] font-bold text-[#14141A] mr-1.5">{sym}</span>
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 outline-none text-[15px] font-semibold text-[#14141A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">What was it for?</label>
            <input
              name="description"
              type="text"
              maxLength={80}
              placeholder="e.g. Boat trip"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-[52px] rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[15px] font-medium text-[#14141A] outline-none"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">
              Notes <span className="text-[#9AA1AC] font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              maxLength={500}
              rows={2}
              placeholder="Any extra detail worth remembering"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 py-3 text-[14px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB] resize-none"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">
              Receipt <span className="text-[#9AA1AC] font-normal">(optional)</span>
            </label>

            {editing?.receiptUrl && !removeReceipt && !newReceiptName && (
              <div className="flex items-center justify-between rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 py-2.5 mb-2">
                <a
                  href={editing.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-[#4F8EDB] underline"
                >
                  View current receipt
                </a>
                <button
                  type="button"
                  onClick={() => setRemoveReceipt(true)}
                  className="text-[12.5px] font-semibold text-[#D64C4C] cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            {removeReceipt && (
              <div className="flex items-center justify-between rounded-2xl border-[1.5px] border-[#F6D9D6] bg-[#FFF4F3] px-4 py-2.5 mb-2">
                <span className="text-[12.5px] font-medium text-[#B5384A]">Receipt will be removed</span>
                <button
                  type="button"
                  onClick={() => setRemoveReceipt(false)}
                  className="text-[12.5px] font-semibold text-[#6B7280] cursor-pointer"
                >
                  Undo
                </button>
              </div>
            )}

            <input type="hidden" name="removeReceipt" value={removeReceipt ? "on" : ""} />
            <label className="flex items-center justify-center h-[52px] rounded-2xl border-[1.5px] border-dashed border-[#D8DBE0] text-[13px] font-semibold text-[#6B7280] cursor-pointer">
              {newReceiptName ?? "Choose an image"}
              <input
                type="file"
                name="receipt"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(e) => setNewReceiptName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">Paid by</label>
            <select
              name="payerId"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full h-[52px] rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[15px] font-medium text-[#14141A] outline-none bg-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === myMemberId ? `${m.display_name} (you)` : m.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-semibold text-[#6B7280]">Split with</label>
              <div className="flex rounded-full bg-[#F1F3F6] p-1">
                <button
                  type="button"
                  onClick={() => setSplitMode("equal")}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer ${
                    splitMode === "equal" ? "bg-[#0B0B0F] text-white" : "text-[#6B7280]"
                  }`}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("custom")}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer ${
                    splitMode === "custom" ? "bg-[#0B0B0F] text-white" : "text-[#6B7280]"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>
            <input type="hidden" name="splitMode" value={splitMode} />

            <div className="flex flex-col gap-2">
              {members.map((m) => {
                const isSelected = selected.has(m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 py-2.5"
                  >
                    <input
                      type="checkbox"
                      name={isSelected ? "members" : undefined}
                      value={m.id}
                      checked={isSelected}
                      onChange={() => toggleMember(m.id)}
                      className="w-4 h-4 accent-[#0B0B0F] cursor-pointer"
                    />
                    <div className="flex-1 text-[14px] font-medium text-[#14141A]">
                      {m.id === myMemberId ? `${m.display_name} (you)` : m.display_name}
                    </div>
                    {isSelected && splitMode === "equal" && (
                      <div className="text-[13px] font-semibold text-[#9AA1AC]">
                        {sym}
                        {(equalPreview[m.id] ?? 0).toFixed(2)}
                      </div>
                    )}
                    {isSelected && splitMode === "custom" && (
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-semibold text-[#9AA1AC]">{sym}</span>
                        <input
                          type="number"
                          name={`share_${m.id}`}
                          step="0.01"
                          min="0"
                          value={customAmounts[m.id] ?? ""}
                          onChange={(e) =>
                            setCustomAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          className="w-16 text-right text-[13px] font-semibold text-[#14141A] outline-none border-b border-[#E4E6EA]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {splitMode === "custom" && (
              <div
                className={`mt-2 text-[12.5px] font-semibold ${
                  customMatches ? "text-[#2E9D5A]" : "text-[#D64C4C]"
                }`}
              >
                {sym}
                {(customTotalCents / 100).toFixed(2)} of {sym}
                {numericAmount.toFixed(2)} assigned
              </div>
            )}
          </div>

          {state.error && <p className="text-[13.5px] font-medium text-[#D64C4C]">{state.error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className="mt-1 h-[54px] w-full rounded-full bg-[#0B0B0F] text-white text-[15px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
