import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '../lib/format'
import type { Trade } from '../types/report'

export function EquityCurveChart({ trades, height = 240 }: { trades: Trade[]; height?: number }) {
  if (trades.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No closed trades to chart.</p>
  }
  const data = trades.map((t) => ({ seq: t.seq, balance: t.balance }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="seq" tick={{ fontSize: 11 }} label={{ value: 'Trade #', position: 'insideBottom', offset: -2, fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={60} domain={['auto', 'auto']} />
        <Tooltip formatter={(v) => formatMoney(Number(v))} labelFormatter={(v) => `Trade #${v}`} contentStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
