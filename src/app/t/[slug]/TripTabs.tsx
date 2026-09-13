"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExpensesView from "./ExpensesView";
import BalancesView from "./BalancesView";
import TripSettingsSheet from "./TripSettingsSheet";

type Member = { id: string; display_name: string };
type Expense = {
  id: string;
  payer_id: string;
  created_by: string;
  amount: number;
  description: string;
  notes: string | null;
  receiptUrl: string | null;
  disputed: boolean;
  created_at: string;
  splits: { member_id: string; share_amount: number }[];
};
type Settlement = {
  id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  marked_by: string;
  marked_settled_at: string;
};

export default function TripTabs({
  tripId,
  tripSlug,
  tripName,
  tripDestination,
  tripEndDate,
  currency,
  myMemberId,
  members,
  expenses,
  settlements,
}: {
  tripId: string;
  tripSlug: string;
  tripName: string;
  tripDestination: string | null;
  tripEndDate: string | null;
  currency: string;
  myMemberId: string;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
}) {
  const [tab, setTab] = useState<"expenses" | "balances">("expenses");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const membersRef = useRef(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const pushToast = (text: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  // Live updates: when anyone in the trip adds/edits/deletes an expense or a
  // new member joins, everyone else's view refreshes without a manual
  // reload. RLS still gates these events, so only actual trip members ever
  // receive them. INSERT events also surface a toast — skipped for your own
  // actions, since you already know what you just did.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { created_by: string; description: string };
            if (row.created_by !== myMemberId) {
              const name = membersRef.current.find((m) => m.id === row.created_by)?.display_name ?? "Someone";
              pushToast(`${name} added "${row.description}"`);
            }
          }
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_splits" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { id: string; display_name: string };
            if (row.id !== myMemberId) pushToast(`${row.display_name} joined the trip`);
          }
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settlements", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { marked_by: string; from_member_id: string; to_member_id: string };
            if (row.marked_by !== myMemberId) {
              const from = membersRef.current.find((m) => m.id === row.from_member_id)?.display_name ?? "Someone";
              const to = membersRef.current.find((m) => m.id === row.to_member_id)?.display_name ?? "someone";
              pushToast(`${from} paid ${to}`);
            }
          }
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router, myMemberId]);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="fixed top-3 inset-x-0 z-[60] flex flex-col items-center gap-2 px-6 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="max-w-sm w-full bg-[#14141A] text-white text-[13px] font-semibold rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)] text-center"
          >
            {t.text}
          </div>
        ))}
      </div>

      <div
        className="relative h-[220px] overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 96%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 96%)",
        }}
      >
        <Image
          src="/images/hero-trip.jpg"
          alt=""
          fill
          priority
          sizes="390px"
          className="ts-hero-photo object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/5" />

        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 pt-7">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l7-9 4 5 4-5 3 9" />
              <path d="M3 12l3 9h12l3-9" />
            </svg>
            <span className="font-bold text-[14px] text-white tracking-tight drop-shadow-sm">TripSplit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-white/25 backdrop-blur-md p-1">
              <button
                onClick={() => setTab("expenses")}
                className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
                  tab === "expenses" ? "bg-white text-[#0B0B0F]" : "text-white/85"
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setTab("balances")}
                className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
                  tab === "balances" ? "bg-white text-[#0B0B0F]" : "text-white/85"
                }`}
              >
                Balances
              </button>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Trip settings"
              className="w-9 h-9 shrink-0 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1">
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
            tripId={tripId}
            tripSlug={tripSlug}
            tripName={tripName}
            currency={currency}
            myMemberId={myMemberId}
            members={members}
            expenses={expenses}
            settlements={settlements}
          />
        )}
      </div>

      {settingsOpen && (
        <TripSettingsSheet
          tripId={tripId}
          tripSlug={tripSlug}
          currency={currency}
          name={tripName}
          destination={tripDestination}
          endDate={tripEndDate}
          members={members}
          myMemberId={myMemberId}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
