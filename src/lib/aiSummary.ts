import { supabase } from './supabaseClient'

export interface DiffMetrics {
  netProfit: number | null
  profitFactor: number | null
  maxDrawdownPct: number | null
  winRatePct: number | null
  totalTrades: number | null
  expectedPayoff: number | null
}

export interface ExplainDiffInput {
  eaName: string | null
  diff: string
  before: DiffMetrics
  after: DiffMetrics
}

/** Calls the explain-diff Edge Function (see supabase/functions/explain-diff) for a plausible
 *  plain-English explanation of what changed and why performance moved. Requires the function to
 *  be deployed and NIM_API_KEY to be set as a Supabase secret. */
export async function requestDiffSummary(input: ExplainDiffInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ summary?: string; error?: string }>(
    'explain-diff',
    { body: input },
  )
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  if (!data?.summary) throw new Error('No summary returned.')
  return data.summary
}
