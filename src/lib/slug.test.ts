import { describe, expect, it } from "vitest";
import { makeTripSlug } from "./slug";

describe("makeTripSlug", () => {
  it("lowercases, hyphenates, and appends a high-entropy suffix", () => {
    const slug = makeTripSlug("Goa Squad");
    expect(slug).toMatch(/^goa-squad-[0-9a-f]{12}$/);
  });

  it("strips characters outside [a-z0-9-] before hyphenating", () => {
    const slug = makeTripSlug("Trip to Goa!! (2026) 🏖️");
    expect(slug).toMatch(/^trip-to-goa-2026-[0-9a-f]{12}$/);
  });

  it("falls back to just the suffix when the name has no usable characters", () => {
    const slug = makeTripSlug("🏖️🏖️🏖️");
    expect(slug).toMatch(/^[0-9a-f]{12}$/);
  });

  it("truncates long names before the suffix", () => {
    const slug = makeTripSlug("a".repeat(100));
    const [base, suffix] = slug.split(/-(?=[0-9a-f]{12}$)/);
    expect(base.length).toBeLessThanOrEqual(40);
    expect(suffix).toMatch(/^[0-9a-f]{12}$/);
  });

  it("produces a different suffix on every call, even for the same name", () => {
    const a = makeTripSlug("Goa Squad");
    const b = makeTripSlug("Goa Squad");
    expect(a).not.toBe(b);
  });
});
