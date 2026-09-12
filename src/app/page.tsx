"use client";

import { useActionState } from "react";
import { createTrip, type CreateTripState } from "@/app/actions/trips";

const initialState: CreateTripState = {};

export default function Home() {
  const [state, formAction, isPending] = useActionState(createTrip, initialState);

  return (
    <div className="flex flex-1 justify-center bg-white">
      <div className="w-full max-w-sm flex flex-col">
        <div
          className="relative overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, #AFD8FF 0%, #C9E6FF 30%, #E3F1FF 68%, #FFFFFF 100%)",
          }}
        >
          <svg
            className="absolute opacity-35"
            style={{ top: 6, left: -40, width: 220, filter: "blur(1.5px)" }}
            viewBox="0 0 120 60"
            fill="#FFFFFF"
          >
            <ellipse cx="30" cy="38" rx="30" ry="20" />
            <ellipse cx="60" cy="28" rx="34" ry="24" />
            <ellipse cx="92" cy="40" rx="26" ry="18" />
          </svg>
          <svg
            className="ts-drift-a absolute opacity-90"
            style={{ top: 28, left: -14, width: 130 }}
            viewBox="0 0 120 60"
            fill="#FFFFFF"
          >
            <ellipse cx="30" cy="38" rx="26" ry="18" />
            <ellipse cx="58" cy="30" rx="30" ry="22" />
            <ellipse cx="88" cy="40" rx="22" ry="16" />
          </svg>
          <svg
            className="ts-drift-b absolute opacity-70"
            style={{ top: 92, right: -20, width: 104 }}
            viewBox="0 0 120 60"
            fill="#FFFFFF"
          >
            <ellipse cx="30" cy="38" rx="22" ry="16" />
            <ellipse cx="58" cy="30" rx="26" ry="19" />
            <ellipse cx="86" cy="40" rx="18" ry="14" />
          </svg>

          <div className="relative z-10 flex items-center gap-2 px-6 pt-7">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#14141A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12l7-9 4 5 4-5 3 9" />
              <path d="M3 12l3 9h12l3-9" />
            </svg>
            <span className="font-bold text-[15px] text-[#14141A] tracking-tight">TripSplit</span>
          </div>

          <div className="relative z-10 px-6 pt-8 pb-10">
            <h1 className="text-[32px] leading-[1.15] font-extrabold text-[#0B0B0F] tracking-tight">
              Start a trip.
              <br />
              Share one link.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
              No signup. Everyone joins with just their name.
            </p>
          </div>
        </div>

        <form action={formAction} className="px-6 pb-10 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#14141A] mb-2">
              Trip name
            </label>
            <input
              name="name"
              type="text"
              placeholder="e.g. Goa Squad"
              required
              maxLength={60}
              className="w-full h-14 rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[16px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#14141A] mb-2">
              Destination <span className="text-[#9AA1AC] font-normal">(optional)</span>
            </label>
            <input
              name="destination"
              type="text"
              placeholder="e.g. Goa, India"
              maxLength={100}
              className="w-full h-14 rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[16px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#14141A] mb-2">
              Currency
            </label>
            <select
              name="currency"
              defaultValue="INR"
              className="w-full h-14 rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[16px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB] bg-white"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#14141A] mb-2">
              Your name
            </label>
            <input
              name="creatorName"
              type="text"
              placeholder="e.g. Maya"
              required
              maxLength={40}
              className="w-full h-14 rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[16px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB]"
            />
          </div>

          {state.error && (
            <p className="text-[13.5px] font-medium text-[#D64C4C]">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 h-14 w-full rounded-full bg-[#0B0B0F] text-white text-[16px] font-bold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Creating…" : "Create trip"}
          </button>
        </form>
      </div>
    </div>
  );
}
