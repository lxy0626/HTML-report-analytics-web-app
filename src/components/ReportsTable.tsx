import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, formatMoney, formatPct } from '../lib/format'
import type { Report } from '../types/report'

type SortKey = 'uploaded_at' | 'net_profit' | 'profit_factor' | 'max_drawdown_pct' | 'total_trades'

const columns: { key: SortKey; label: string }[] = [
  { key: 'uploaded_at', label: 'Uploaded' },
  { key: 'net_profit', label: 'Net profit' },
  { key: 'profit_factor', label: 'Profit factor' },
  { key: 'max_drawdown_pct', label: 'Max DD %' },
  { key: 'total_trades', label: 'Trades' },
]

export function ReportsTable({
  reports,
  onDelete,
}: {
  reports: Report[]
  onDelete: (report: Report) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('uploaded_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Stable "run number" based on upload order, independent of the current sort — so "#3" always
  // refers to the same report no matter how the table is currently sorted.
  const indexOf = new Map(reports.map((r, i) => [r.id, i + 1]))

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...reports].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity
    const bv = b[sortKey] ?? -Infinity
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
        No reports uploaded yet. Head to <Link to="/upload" className="text-indigo-600 underline dark:text-indigo-400">Upload</Link> to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">EA / Tag</th>
            <th className="px-4 py-2">Symbol</th>
            {columns.map((c) => (
              <th
                key={c.key}
                className="cursor-pointer select-none px-4 py-2"
                onClick={() => toggleSort(c.key)}
              >
                {c.label}
                {sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <td className="px-4 py-2 text-slate-400">#{indexOf.get(r.id)}</td>
              <td className="px-4 py-2">
                <Link
                  to={`/reports/${r.id}`}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {r.tag || r.ea_name || r.file_name}
                </Link>
              </td>
              <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.symbol ?? '—'}</td>
              <td className="px-4 py-2">{formatDate(r.uploaded_at)}</td>
              <td
                className={`px-4 py-2 ${
                  (r.net_profit ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatMoney(r.net_profit)}
              </td>
              <td className="px-4 py-2">{r.profit_factor?.toFixed(2) ?? '—'}</td>
              <td className="px-4 py-2 text-red-600 dark:text-red-400">
                {formatPct(r.max_drawdown_pct)}
              </td>
              <td className="px-4 py-2">{r.total_trades ?? '—'}</td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => onDelete(r)}
                  className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
