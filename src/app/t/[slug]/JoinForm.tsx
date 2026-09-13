"use client";

import { useActionState } from "react";
import { joinTrip, type JoinState } from "@/app/actions/members";

const initialState: JoinState = {};

export default function JoinForm({
  tripId,
  tripSlug,
  tripName,
}: {
  tripId: string;
  tripSlug: string;
  tripName: string;
}) {
  const boundJoin = joinTrip.bind(null, tripId, tripSlug);
  const [state, formAction, isPending] = useActionState(boundJoin, initialState);

  if (state.joined) {
    return (
      <div className="text-center px-6 pb-12">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#E9F7EE] flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2E9D5A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="mt-4 text-[19px] font-extrabold text-[#0B0B0F]">
          You&rsquo;re in, {state.name}!
        </div>
        <div className="mt-1.5 text-[14px] text-[#6B7280] leading-relaxed">
          Loading the trip…
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-10">
      <label className="block text-[13px] font-semibold text-[#14141A] mb-2">Your name</label>
      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="name"
          type="text"
          placeholder="e.g. Maya"
          required
          maxLength={40}
          disabled={isPending}
          className="w-full h-14 rounded-2xl border-[1.5px] border-[#E4E6EA] px-[18px] text-[16px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB]"
        />

        {state.error && (
          <p className="text-[13.5px] font-medium text-[#D64C4C]">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="h-14 w-full rounded-full bg-[#0B0B0F] text-white text-[16px] font-bold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? "Joining…" : `Join ${tripName}`}
        </button>
      </form>
    </div>
  );
}
