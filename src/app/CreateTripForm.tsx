"use client";

import { useActionState } from "react";
import { createTrip, type CreateTripState } from "@/app/actions/trips";

const initialState: CreateTripState = {};

export default function CreateTripForm() {
  const [state, formAction, isPending] = useActionState(createTrip, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
  );
}
