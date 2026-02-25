'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  revenue: number
}

interface Props {
  data: DataPoint[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value || 0
  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg px-3 py-2 text-sm">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-amber-400 font-bold">${(value / 100).toFixed(2)}</p>
    </div>
  )
}

export default function RevenueChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        No revenue data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2d374830' }} />
        <Bar
          dataKey="revenue"
          fill="#f59e0b"
          radius={[4, 4, 0, 0]}
          opacity={0.9}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
