import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardMetrics, WeeklyData } from '@/types'
import { SAMPLE_METRICS, SAMPLE_WEEKLY_DATA } from '@/lib/sample-data'

// Fetch dashboard metrics for a user
export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = createAdminClient()

  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(now.getDate() - 14)

  const { data: transactions7d } = await supabase
    .from('transactions')
    .select('*, transaction_items(*), employees(name)')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (!transactions7d || transactions7d.length === 0) {
    return SAMPLE_METRICS
  }

  const { data: transactions14d } = await supabase
    .from('transactions')
    .select('total_amount')
    .eq('user_id', userId)
    .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
    .lt('date', sevenDaysAgo.toISOString().split('T')[0])

  const revenue7d = transactions7d.reduce((sum, t) => sum + (t.total_amount || 0), 0)
  const revenue14d = (transactions14d || []).reduce((sum, t) => sum + (t.total_amount || 0), 0)
  const avgTab7d = transactions7d.length > 0 ? revenue7d / transactions7d.length : 0
  const avgTab14d = (transactions14d || []).length > 0 ? revenue14d / (transactions14d || []).length : 0

  const revenue7dChange = revenue14d > 0 ? ((revenue7d - revenue14d) / revenue14d) * 100 : 0
  const avgTab7dChange = avgTab14d > 0 ? ((avgTab7d - avgTab14d) / avgTab14d) * 100 : 0

  // Item aggregation
  const itemMap = new Map<string, { revenue: number; quantity: number }>()
  for (const t of transactions7d) {
    for (const item of (t.transaction_items || [])) {
      const existing = itemMap.get(item.item_name) || { revenue: 0, quantity: 0 }
      itemMap.set(item.item_name, {
        revenue: existing.revenue + (item.gross_amount || 0),
        quantity: existing.quantity + (item.quantity || 0),
      })
    }
  }
  const topItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Staff aggregation
  const staffMap = new Map<string, { avgTab: number; transactions: number; total: number; name: string }>()
  for (const t of transactions7d) {
    if (t.employee_id && t.employees) {
      const name = t.employees.name || 'Unknown'
      const existing = staffMap.get(t.employee_id) || { avgTab: 0, transactions: 0, total: 0, name }
      staffMap.set(t.employee_id, {
        name,
        transactions: existing.transactions + 1,
        total: existing.total + (t.total_amount || 0),
        avgTab: 0,
      })
    }
  }
  const topStaff = Array.from(staffMap.values())
    .map((s) => ({ ...s, avgTab: s.transactions > 0 ? s.total / s.transactions : 0 }))
    .sort((a, b) => b.avgTab - a.avgTab)
    .slice(0, 3)

  // Revenue by day
  const dayMap = new Map<string, number>()
  for (const t of transactions7d) {
    const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' })
    dayMap.set(day, (dayMap.get(day) || 0) + (t.total_amount || 0))
  }
  const revenueByDay = Array.from(dayMap.entries()).map(([date, revenue]) => ({ date, revenue }))

  return {
    revenue7d,
    revenue7dChange,
    avgTab7d,
    avgTab7dChange,
    transactions7d: transactions7d.length,
    topItems,
    topStaff,
    revenueByDay,
  }
}

// Fetch weekly data for report generation
export async function getWeeklyData(userId: string, weekStart: Date, weekEnd: Date): Promise<WeeklyData | null> {
  const supabase = createAdminClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, transaction_items(*), employees(name)')
    .eq('user_id', userId)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])

  if (!transactions || transactions.length === 0) {
    return null
  }

  // Get prev 4 weeks avg tab
  const fourWeeksAgo = new Date(weekStart)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const { data: prevTransactions } = await supabase
    .from('transactions')
    .select('total_amount')
    .eq('user_id', userId)
    .gte('date', fourWeeksAgo.toISOString().split('T')[0])
    .lt('date', weekStart.toISOString().split('T')[0])

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
  const avgTab = transactions.length > 0 ? totalRevenue / transactions.length : 0
  const prevAvgTab =
    (prevTransactions || []).length > 0
      ? (prevTransactions || []).reduce((sum, t) => sum + (t.total_amount || 0), 0) / (prevTransactions || []).length
      : avgTab

  // Items
  const itemMap = new Map<string, { revenue: number; quantity: number; category: string }>()
  for (const t of transactions) {
    for (const item of (t.transaction_items || [])) {
      const existing = itemMap.get(item.item_name) || { revenue: 0, quantity: 0, category: item.category || 'Other' }
      itemMap.set(item.item_name, {
        revenue: existing.revenue + (item.gross_amount || 0),
        quantity: existing.quantity + (item.quantity || 0),
        category: existing.category,
      })
    }
  }
  const topItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Staff
  const staffMap = new Map<string, { name: string; transactions: number; total: number }>()
  for (const t of transactions) {
    if (t.employee_id && t.employees) {
      const name = t.employees.name || 'Unknown'
      const existing = staffMap.get(t.employee_id) || { name, transactions: 0, total: 0 }
      staffMap.set(t.employee_id, {
        name,
        transactions: existing.transactions + 1,
        total: existing.total + (t.total_amount || 0),
      })
    }
  }
  const topStaff = Array.from(staffMap.values())
    .map((s) => ({ ...s, avgTab: s.transactions > 0 ? s.total / s.transactions : 0, totalRevenue: s.total }))
    .sort((a, b) => b.avgTab - a.avgTab)
    .slice(0, 5)

  // Revenue by day
  const dayMap = new Map<string, { revenue: number; transactions: number }>()
  for (const t of transactions) {
    const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const existing = dayMap.get(day) || { revenue: 0, transactions: 0 }
    dayMap.set(day, {
      revenue: existing.revenue + (t.total_amount || 0),
      transactions: existing.transactions + 1,
    })
  }
  const revenueByDay = Array.from(dayMap.entries()).map(([date, data]) => ({ date, ...data }))

  // Hourly
  const hourMap = new Map<number, { revenue: number; transactions: number }>()
  for (const t of transactions) {
    const hour = t.hour || 0
    const existing = hourMap.get(hour) || { revenue: 0, transactions: 0 }
    hourMap.set(hour, {
      revenue: existing.revenue + (t.total_amount || 0),
      transactions: existing.transactions + 1,
    })
  }
  const hourlyBreakdown = Array.from(hourMap.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => a.hour - b.hour)

  return {
    weekStart: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    weekEnd: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    totalRevenue,
    transactionCount: transactions.length,
    avgTab,
    prevAvgTab,
    topItems,
    topStaff,
    revenueByDay,
    hourlyBreakdown,
    voids: 0,
    discounts: 0,
  }
}

