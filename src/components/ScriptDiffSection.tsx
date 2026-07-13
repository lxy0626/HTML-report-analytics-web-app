import { useState } from 'react'
import { requestDiffSummary, type DiffMetrics } from '../lib/aiSummary'
import { diffToText } from '../lib/scriptDiff'
import { saveAiSummary } from '../lib/reportsApi'
import type { Report } from '../types/report'
import { ScriptDiffView } from './ScriptDiffView'

function metricsOf(report: Report): DiffMetrics {
  return {
    netProfit: report.net_profit,
    profitFactor: report.profit_factor,
    maxDrawdownPct: report.max_drawdown_pct,
    winRatePct: report.profit_trades_pct,
    totalTrades: report.total_trades,
    expectedPayoff: report.expected_payoff,
  }
}

interface ScriptDiffSectionProps {
  /** Chronologically earlier report. */
  before: Report
  /** Chronologically later report. */
  after: Report
  /** Report id to persist the generated summary onto (the fixed prev/current relationship on the
   *  detail page). Omit for an arbitrary pair (e.g. Compare page) where nothing should be cached. */
  persistTo?: string
}

export function ScriptDiffSection({ before, after, persistTo }: ScriptDiffSectionProps) {
  const [summary, setSummary] = useState<string | null>(after.ai_summary ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!before.script_source || !after.script_source) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Script changes
        </p>
        <p className="text-sm text-slate-400">
          No script snapshot attached to one or both of these reports. Attach one on the Upload
          page or in Auto-upload to enable diffing.
        </p>
      </div>
    )
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const diff = diffToText(before.script_source!, after.script_source!)
      const result = await requestDiffSummary({
        eaName: after.ea_name,
        diff,
        before: metricsOf(before),
        after: metricsOf(after),
      })
      // Persist before showing success, so the UI never displays a summary that then turns out
      // not to have been saved (a failed save surfaces as an error instead of a silent mismatch).
      if (persistTo) await saveAiSummary(persistTo, result)
      setSummary(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Script changes
      </p>
      <ScriptDiffView before={before.script_source} after={after.script_source} />

      <div className="mt-3">
        {summary ? (
          <div className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
            {summary}
          </div>
        ) : (
          <button
            onClick={() => void handleGenerate()}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? 'Asking AI…' : 'Ask AI to explain this'}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}
