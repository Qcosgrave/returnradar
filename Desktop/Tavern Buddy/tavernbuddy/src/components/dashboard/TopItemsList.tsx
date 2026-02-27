import { formatCurrency } from '@/lib/utils'

interface Item {
  name: string
  revenue: number
  quantity: number
}

export default function TopItemsList({ items }: { items: Item[] }) {
  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-sm">No item data yet.</p>
  }

  const maxRevenue = items[0]?.revenue || 1

  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((item, i) => (
        <div key={item.name}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-600 text-xs w-4 shrink-0">{i + 1}</span>
              <span className="text-slate-200 text-sm truncate">{item.name}</span>
            </div>
            <span className="text-amber-400 font-bold text-sm shrink-0 ml-2">{formatCurrency(item.revenue)}</span>
          </div>
          <div className="h-1 bg-[#2d3748] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
            />
          </div>
          <p className="text-slate-600 text-xs mt-0.5">{item.quantity} sold</p>
        </div>
      ))}
    </div>
  )
}
