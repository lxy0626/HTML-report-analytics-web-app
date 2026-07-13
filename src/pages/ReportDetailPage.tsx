import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EquityCurveChart } from '../components/EquityCurveChart'
import { TradesTable } from '../components/TradesTable'
import { formatDate, formatMoney, formatNumber, formatPct } from '../lib/format'
import { deleteReport, getReport, getSignedReportUrl } from '../lib/reportsApi'
import type { Report } from '../types/report'

interface MetricRow {
  label: string
  value: string
  tone?: 'positive' | 'negative'
}

function MetricGroup({ title, rows }: { title: string; rows: MetricRow[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <dl className="space-y-1.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{r.label}</dt>
            <dd
              className={
                r.tone === 'positive'
                  ? 'font-medium text-emerald-600 dark:text-emerald-400'
                  : r.tone === 'negative'
                    ? 'font-medium text-red-600 dark:text-red-400'
                    : 'font-medium'
              }
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getReport(id)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report.'))
  }, [id])

  async function handleViewOriginal() {
    if (!report) return
    try {
      setOriginalUrl(await getSignedReportUrl(report))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the original file.')
    }
  }

  async function handleDelete() {
    if (!report) return
    if (!confirm(`Delete "${report.tag || report.file_name}"? This cannot be undone.`)) return
    await deleteReport(report)
    navigate('/')
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
  }
  if (!report) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  const parameterEntries = Object.entries(report.parameters ?? {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/" className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {report.tag || report.ea_name || report.file_name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {report.ea_name} · {report.symbol} · {report.timeframe} · {formatDate(report.test_start)} → {formatDate(report.test_end)}
          </p>
          {report.notes && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{report.notes}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleViewOriginal()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            View original report
          </button>
          <button
            onClick={() => void handleDelete()}
            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      {originalUrl && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800">
          <iframe
            title="Original report"
            src={originalUrl}
            sandbox="allow-same-origin"
            className="h-[500px] w-full rounded-xl"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricGroup
          title="Profitability"
          rows={[
            { label: 'Net profit', value: formatMoney(report.net_profit), tone: (report.net_profit ?? 0) >= 0 ? 'positive' : 'negative' },
            { label: 'Gross profit', value: formatMoney(report.gross_profit) },
            { label: 'Gross loss', value: formatMoney(report.gross_loss) },
            { label: 'Profit factor', value: report.profit_factor?.toFixed(2) ?? '—' },
            { label: 'Expected payoff', value: formatMoney(report.expected_payoff) },
          ]}
        />
        <MetricGroup
          title="Risk"
          rows={[
            { label: 'Absolute drawdown', value: formatMoney(report.absolute_drawdown), tone: 'negative' },
            { label: 'Max drawdown', value: formatMoney(report.max_drawdown), tone: 'negative' },
            { label: 'Max drawdown %', value: formatPct(report.max_drawdown_pct), tone: 'negative' },
            { label: 'Relative drawdown %', value: formatPct(report.relative_drawdown_pct), tone: 'negative' },
          ]}
        />
        <MetricGroup
          title="Trade stats"
          rows={[
            { label: 'Total trades', value: formatNumber(report.total_trades) },
            { label: 'Short (won %)', value: `${formatNumber(report.short_trades)} (${formatPct(report.short_win_pct)})` },
            { label: 'Long (won %)', value: `${formatNumber(report.long_trades)} (${formatPct(report.long_win_pct)})` },
            { label: 'Largest profit', value: formatMoney(report.largest_profit_trade), tone: 'positive' },
            { label: 'Largest loss', value: formatMoney(report.largest_loss_trade), tone: 'negative' },
            { label: 'Average profit', value: formatMoney(report.average_profit_trade), tone: 'positive' },
            { label: 'Average loss', value: formatMoney(report.average_loss_trade), tone: 'negative' },
          ]}
        />
        <MetricGroup
          title="Streaks"
          rows={[
            { label: 'Max consecutive wins', value: `${formatNumber(report.max_consecutive_wins)} (${formatMoney(report.max_consecutive_wins_money)})` },
            { label: 'Max consecutive losses', value: `${formatNumber(report.max_consecutive_losses)} (${formatMoney(report.max_consecutive_losses_money)})` },
            { label: 'Avg consecutive wins', value: formatNumber(report.avg_consecutive_wins) },
            { label: 'Avg consecutive losses', value: formatNumber(report.avg_consecutive_losses) },
          ]}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Equity curve
        </p>
        <EquityCurveChart trades={report.trades} />
      </div>

      {parameterEntries.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            EA parameters
          </p>
          <div className="grid max-h-64 grid-cols-1 gap-x-6 gap-y-1 overflow-y-auto text-sm sm:grid-cols-2 lg:grid-cols-3">
            {parameterEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2 border-b border-slate-100 py-1 dark:border-slate-800">
                <span className="truncate text-slate-500 dark:text-slate-400" title={key}>
                  {key}
                </span>
                <span className="truncate font-medium" title={value}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Trade log
        </p>
        <TradesTable trades={report.trades} />
      </div>
    </div>
  )
}
