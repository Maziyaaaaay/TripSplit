"use client";

import { useMemo, useState } from "react";
import { addExpense, deleteExpense, toggleDispute, updateExpense } from "@/app/actions/expenses";
import { formatAmount } from "@/lib/money";
import ExpenseSheet, { type EditingExpense } from "./ExpenseSheet";

type Member = { id: string; display_name: string };
type Expense = {
  id: string;
  payer_id: string;
  created_by: string;
  amount: number;
  description: string;
  disputed: boolean;
  created_at: string;
  splits: { member_id: string; share_amount: number }[];
};

export default function ExpensesView({
  tripId,
  tripSlug,
  tripName,
  currency,
  myMemberId,
  members,
  expenses,
}: {
  tripId: string;
  tripSlug: string;
  tripName: string;
  currency: string;
  myMemberId: string;
  members: Member[];
  expenses: Expense[];
}) {
  const [sheet, setSheet] = useState<"add" | EditingExpense | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.display_name));
    return map;
  }, [members]);

  return (
    <div className="pb-28">
      <div className="relative z-10 -mt-[90px] mx-6 mb-4 flex items-center justify-between rounded-3xl bg-white/65 backdrop-blur-xl border border-white/60 shadow-[0_12px_30px_rgba(20,40,80,0.18)] px-5 py-4">
        <div>
          <div className="text-[13px] font-semibold text-[#5B6472]">{tripName}</div>
          <div className="text-[20px] font-extrabold text-[#0B0B0F]">Expenses</div>
        </div>
        <button
          onClick={() => setSheet("add")}
          aria-label="Add expense"
          className="w-11 h-11 rounded-full bg-[#0B0B0F] text-white flex items-center justify-center cursor-pointer shadow-[0_6px_16px_rgba(11,11,15,0.25)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="px-6">
      {expenses.length === 0 ? (
        <div className="rounded-2xl bg-[#F7F8FA] border border-[#EEF0F3] p-6 text-center">
          <div className="text-[14px] font-semibold text-[#14141A]">No expenses yet</div>
          <div className="mt-1 text-[13px] text-[#9AA1AC]">Add the first one for the trip.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {expenses.map((exp) => {
            const isMine = exp.created_by === myMemberId;
            return (
              <div
                key={exp.id}
                className={`relative rounded-2xl border shadow-sm px-4 py-3.5 ${
                  exp.disputed
                    ? "bg-[#FFF4F3] border-[#F6D9D6]"
                    : "bg-white border-[#EEF0F3]"
                }`}
              >
                {exp.disputed && (
                  <div className="absolute -top-2 right-3 bg-[#D64C4C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Disputed
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-bold text-[#14141A] truncate">
                      {exp.description}
                    </div>
                    <div className="text-[12.5px] text-[#9AA1AC] mt-0.5">
                      Paid by {nameById.get(exp.payer_id) ?? "someone"} · split{" "}
                      {exp.splits.length} way{exp.splits.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-[15px] font-extrabold text-[#14141A]">
                    {formatAmount(exp.amount, currency)}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-[#F1F3F6]">
                  {isMine && (
                    <>
                      <button
                        onClick={() =>
                          setSheet({
                            id: exp.id,
                            payer_id: exp.payer_id,
                            amount: exp.amount,
                            description: exp.description,
                            splits: exp.splits,
                          })
                        }
                        className="text-[12.5px] font-semibold text-[#4F8EDB] cursor-pointer"
                      >
                        Edit
                      </button>
                      <form action={deleteExpense.bind(null, exp.id, tripSlug)}>
                        <button type="submit" className="text-[12.5px] font-semibold text-[#D64C4C] cursor-pointer">
                          Delete
                        </button>
                      </form>
                    </>
                  )}
                  <form action={toggleDispute.bind(null, exp.id, tripSlug)} className="ml-auto">
                    <button
                      type="submit"
                      className={`text-[12.5px] font-semibold cursor-pointer ${
                        exp.disputed ? "text-[#9AA1AC]" : "text-[#B5651D]"
                      }`}
                    >
                      {exp.disputed ? "Unflag" : "Flag as disputed"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {sheet && (
        <ExpenseSheet
          action={
            sheet === "add"
              ? addExpense.bind(null, tripId, tripSlug)
              : updateExpense.bind(null, sheet.id, tripSlug)
          }
          members={members}
          currency={currency}
          myMemberId={myMemberId}
          editing={sheet === "add" ? null : sheet}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
