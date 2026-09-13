"use client";

import { useActionState, useEffect } from "react";
import { updateTrip, type UpdateTripState } from "@/app/actions/trips";

const initialState: UpdateTripState = {};

export default function TripSettingsSheet({
  tripId,
  tripSlug,
  currency,
  name,
  destination,
  endDate,
  onClose,
}: {
  tripId: string;
  tripSlug: string;
  currency: string;
  name: string;
  destination: string | null;
  endDate: string | null;
  onClose: () => void;
}) {
  const boundUpdate = updateTrip.bind(null, tripId, tripSlug);
  const [state, formAction, isPending] = useActionState(boundUpdate, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/45 z-50 flex items-end justify-center">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-t-[28px] px-6 pt-3 pb-8 max-h-[88vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-[#E4E6EA] rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="text-[17px] font-extrabold text-[#14141A]">Trip settings</div>
          <button onClick={onClose} className="text-[13px] font-semibold text-[#9AA1AC] cursor-pointer">
            Cancel
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">Trip name</label>
            <input
              name="name"
              type="text"
              maxLength={60}
              required
              defaultValue={name}
              className="w-full h-[52px] rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[15px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB]"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">
              Destination <span className="text-[#9AA1AC] font-normal">(optional)</span>
            </label>
            <input
              name="destination"
              type="text"
              maxLength={100}
              defaultValue={destination ?? ""}
              className="w-full h-[52px] rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[15px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB]"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">
              End date <span className="text-[#9AA1AC] font-normal">(optional)</span>
            </label>
            <input
              name="endDate"
              type="date"
              defaultValue={endDate ?? ""}
              className="w-full h-[52px] rounded-2xl border-[1.5px] border-[#E4E6EA] px-4 text-[15px] font-medium text-[#14141A] outline-none focus:border-[#4F8EDB]"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-[#6B7280] mb-1.5">Currency</label>
            <div className="w-full h-[52px] rounded-2xl border-[1.5px] border-[#EEF0F3] bg-[#F7F8FA] px-4 flex items-center text-[15px] font-medium text-[#9AA1AC]">
              {currency} — locked after creation
            </div>
          </div>

          {state.error && <p className="text-[13.5px] font-medium text-[#D64C4C]">{state.error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 h-[54px] w-full rounded-full bg-[#0B0B0F] text-white text-[15px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
