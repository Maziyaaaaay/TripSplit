"use client";

import { useMemo } from "react";
import { formatAmount } from "@/lib/money";

type Member = { id: string; display_name: string };
type Expense = { payer_id: string; amount: number };

// Validated categorical order (dataviz skill, references/palette.md) - fixed
// order, never cycled. Worst adjacent CVD Delta E 9.1 (light), clear of the
// >=8 target, so all 8 slots are safe on a ring where only neighbors touch.
const CATEGORICAL_LIGHT = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];
const OTHER_COLOR = "#C3C2B7"; // muted - aggregate bucket, not an identity slot
const MAX_SLICES = 8;
const GAP_DEG = 3;

type Slice = { id: string; name: string; amount: number; pct: number; color: string };

export default function SpendByPayerDonut({
  members,
  expenses,
  currency,
}: {
  members: Member[];
  expenses: Expense[];
  currency: string;
}) {
  const { slices, total } = useMemo(() => {
    const totalsByMember = new Map<string, number>();
    for (const exp of expenses) {
      totalsByMember.set(exp.payer_id, (totalsByMember.get(exp.payer_id) ?? 0) + exp.amount);
    }

    // Color is assigned by walking `members` in its given (stable) order, so
    // a payer keeps the same hue regardless of how totals rank - identity,
    // never rank.
    const colorById = new Map<string, string>();
    let slot = 0;
    for (const m of members) {
      if (totalsByMember.has(m.id) && slot < MAX_SLICES) {
        colorById.set(m.id, CATEGORICAL_LIGHT[slot]);
        slot += 1;
      }
    }

    const nameById = new Map(members.map((m) => [m.id, m.display_name] as const));
    const total = [...totalsByMember.values()].reduce((s, v) => s + v, 0);

    let payers = [...totalsByMember.entries()]
      .map(([id, amount]) => ({
        id,
        name: nameById.get(id) ?? "Someone",
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
        color: colorById.get(id) ?? OTHER_COLOR,
      }))
      .sort((a, b) => b.amount - a.amount);

    if (payers.length > MAX_SLICES) {
      const kept = payers.slice(0, MAX_SLICES - 1);
      const rest = payers.slice(MAX_SLICES - 1);
      const otherAmount = rest.reduce((s, p) => s + p.amount, 0);
      payers = [
        ...kept,
        {
          id: "__other__",
          name: `Other (${rest.length})`,
          amount: otherAmount,
          pct: total > 0 ? (otherAmount / total) * 100 : 0,
          color: OTHER_COLOR,
        },
      ];
    }

    return { slices: payers as Slice[], total };
  }, [members, expenses]);

  const gradient = useMemo(() => {
    if (slices.length === 0) return "conic-gradient(#EEF0F3 0deg 360deg)";
    if (slices.length === 1) return `conic-gradient(${slices[0].color} 0deg 360deg)`;

    const gap = GAP_DEG;
    let cursor = 0;
    const stops: string[] = [];
    slices.forEach((s) => {
      const sweep = Math.max((s.pct / 100) * 360 - gap, 0);
      stops.push(`${s.color} ${cursor}deg ${cursor + sweep}deg`);
      cursor += sweep;
      stops.push(`#fff ${cursor}deg ${cursor + gap}deg`);
      cursor += gap;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [slices]);

  if (slices.length === 0) {
    return (
      <div className="rounded-2xl bg-[#F7F8FA] border border-[#EEF0F3] p-6 text-center">
        <div className="text-[14px] font-semibold text-[#14141A]">No spend yet</div>
        <div className="mt-1 text-[13px] text-[#9AA1AC]">Add an expense to see the breakdown.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-[#EEF0F3] p-4">
      <div className="text-[13px] font-semibold text-[#6B7280] mb-4">Spend by payer</div>

      <div className="flex items-center justify-center mb-5">
        <div className="relative w-[168px] h-[168px]" style={{ background: gradient, borderRadius: "9999px" }}>
          <div className="absolute inset-[22px] rounded-full bg-white flex flex-col items-center justify-center">
            <div className="text-[11px] font-semibold text-[#9AA1AC] uppercase tracking-wide">Total</div>
            <div className="text-[17px] font-extrabold text-[#14141A] mt-0.5 text-center px-2">
              {formatAmount(total, currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {slices.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="text-[13px] font-medium text-[#14141A] truncate flex-1 min-w-0">{s.name}</span>
            <span className="text-[12px] text-[#9AA1AC] tabular-nums">{s.pct.toFixed(0)}%</span>
            <span className="text-[13px] font-bold text-[#14141A] tabular-nums">
              {formatAmount(s.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
