import { useState } from 'react'
import { formatDateTime, formatMoney } from '../lib/format'
import type { Trade } from '../types/report'

const PAGE_SIZE = 25

export function TradesTable({ trades }: { trades: Trade[] }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(trades.length / PAGE_SIZE))
  const pageTrades = trades.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (trades.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No closed trades recorded.</p>
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Closed at</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Exit price</th>
              <th className="px-3 py-2">S/L</th>
              <th className="px-3 py-2">T/P</th>
              <th className="px-3 py-2">Profit</th>
              <th className="px-3 py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {pageTrades.map((t) => (
              <tr
                key={t.seq}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td className="px-3 py-1.5">{t.seq}</td>
                <td className="px-3 py-1.5">{formatDateTime(t.time)}</td>
                <td className="px-3 py-1.5 uppercase">{t.type ?? '—'}</td>
                <td className="px-3 py-1.5">{t.order ?? '—'}</td>
                <td className="px-3 py-1.5">{t.size ?? '—'}</td>
                <td className="px-3 py-1.5">{t.price ?? '—'}</td>
                <td className="px-3 py-1.5">{t.sl ?? '—'}</td>
                <td className="px-3 py-1.5">{t.tp ?? '—'}</td>
                <td className={`px-3 py-1.5 ${t.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatMoney(t.profit)}
                </td>
                <td className="px-3 py-1.5">{formatMoney(t.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            ← Prev
          </button>
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <button
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
