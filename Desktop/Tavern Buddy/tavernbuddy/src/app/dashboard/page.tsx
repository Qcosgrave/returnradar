import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDashboardMetrics } from '@/lib/data'
import { formatCurrency, formatPercent, formatDateShort } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Receipt, Star, Users, BarChart2, AlertCircle, Link2 } from 'lucide-react'
import Link from 'next/link'
import RevenueChart from '@/components/dashboard/RevenueChart'
import TopItemsList from '@/components/dashboard/TopItemsList'
import SquareBanner from '@/components/dashboard/SquareBanner'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  const metrics = await getDashboardMetrics(user.id)

  const { data: latestReport } = await admin
    .from('weekly_reports')
    .select('id, week_start, week_end, generated_at')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  const squareConnected = userData?.square_connected

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          Hey {userData?.bar_name ? `${userData.bar_name} 👋` : 'there 👋'}
        </h1>
        <p className="text-slate-400 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Square connection banner */}
      {!squareConnected && <SquareBanner />}

      {/* Subscription prompt if needed */}
      {(!userData?.plan || userData.plan === 'none') && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Start your subscription to get weekly reports</p>
            <p className="text-amber-300/70 text-xs mt-0.5">You&apos;re exploring the dashboard with sample data.</p>
            <Link href="/onboarding?step=3" className="text-amber-400 text-xs font-bold hover:text-amber-300 mt-2 inline-block">
              Choose a plan →
            </Link>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Revenue (7 days)"
          value={formatCurrency(metrics.revenue7d)}
          change={metrics.revenue7dChange}
          icon={DollarSign}
        />
        <KpiCard
          label="Avg Tab"
          value={formatCurrency(metrics.avgTab7d)}
          change={metrics.avgTab7dChange}
          icon={Receipt}
        />
        <KpiCard
          label="Transactions"
          value={metrics.transactions7d.toString()}
          icon={BarChart2}
          noChange
        />
        <KpiCard
          label="Top Item"
          value={metrics.topItems[0]?.name?.split(' ').slice(0, 2).join(' ') || '—'}
          icon={Star}
          noChange
          small
        />
      </div>

      {/* Charts & lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6">
          <h2 className="font-semibold text-slate-100 mb-4">Revenue last 7 days</h2>
          <RevenueChart data={metrics.revenueByDay} />
        </div>

        {/* Top items */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6">
          <h2 className="font-semibold text-slate-100 mb-4">Top items by revenue</h2>
          <TopItemsList items={metrics.topItems} />
        </div>
      </div>

      {/* Top staff + Latest report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top staff */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6">
          <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Top staff (avg tab)
          </h2>
          {metrics.topStaff.length === 0 ? (
            <p className="text-slate-500 text-sm">No staff data yet. Connect Square to see staff performance.</p>
          ) : (
            <div className="space-y-3">
              {metrics.topStaff.map((staff, i) => (
                <div key={staff.name} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-[#2d3748] text-slate-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{staff.name}</p>
                    <p className="text-slate-500 text-xs">{staff.transactions} tickets</p>
                  </div>
                  <span className="text-amber-400 font-bold text-sm">{formatCurrency(staff.avgTab)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest report */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6">
          <h2 className="font-semibold text-slate-100 mb-4">Latest weekly report</h2>
          {latestReport ? (
            <div>
              <p className="text-slate-400 text-sm mb-1">
                Week of {formatDateShort(latestReport.week_start)} — {formatDateShort(latestReport.week_end)}
              </p>
              <p className="text-slate-500 text-xs mb-4">
                Generated {new Date(latestReport.generated_at).toLocaleDateString()}
              </p>
              <Link
                href={`/dashboard/reports`}
                className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors inline-block"
              >
                View full report →
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-slate-400 text-sm mb-4">
                No reports yet. Your first report will arrive next Monday at 8am.
              </p>
              <div className="bg-[#0f1117] border border-[#2d3748] rounded-lg p-4">
                <p className="text-slate-500 text-xs leading-relaxed">
                  Tavernbuddy generates your weekly report every Monday morning using the previous week&apos;s data from your Square account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  noChange,
  small,
}: {
  label: string
  value: string
  change?: number
  icon: React.ElementType
  noChange?: boolean
  small?: boolean
}) {
  const isPositive = (change || 0) >= 0

  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-xs font-medium">{label}</p>
        <Icon className="w-4 h-4 text-slate-600" />
      </div>
      <p className={`font-bold text-slate-100 ${small ? 'text-lg' : 'text-2xl'} truncate`}>{value}</p>
      {!noChange && change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {formatPercent(change)} vs prev 7d
        </div>
      )}
    </div>
  )
}
