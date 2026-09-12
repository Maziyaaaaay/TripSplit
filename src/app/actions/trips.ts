"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { makeTripSlug } from "@/lib/slug";

export type CreateTripState = { error?: string };

const ALLOWED_CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const MAX_NAME_LENGTH = 60;
const MAX_DESTINATION_LENGTH = 100;
const MAX_CREATOR_NAME_LENGTH = 40;

export async function createTrip(
  _prevState: CreateTripState,
  formData: FormData
): Promise<CreateTripState> {
  const name = String(formData.get("name") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const creatorName = String(formData.get("creatorName") ?? "").trim();
  const currency =
    String(formData.get("currency") ?? "INR")
      .trim()
      .toUpperCase() || "INR";

  if (!name) return { error: "Give your trip a name." };
  if (name.length > MAX_NAME_LENGTH)
    return { error: `Trip name must be under ${MAX_NAME_LENGTH} characters.` };
  if (destination.length > MAX_DESTINATION_LENGTH)
    return { error: `Destination must be under ${MAX_DESTINATION_LENGTH} characters.` };
  if (!creatorName) return { error: "Enter your name too — you're the first member." };
  if (creatorName.length > MAX_CREATOR_NAME_LENGTH)
    return { error: `Your name must be under ${MAX_CREATOR_NAME_LENGTH} characters.` };
  if (!ALLOWED_CURRENCIES.includes(currency)) return { error: "Pick a supported currency." };

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

  const slug = makeTripSlug(name);

  // Trip + creator-membership insert happens atomically in one transaction
  // (create_trip_with_creator) so a mid-flight failure can never leave an
  // orphaned trip with zero members.
  const { data: trip, error: tripError } = await supabase.rpc("create_trip_with_creator", {
    p_name: name,
    p_destination: destination || null,
    p_currency: currency,
    p_slug: slug,
    p_creator_name: creatorName,
  });

  if (tripError || !trip) return { error: "Could not create the trip. Try again." };

  redirect(`/t/${trip.slug}`);
}
