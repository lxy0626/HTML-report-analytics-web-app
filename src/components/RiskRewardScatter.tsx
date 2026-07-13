import { useNavigate } from 'react-router-dom'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import type { Report } from '../types/report'

interface ScatterPoint {
  id: string
  x: number
  y: number
  z: number
  name: string
}

export function RiskRewardScatter({ reports }: { reports: Report[] }) {
  const navigate = useNavigate()
  const data: ScatterPoint[] = reports
    .filter((r) => r.profit_factor !== null && r.max_drawdown_pct !== null)
    .map((r) => ({
      id: r.id,
      x: r.profit_factor as number,
      y: r.max_drawdown_pct as number,
      z: r.total_trades ?? 1,
      name: r.tag || r.file_name,
    }))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Risk / reward explorer — profit factor vs. max drawdown %
      </p>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Not enough data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Profit factor" tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Max drawdown %" tick={{ fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[40, 300]} name="Trades" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => [value, name]}
              labelFormatter={() => ''}
            />
            <Scatter
              data={data}
              fill="#6366f1"
              cursor="pointer"
              onClick={(point) => navigate(`/reports/${(point as unknown as ScatterPoint).id}`)}
            />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
