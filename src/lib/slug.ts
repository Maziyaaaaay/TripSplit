export function makeTripSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");

  // 12 hex chars (~48 bits) — this suffix is the actual access secret for the
  // trip (see the RLS migration notes), so it needs real entropy, not just
  // enough to avoid accidental collisions.
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  return base ? `${base}-${suffix}` : suffix;
}
