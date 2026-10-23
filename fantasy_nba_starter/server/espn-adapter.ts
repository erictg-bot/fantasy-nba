/**
 * Server-only ESPN adapter skeleton.
 * IMPORTANT: This deliberately does not assume undocumented ESPN endpoints are stable
 * or that reuse is authorized. Confirm endpoint, terms, attribution and rate limits first.
 *
 * Suggested contract:
 *   fetchScoreboard(date) -> normalized games[]
 *   fetchBoxScore(gameId) -> normalized players + stats[]
 *   upsert games/players/player_game_stats by provider IDs
 *   recalculate fantasy totals from stored stats and league scoring rules
 *
 * Keep provider-specific parsing isolated here. Never expose service-role secrets to browser.
 */
export type NormalizedPlayerStats = {
  providerPlayerId: string;
  fullName: string;
  nbaTeam: string | null;
  minutes: number | null;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  threesMade: number;
};

export function fantasyPoints(
  s: NormalizedPlayerStats,
  rules: Record<string, number>
): number {
  return (
    s.points * (rules.points ?? 1) +
    s.rebounds * (rules.rebounds ?? 1) +
    s.assists * (rules.assists ?? 1) +
    s.steals * (rules.steals ?? 1) +
    s.blocks * (rules.blocks ?? 1) +
    s.turnovers * (rules.turnovers ?? -1) +
    s.threesMade * (rules.threesMade ?? 0)
  );
}

// TODO production:
// - Add a protected cron route, e.g. POST /api/internal/sync/espn
// - Verify a server-side CRON_SECRET header
// - Apply timeouts, retry/backoff and rate limits
// - Validate upstream JSON against a schema
// - Use idempotent upserts keyed by provider + provider ID
// - Store raw payload for audit and corrections
// - Recalculate affected leagues after every successful sync
// - Log last successful sync and alert on repeated failures
