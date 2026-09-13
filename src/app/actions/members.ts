"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type JoinState = { error?: string; joined?: boolean; name?: string };

const MAX_NAME_LENGTH = 40;

export async function joinTrip(
  tripId: string,
  tripSlug: string,
  _prevState: JoinState,
  formData: FormData
): Promise<JoinState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter your name to join." };
  if (name.length > MAX_NAME_LENGTH)
    return { error: `Name must be under ${MAX_NAME_LENGTH} characters.` };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let currentUser = user;

  if (!currentUser) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { error: "Could not start a session. Try again." };
    currentUser = data.user;
  }
  if (!currentUser) return { error: "Could not start a session. Try again." };

  const { error } = await supabase.from("members").insert({
    trip_id: tripId,
    display_name: name,
    auth_uid: currentUser.id,
  });

  if (error) {
    // Unique violation on (trip_id, auth_uid): this browser session already joined.
    if (error.code === "23505") {
      revalidatePath(`/t/${tripSlug}`);
      return { joined: true, name };
    }
    return { error: "Something went wrong. Try again." };
  }

  revalidatePath(`/t/${tripSlug}`);
  return { joined: true, name };
}

export type RemoveMemberState = { error?: string };

export async function removeMember(
  tripId: string,
  tripSlug: string,
  memberId: string,
  isSelf: boolean,
  _prevState: RemoveMemberState,
  _formData: FormData
): Promise<RemoveMemberState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    p_trip_id: tripId,
    p_member_id: memberId,
  });

  if (error) return { error: error.message };

  if (isSelf) redirect("/");

  revalidatePath(`/t/${tripSlug}`);
  return {};
}
