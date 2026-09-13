import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateTripForm from "./CreateTripForm";

type MyTrip = {
  id: string;
  slug: string;
  name: string;
  destination: string | null;
  currency: string;
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myTrips: MyTrip[] = [];
  if (user) {
    // RLS on trips (`members can read their own trip`) already scopes this to
    // exactly the trips this anonymous session has joined — no separate
    // membership join needed.
    const { data } = await supabase
      .from("trips")
      .select("id, slug, name, destination, currency")
      .order("created_at", { ascending: false });
    myTrips = (data as MyTrip[] | null) ?? [];
  }

  const hasTrips = myTrips.length > 0;

  return (
    <div className="flex flex-1 justify-center bg-white">
      <div className="w-full max-w-sm flex flex-col">
        <div
          className="relative h-[300px] overflow-hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 48%, transparent 96%)",
            maskImage: "linear-gradient(to bottom, black 0%, black 48%, transparent 96%)",
          }}
        >
          <Image
            src="/images/hero-plan.jpg"
            alt=""
            fill
            priority
            sizes="390px"
            className="ts-hero-photo object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/0 to-black/0" />
          <div className="absolute top-0 inset-x-0 flex items-center gap-2 px-6 pt-7">
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

        <div className="relative z-10 -mt-[130px] mx-6 rounded-3xl bg-white/65 backdrop-blur-xl border border-white/60 shadow-[0_12px_30px_rgba(20,40,80,0.18)] px-6 pt-6 pb-5">
          {hasTrips ? (
            <>
              <h1 className="text-[28px] leading-[1.15] font-extrabold text-[#0B0B0F] tracking-tight">
                Welcome back.
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#3A4150]">
                Jump back into a trip, or start a new one below.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[28px] leading-[1.15] font-extrabold text-[#0B0B0F] tracking-tight">
                Start a trip.
                <br />
                Share one link.
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#3A4150]">
                No signup. Everyone joins with just their name.
              </p>
            </>
          )}
        </div>

        {hasTrips && (
          <div className="relative z-10 px-6 pt-5 flex flex-col gap-2.5">
            {myTrips.map((trip) => (
              <Link
                key={trip.id}
                href={`/t/${trip.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7F8FA] border border-[#EEF0F3] px-4 py-3.5 active:bg-[#F1F3F6]"
              >
                <div className="min-w-0">
                  <div className="text-[14.5px] font-bold text-[#14141A] truncate">{trip.name}</div>
                  <div className="text-[12.5px] text-[#9AA1AC] mt-0.5 truncate">
                    {[trip.destination, trip.currency].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA1AC" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        <div className="relative z-10 px-6 pt-6 pb-10 flex flex-col gap-4">
          {hasTrips && (
            <div className="text-[13px] font-semibold text-[#6B7280]">Start another trip</div>
          )}
          <CreateTripForm />
        </div>
      </div>
    </div>
  );
}
