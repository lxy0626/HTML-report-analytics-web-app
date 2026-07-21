/** The subset of report metrics sent to the explain-diff Edge Function for its before/after
 *  comparison. Single source of truth for this shape — imported by both the browser bundle
 *  (src/lib/aiSummary.ts) and the Edge Function (supabase/functions/explain-diff/index.ts, via a
 *  relative import across the Deno/Vite boundary) so it's never declared twice. Type-only, so it
 *  has zero runtime footprint in either build. */
export interface DiffMetrics {
  netProfit: number | null
  profitFactor: number | null
  maxDrawdownPct: number | null
  winRatePct: number | null
  totalTrades: number | null
  expectedPayoff: number | null
}
