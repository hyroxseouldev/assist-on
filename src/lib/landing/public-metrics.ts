// Public aggregate snapshot, verified with read-only SQL on 2026-09-09.
// Scope: xon-training + amor. See docs/landing-metrics.md for definitions/query.
// Deliberately not a live browser-accessible database query.
export const LANDING_METRICS = {
  asOf: "2026.09.09",
  memberAccounts: 108,
  programs: 19,
  reviews: 739,
  coachFeedback: 662,
} as const;
