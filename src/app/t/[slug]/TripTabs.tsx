"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExpensesView from "./ExpensesView";
import BalancesView from "./BalancesView";

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

export default function TripTabs({
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
  const [tab, setTab] = useState<"expenses" | "balances">("expenses");
  const router = useRouter();

  // Live updates: when anyone in the trip adds/edits/deletes an expense or a
  // new member joins, everyone else's view refreshes without a manual
  // reload. RLS still gates these events, so only actual trip members ever
  // receive them.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${tripId}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_splits" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${tripId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  return (
    <>
      <div className="px-6 pt-2 pb-2 flex justify-center">
        <div className="flex rounded-full bg-[#F1F3F6] p-1">
          <button
            onClick={() => setTab("expenses")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer ${
              tab === "expenses" ? "bg-[#0B0B0F] text-white" : "text-[#6B7280]"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setTab("balances")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer ${
              tab === "balances" ? "bg-[#0B0B0F] text-white" : "text-[#6B7280]"
            }`}
          >
            Balances
          </button>
        </div>
      </div>

      {tab === "expenses" ? (
        <ExpensesView
          tripId={tripId}
          tripSlug={tripSlug}
          tripName={tripName}
          currency={currency}
          myMemberId={myMemberId}
          members={members}
          expenses={expenses}
        />
      ) : (
        <BalancesView
          tripName={tripName}
          currency={currency}
          myMemberId={myMemberId}
          members={members}
          expenses={expenses}
        />
      )}
    </>
  );
}
