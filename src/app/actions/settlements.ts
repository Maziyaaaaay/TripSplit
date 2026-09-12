"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markSettled(
  tripId: string,
  tripSlug: string,
  fromMemberId: string,
  toMemberId: string,
  amount: number
) {
  const supabase = await createClient();
  await supabase.rpc("mark_settled", {
    p_trip_id: tripId,
    p_from_member_id: fromMemberId,
    p_to_member_id: toMemberId,
    p_amount: amount,
  });
  revalidatePath(`/t/${tripSlug}`);
}

export async function unmarkSettled(settlementId: string, tripSlug: string) {
  const supabase = await createClient();
  await supabase.rpc("unmark_settled", { p_settlement_id: settlementId });
  revalidatePath(`/t/${tripSlug}`);
}
