import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReportsTable } from '../components/ReportsTable'
import { RiskRewardScatter } from '../components/RiskRewardScatter'
import { StatCard } from '../components/StatCard'
import { TrendChart } from '../components/TrendChart'
import { formatDate, formatMoney, formatPct } from '../lib/format'
import { deleteReport, listReports } from '../lib/reportsApi'
import type { Report } from '../types/report'

function delta(current: number | null, previous: number | null): string | undefined {
  if (current === null || previous === null) return undefined
  const diff = current - previous
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)} vs. previous run`
}

export function DashboardPage() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      setReports(await listReports())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleDelete(report: Report) {
    if (!confirm(`Delete "${report.tag || report.file_name}"? This cannot be undone.`)) return
    await deleteReport(report)
    void refresh()
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
  }
  if (!reports) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No reports yet. <Link to="/upload" className="text-indigo-600 underline dark:text-indigo-400">Upload your first Strategy Tester report</Link> to start tracking progress.
        </p>
      </div>
    )
  }

  const latest = reports[reports.length - 1]
  const previous = reports.length > 1 ? reports[reports.length - 2] : null

  const trendData = reports.map((r) => ({
    label: formatDate(r.uploaded_at),
    netProfit: r.net_profit,
    profitFactor: r.profit_factor,
    maxDrawdownPct: r.max_drawdown_pct,
    winRatePct: r.profit_trades_pct,
    expectedPayoff: r.expected_payoff,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Latest run: {latest.tag || latest.ea_name || latest.file_name} · uploaded {formatDate(latest.uploaded_at)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Net profit"
          value={formatMoney(latest.net_profit)}
          hint={delta(latest.net_profit, previous?.net_profit ?? null)}
          tone={(latest.net_profit ?? 0) >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Profit factor"
          value={latest.profit_factor?.toFixed(2) ?? '—'}
          hint={delta(latest.profit_factor, previous?.profit_factor ?? null)}
        />
        <StatCard
          label="Win rate"
          value={formatPct(latest.profit_trades_pct)}
          hint={delta(latest.profit_trades_pct, previous?.profit_trades_pct ?? null)}
        />
        <StatCard
          label="Max drawdown"
          value={formatPct(latest.max_drawdown_pct)}
          hint={delta(latest.max_drawdown_pct, previous?.max_drawdown_pct ?? null)}
          tone="negative"
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Trends across all runs</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TrendChart
            title="Net profit"
            color="#10b981"
            valueFormatter={formatMoney}
            data={trendData.map((d) => ({ label: d.label, value: d.netProfit }))}
          />
          <TrendChart
            title="Profit factor"
            color="#6366f1"
            data={trendData.map((d) => ({ label: d.label, value: d.profitFactor }))}
          />
          <TrendChart
            title="Max drawdown %"
            color="#ef4444"
            valueFormatter={formatPct}
            data={trendData.map((d) => ({ label: d.label, value: d.maxDrawdownPct }))}
          />
          <TrendChart
            title="Win rate %"
            color="#0ea5e9"
            valueFormatter={formatPct}
            data={trendData.map((d) => ({ label: d.label, value: d.winRatePct }))}
          />
          <TrendChart
            title="Expected payoff"
            color="#a855f7"
            valueFormatter={formatMoney}
            data={trendData.map((d) => ({ label: d.label, value: d.expectedPayoff }))}
          />
        </div>
      </div>

      <RiskRewardScatter reports={reports} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">All reports</h2>
        <ReportsTable reports={reports} onDelete={(r) => void handleDelete(r)} />
      </div>
    </div>
  )
}
