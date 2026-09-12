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
    <div
      className="relative flex-1 overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #5B96DE 0%, #6FA8E8 55%, #7BB4EE 100%)",
      }}
    >
      <svg
        className="absolute opacity-25"
        style={{ top: 0, left: -40, width: 220, filter: "blur(1.5px)" }}
        viewBox="0 0 120 60"
        fill="#FFFFFF"
      >
        <ellipse cx="30" cy="38" rx="30" ry="20" />
        <ellipse cx="60" cy="28" rx="34" ry="24" />
        <ellipse cx="92" cy="40" rx="26" ry="18" />
      </svg>
      <svg
        className="ts-drift-a absolute opacity-60"
        style={{ top: 18, left: -14, width: 120 }}
        viewBox="0 0 120 60"
        fill="#FFFFFF"
      >
        <ellipse cx="30" cy="38" rx="26" ry="18" />
        <ellipse cx="58" cy="30" rx="30" ry="22" />
        <ellipse cx="88" cy="40" rx="22" ry="16" />
      </svg>
      <svg
        className="ts-drift-b absolute opacity-45"
        style={{ top: 60, right: -20, width: 96 }}
        viewBox="0 0 120 60"
        fill="#FFFFFF"
      >
        <ellipse cx="30" cy="38" rx="22" ry="16" />
        <ellipse cx="58" cy="30" rx="26" ry="19" />
        <ellipse cx="86" cy="40" rx="18" ry="14" />
      </svg>

      <div className="relative z-10 flex items-center justify-between px-6 pt-7 pb-1">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l7-9 4 5 4-5 3 9" />
            <path d="M3 12l3 9h12l3-9" />
          </svg>
          <span className="font-bold text-[14px] text-white tracking-tight">TripSplit</span>
        </div>
        <div className="flex rounded-full bg-white/20 p-1">
          <button
            onClick={() => setTab("expenses")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
              tab === "expenses" ? "bg-white text-[#0B0B0F]" : "text-white/80"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setTab("balances")}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
              tab === "balances" ? "bg-white text-[#0B0B0F]" : "text-white/80"
            }`}
          >
            Balances
          </button>
        </div>
      </div>

      <div className="relative z-10 pt-4">
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
      </div>
    </div>
  );
}
