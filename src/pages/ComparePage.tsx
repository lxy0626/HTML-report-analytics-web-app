import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ComparisonBarChart } from '../components/ComparisonBarChart'
import { ScriptDiffSection } from '../components/ScriptDiffSection'
import { formatDate, formatMoney, formatPct } from '../lib/format'
import { listReports } from '../lib/reportsApi'
import type { Report } from '../types/report'

const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#0ea5e9', '#a855f7']

function reportLabel(r: Report): string {
  return r.tag || r.ea_name || r.file_name
}

const metricRows: { label: string; get: (r: Report) => string }[] = [
  { label: 'Uploaded', get: (r) => formatDate(r.uploaded_at) },
  { label: 'Net profit', get: (r) => formatMoney(r.net_profit) },
  { label: 'Profit factor', get: (r) => r.profit_factor?.toFixed(2) ?? '—' },
  { label: 'Expected payoff', get: (r) => formatMoney(r.expected_payoff) },
  { label: 'Max drawdown %', get: (r) => formatPct(r.max_drawdown_pct) },
  { label: 'Total trades', get: (r) => String(r.total_trades ?? '—') },
  { label: 'Win rate %', get: (r) => formatPct(r.profit_trades_pct) },
]

export function ComparePage() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reports.'))
  }, [])

  const selected = useMemo(
    () => (reports ?? []).filter((r) => selectedIds.includes(r.id)),
    [reports, selectedIds],
  )

  function toggle(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
  }
  if (!reports) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  const maxLen = Math.max(0, ...selected.map((r) => r.trades.length))
  const equityData = Array.from({ length: maxLen }, (_, i) => {
    const point: Record<string, number | null> = { seq: i + 1 }
    for (const r of selected) point[r.id] = r.trades[i]?.balance ?? null
    return point
  })

  const parameterKeys = Array.from(new Set(selected.flatMap((r) => Object.keys(r.parameters ?? {})))).sort()
  const differingKeys = parameterKeys.filter((key) => {
    const values = selected.map((r) => (r.parameters ?? {})[key] ?? '')
    return new Set(values).size > 1
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Compare runs</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Select 2 or more reports
        </p>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-400">No reports uploaded yet.</p>
        ) : (
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {reports.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <span className="font-medium">{reportLabel(r)}</span>
                <span className="text-slate-400">· {formatDate(r.uploaded_at)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {selected.length < 2 ? (
        <p className="text-sm text-slate-400">Pick at least two reports to compare.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2">Metric</th>
                  {selected.map((r) => (
                    <th key={r.id} className="px-4 py-2">
                      <Link to={`/reports/${r.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        {reportLabel(r)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{row.label}</td>
                    {selected.map((r) => (
                      <td key={r.id} className="px-4 py-2 font-medium">
                        {row.get(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Overlaid equity curves
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={equityData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="seq" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend formatter={(id) => reportLabel(selected.find((r) => r.id === id) ?? selected[0])} />
                {selected.map((r, i) => (
                  <Line
                    key={r.id}
                    type="monotone"
                    dataKey={r.id}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ComparisonBarChart
              title="Net profit"
              color="#10b981"
              valueFormatter={formatMoney}
              data={selected.map((r) => ({ label: reportLabel(r), value: r.net_profit }))}
            />
            <ComparisonBarChart
              title="Profit factor"
              color="#6366f1"
              data={selected.map((r) => ({ label: reportLabel(r), value: r.profit_factor }))}
            />
            <ComparisonBarChart
              title="Max drawdown %"
              color="#ef4444"
              valueFormatter={formatPct}
              data={selected.map((r) => ({ label: reportLabel(r), value: r.max_drawdown_pct }))}
            />
            <ComparisonBarChart
              title="Win rate %"
              color="#0ea5e9"
              valueFormatter={formatPct}
              data={selected.map((r) => ({ label: reportLabel(r), value: r.profit_trades_pct }))}
            />
          </div>

          {differingKeys.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Parameters that differ
              </p>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-2 py-1">Parameter</th>
                    {selected.map((r) => (
                      <th key={r.id} className="px-2 py-1">
                        {reportLabel(r)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {differingKeys.map((key) => (
                    <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-1 text-slate-500 dark:text-slate-400">{key}</td>
                      {selected.map((r) => (
                        <td key={r.id} className="px-2 py-1 font-medium">
                          {(r.parameters ?? {})[key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selected.length === 2 && <ScriptDiffSection before={selected[0]} after={selected[1]} />}
        </>
      )}
    </div>
  )
}
