// lib/clock.ts — the single demo clock (bug #1 fix).
//
// The billing engine is a pure function of its inputs, but two of those inputs are
// timestamps the app stamps at runtime: a new Subscription.startedAt (drives
// proration + grandfathering) and a new PricingRule.createdAt (drives the
// most-recent-source-wins merge order). Previously these used the real wall clock
// (`new Date()` / `Date.now()`), so the same demo run produced different invoices
// on different days/machines and could even reorder rule precedence.
//
// This module pins a fixed demo "now" (matching the engine's BILLING_NOW) and hands
// out STRICTLY INCREASING ISO timestamps from it, so created-at ordering is
// deterministic across a session and identical between runs after resetToSeed().

/** The fixed demo "now". The engine re-exports this as BILLING_NOW. */
export const DEMO_NOW = new Date("2026-06-20T00:00:00Z");

let tick = 0;

/**
 * A strictly increasing ISO timestamp anchored at DEMO_NOW (each call is +1s).
 * Use ONLY for engine-input timestamps (Subscription.startedAt, PricingRule.createdAt)
 * so the math stays deterministic. Display-only timestamps may keep the real clock.
 */
export function demoNowISO(): string {
  tick += 1;
  return new Date(DEMO_NOW.getTime() + tick * 1000).toISOString();
}

/** Reset the monotonic counter so a re-seeded demo is byte-identical to the first. */
export function resetDemoClock(): void {
  tick = 0;
}
