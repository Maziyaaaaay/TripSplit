"use client";

import { useMemo } from "react";
import { computeNetCents, simplifyDebts } from "@/lib/balances";
import { formatAmount, fromCents } from "@/lib/money";

type Member = { id: string; display_name: string };
type Expense = {
  payer_id: string;
  amount: number;
  splits: { member_id: string; share_amount: number }[];
};

export default function BalancesView({
  tripName,
  currency,
  myMemberId,
  members,
  expenses,
}: {
  tripName: string;
  currency: string;
  myMemberId: string;
  members: Member[];
  expenses: Expense[];
}) {
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.display_name));
    return map;
  }, [members]);

  const netCents = useMemo(
    () => computeNetCents(members.map((m) => m.id), expenses),
    [members, expenses]
  );
  const suggestions = useMemo(() => simplifyDebts(netCents), [netCents]);

  const myNet = netCents[myMemberId] ?? 0;
  const sortedMembers = [...members].sort((a, b) => (netCents[b.id] ?? 0) - (netCents[a.id] ?? 0));

  const label = (name: string) => (name === nameById.get(myMemberId) ? `${name} (you)` : name);

  return (
    <div className="pb-28">
      <div className="relative z-10 -mt-[90px] mx-6 mb-4 rounded-3xl bg-white/65 backdrop-blur-xl border border-white/60 shadow-[0_12px_30px_rgba(20,40,80,0.18)] px-5 py-4">
        <div className="text-[13px] font-semibold text-[#5B6472]">{tripName}</div>
        <div className="text-[20px] font-extrabold text-[#0B0B0F]">Balances</div>
      </div>

      <div className="px-6">
      <div className="rounded-2xl bg-[#F7F8FA] border border-[#EEF0F3] p-4 mb-5 text-center">
        <div className="text-[12px] font-semibold text-[#9AA1AC] uppercase tracking-wide">
          Your balance
        </div>
        <div
          className={`text-[26px] font-extrabold mt-1 ${
            myNet > 0 ? "text-[#B5651D]" : myNet < 0 ? "text-[#D64C4C]" : "text-[#14141A]"
          }`}
        >
          {myNet === 0
            ? "Settled up"
            : `${myNet > 0 ? "+" : "-"}${formatAmount(Math.abs(fromCents(myNet)), currency)}`}
        </div>
        {myNet !== 0 && (
          <div className="text-[12.5px] text-[#9AA1AC] mt-0.5">
            {myNet > 0 ? "you're owed overall" : "you owe overall"}
          </div>
        )}
      </div>

      <div className="text-[13px] font-semibold text-[#6B7280] mb-2">Everyone&rsquo;s balance</div>
      <div className="flex flex-col gap-2 mb-6">
        {sortedMembers.map((m) => {
          const net = netCents[m.id] ?? 0;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl bg-white border border-[#EEF0F3] px-4 py-3"
            >
              <div className="text-[14px] font-medium text-[#14141A]">{label(m.display_name)}</div>
              <div
                className={`text-[14px] font-bold ${
                  net > 0 ? "text-[#B5651D]" : net < 0 ? "text-[#D64C4C]" : "text-[#9AA1AC]"
                }`}
              >
                {net === 0 ? "settled" : `${net > 0 ? "+" : "-"}${formatAmount(Math.abs(fromCents(net)), currency)}`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[13px] font-semibold text-[#6B7280] mb-2">Suggested settlements</div>
      {suggestions.length === 0 ? (
        <div className="rounded-2xl bg-[#F7F8FA] border border-[#EEF0F3] p-6 text-center">
          <div className="text-[14px] font-semibold text-[#14141A]">Nothing to settle</div>
          <div className="mt-1 text-[13px] text-[#9AA1AC]">Everyone&rsquo;s even right now.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl bg-white border border-[#EEF0F3] px-4 py-3"
            >
              <div className="text-[13.5px] text-[#14141A]">
                <span className="font-bold">{label(nameById.get(s.fromMemberId) ?? "")}</span>
                <span className="text-[#9AA1AC]"> owes </span>
                <span className="font-bold">{label(nameById.get(s.toMemberId) ?? "")}</span>
              </div>
              <div className="text-[14px] font-bold text-[#14141A]">
                {formatAmount(fromCents(s.amountCents), currency)}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
