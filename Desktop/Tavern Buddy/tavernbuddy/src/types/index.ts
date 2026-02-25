export type Plan = 'starter' | 'pro' | 'none'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'

export interface User {
  id: string
  email: string
  bar_name: string | null
  location: string | null
  timezone: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: Plan
  subscription_status: SubscriptionStatus
  square_connected: boolean
  onboarding_complete: boolean
  created_at: string
}

export interface SquareConnection {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  merchant_id: string
  location_id: string | null
  expires_at: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  square_transaction_id: string
  date: string
  hour: number
  total_amount: number
  item_count: number
  employee_id: string | null
  created_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  item_name: string
  category: string | null
  quantity: number
  gross_amount: number
}

export interface Employee {
  id: string
  user_id: string
  square_employee_id: string
  name: string
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  report_html: string
  report_text: string
  generated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface DashboardMetrics {
  revenue7d: number
  revenue7dChange: number
  avgTab7d: number
  avgTab7dChange: number
  transactions7d: number
  topItems: Array<{ name: string; revenue: number; quantity: number }>
  topStaff: Array<{ name: string; avgTab: number; transactions: number }>
  revenueByDay: Array<{ date: string; revenue: number }>
}

export interface WeeklyData {
  weekStart: string
  weekEnd: string
  totalRevenue: number
  transactionCount: number
  avgTab: number
  prevAvgTab: number
  topItems: Array<{ name: string; revenue: number; quantity: number; category: string }>
  topStaff: Array<{ name: string; avgTab: number; transactions: number; totalRevenue: number }>
  revenueByDay: Array<{ date: string; revenue: number; transactions: number }>
  hourlyBreakdown: Array<{ hour: number; revenue: number; transactions: number }>
  voids: number
  discounts: number
}