// Fetch context data for a chat question
export async function getContextForQuestion(userId: string, question: string): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const [transactionsResult, employeesResult, reportsResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, transaction_items(*), employees(name)')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(500),
    supabase.from('employees').select('*').eq('user_id', userId),
    supabase
      .from('weekly_reports')
      .select('week_start, week_end, report_text')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(4),
  ])

  const transactions = transactionsResult.data || []
  const employees = employeesResult.data || []
  const reports = reportsResult.data || []

  if (transactions.length === 0) {
    return {
      note: 'No transaction data available yet. Using sample data.',
      sampleRevenue: '$18,475 last week',
      sampleTopItem: 'Craft IPA Draft',
    }
  }

  // Aggregate useful stats
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
  const avgTab = transactions.length > 0 ? totalRevenue / transactions.length : 0

  const itemMap = new Map<string, { revenue: number; quantity: number }>()
  for (const t of transactions) {
    for (const item of (t.transaction_items || [])) {
      const existing = itemMap.get(item.item_name) || { revenue: 0, quantity: 0 }
      itemMap.set(item.item_name, {
        revenue: existing.revenue + (item.gross_amount || 0),
        quantity: existing.quantity + (item.quantity || 0),
      })
    }
  }

  const topItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, revenue: data.revenue / 100, quantity: data.quantity }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const staffMap = new Map<string, { name: string; transactions: number; total: number }>()
  for (const t of transactions) {
    if (t.employee_id && t.employees) {
      const existing = staffMap.get(t.employee_id) || { name: t.employees.name, transactions: 0, total: 0 }
      staffMap.set(t.employee_id, {
        name: t.employees.name,
        transactions: existing.transactions + 1,
        total: existing.total + (t.total_amount || 0),
      })
    }
  }

  const staffPerformance = Array.from(staffMap.values()).map((s) => ({
    name: s.name,
    transactions: s.transactions,
    totalRevenue: (s.total / 100).toFixed(2),
    avgTab: s.transactions > 0 ? ((s.total / s.transactions) / 100).toFixed(2) : '0',
  }))

  // Revenue by day of week
  const dowMap = new Map<string, { revenue: number; count: number }>()
  for (const t of transactions) {
    const dow = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' })
    const existing = dowMap.get(dow) || { revenue: 0, count: 0 }
    dowMap.set(dow, { revenue: existing.revenue + (t.total_amount || 0), count: existing.count + 1 })
  }
  const revenueByDayOfWeek = Array.from(dowMap.entries()).map(([day, data]) => ({
    day,
    avgRevenue: (data.revenue / Math.max(data.count / 7, 1) / 100).toFixed(2),
    transactions: data.count,
  }))

  return {
    period: `Last 30 days (${thirtyDaysAgo.toLocaleDateString()} to ${now.toLocaleDateString()})`,
    summary: {
      totalRevenue: (totalRevenue / 100).toFixed(2),
      totalTransactions: transactions.length,
      avgTab: (avgTab / 100).toFixed(2),
    },
    topItems,
    staffPerformance,
    revenueByDayOfWeek,
    recentReports: reports.map((r) => ({
      week: `${r.week_start} to ${r.week_end}`,
      summary: r.report_text?.substring(0, 500),
    })),
  }
}
