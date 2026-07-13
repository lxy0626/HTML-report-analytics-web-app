import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ComparisonBarChartProps {
  title: string
  data: { label: string; value: number | null }[]
  color: string
  valueFormatter?: (value: number) => string
}

export function ComparisonBarChart({ title, data, color, valueFormatter }: ComparisonBarChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10 }} width={40} />
          <Tooltip
            formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : value)}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
