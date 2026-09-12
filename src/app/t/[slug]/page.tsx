import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import JoinForm from "./JoinForm";
import TripTabs from "./TripTabs";

type TripPreview = {
  id: string;
  slug: string;
  name: string;
  destination: string | null;
  end_date: string | null;
  member_count: number;
};

type JoinPreviewRow = { display_name: string };

type Member = { id: string; display_name: string };

type ExpenseRow = {
  id: string;
  payer_id: string;
  created_by: string;
  amount: number;
  description: string;
  disputed: boolean;
  created_at: string;
  expense_splits: { member_id: string; share_amount: number }[];
};

const AVATAR_COLORS = [
  { bg: "#FDE8CF", fg: "#B5651D" },
  { bg: "#DCEBFC", fg: "#2B6CB0" },
  { bg: "#FBDCE0", fg: "#B5384A" },
  { bg: "#E3E8FD", fg: "#4A56C7" },
];

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // These run as security-definer functions scoped to an exact slug match —
  // they show the join-screen preview to someone who isn't a member yet
  // without exposing the trips/members tables to a broad scan (see the
  // 20260912090000 migration for why that distinction matters).
  const { data: previewRows } = await supabase.rpc("get_trip_preview", { p_slug: slug });
  const trip = (previewRows as TripPreview[] | null)?.[0];

  if (!trip) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white px-6 text-center">
        <div>
          <div className="text-[20px] font-extrabold text-[#0B0B0F]">Trip not found</div>
          <p className="mt-2 text-[14px] text-[#6B7280]">
            This link doesn&rsquo;t match a trip. Double-check it with whoever shared it.
          </p>
        </div>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myMembership } = user
    ? await supabase
        .from("members")
        .select("id, display_name")
        .eq("trip_id", trip.id)
        .eq("auth_uid", user.id)
        .maybeSingle()
    : { data: null };

  // Once you're a member, RLS opens up the real roster + expense tables —
  // no need for the slug-scoped preview RPCs any more.
  if (myMembership) {
    const [{ data: members }, { data: expenseRows }, { data: fullTrip }] = await Promise.all([
      supabase
        .from("members")
        .select("id, display_name")
        .eq("trip_id", trip.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("expenses")
        .select("id, payer_id, created_by, amount, description, disputed, created_at, expense_splits(member_id, share_amount)")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: false }),
      supabase.from("trips").select("currency").eq("id", trip.id).single(),
    ]);

    const expenses = ((expenseRows as ExpenseRow[] | null) ?? []).map((e) => ({
      id: e.id,
      payer_id: e.payer_id,
      created_by: e.created_by,
      amount: Number(e.amount),
      description: e.description,
      disputed: e.disputed,
      created_at: e.created_at,
      splits: e.expense_splits.map((s) => ({ member_id: s.member_id, share_amount: Number(s.share_amount) })),
    }));

    return (
      <div className="flex flex-1 justify-center bg-white">
        <div className="w-full max-w-sm flex flex-col">
          <TripTabs
            tripId={trip.id}
            tripSlug={trip.slug}
            tripName={trip.name}
            currency={fullTrip?.currency ?? "INR"}
            myMemberId={myMembership.id}
            members={(members as Member[] | null) ?? []}
            expenses={expenses}
          />
        </div>
      </div>
    );
  }

  const { data: previewNames } = await supabase.rpc("get_trip_join_preview", { p_slug: slug });
  const visibleAvatars = (previewNames as JoinPreviewRow[] | null) ?? [];
  const overflowCount = trip.member_count - visibleAvatars.length;

  const daysLeft = trip.end_date
    ? Math.ceil(
        (new Date(trip.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="flex flex-1 justify-center bg-white">
      <div className="w-full max-w-sm flex flex-col">
        <div className="relative h-[280px] overflow-hidden">
          <Image
            src="/images/hero-join.jpg"
            alt=""
            fill
            priority
            sizes="390px"
            className="ts-hero-photo object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/0 to-black/0" />
          <div className="relative z-10 flex items-center gap-2 px-6 pt-7">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l7-9 4 5 4-5 3 9" />
              <path d="M3 12l3 9h12l3-9" />
            </svg>
            <span className="font-bold text-[15px] text-white tracking-tight drop-shadow-sm">TripSplit</span>
          </div>
        </div>

        <div className="relative z-10 -mt-8 bg-white rounded-t-[28px] px-6 pt-7 pb-3">
          <h1 className="text-[28px] leading-[1.15] font-extrabold text-[#0B0B0F] tracking-tight">
            Split the bill.
            <br />
            Not the friendship.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
            No signup. Just your name — the rest is already set up.
          </p>
        </div>

        <div className="mx-6 mt-2 rounded-2xl bg-[#F7F8FA] border border-[#EEF0F3] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[16px] font-bold text-[#14141A]">{trip.name}</div>
              <div className="mt-0.5 text-[13px] text-[#8A8F98]">
                {[
                  trip.destination,
                  trip.member_count > 0
                    ? `${trip.member_count} member${trip.member_count === 1 ? "" : "s"} already in`
                    : "Be the first to join",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            {visibleAvatars.length > 0 && (
              <div className="flex ml-2">
                {visibleAvatars.map((m, i) => {
                  const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  return (
                    <div
                      key={`${m.display_name}-${i}`}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[13px] font-bold -ml-2 first:ml-0"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {m.display_name.charAt(0).toUpperCase()}
                    </div>
                  );
                })}
                {overflowCount > 0 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[#14141A] text-white flex items-center justify-center text-[12px] font-bold -ml-2">
                    +{overflowCount}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {daysLeft !== null && (
          <div className="flex gap-2 px-6 pt-4 flex-wrap">
            <div className="px-3.5 py-1.5 rounded-full border border-dashed border-[#D8DBE0] text-[12.5px] font-medium text-[#6B7280]">
              {daysLeft > 0 ? `Ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` : "Trip has ended"}
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="pt-8">
          <JoinForm tripId={trip.id} tripSlug={trip.slug} tripName={trip.name} />
        </div>
      </div>
    </div>
  );
}
