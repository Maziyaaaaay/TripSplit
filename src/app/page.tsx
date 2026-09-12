"use client";

import Image from "next/image";
import { useActionState } from "react";
import { createTrip, type CreateTripState } from "@/app/actions/trips";

const initialState: CreateTripState = {};

export default function Home() {
  const [state, formAction, isPending] = useActionState(createTrip, initialState);

  return (
    <div className="flex flex-1 justify-center bg-white">
      <div className="w-full max-w-sm flex flex-col">
        <div className="relative h-[300px] overflow-hidden">
          <Image
            src="/images/hero-plan.jpg"
            alt=""
            fill
            priority
            sizes="390px"
            className="ts-hero-photo object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/0 to-black/0" />
          <div className="relative z-10 flex items-center gap-2 px-6 pt-7">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12l7-9 4 5 4-5 3 9" />
              <path d="M3 12l3 9h12l3-9" />
            </svg>
            <span className="font-bold text-[15px] text-white tracking-tight drop-shadow-sm">
              TripSplit
            </span>
          </div>
        </div>

        <div className="relative z-10 -mt-8 bg-white rounded-t-[28px] px-6 pt-7 pb-2">
          <h1 className="text-[30px] leading-[1.15] font-extrabold text-[#0B0B0F] tracking-tight">
            Start a trip.
            <br />
            Share one link.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
            No signup. Everyone joins with just their name.
          </p>
        </div>

        <form action={formAction} className="px-6 pt-6 pb-10 flex flex-col gap-4">
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
