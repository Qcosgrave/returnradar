import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWeeklyData } from '@/lib/data'
import { generateWeeklyReport } from '@/lib/claude'
import { sendWeeklyReport } from '@/lib/resend'
import { getPreviousWeekRange } from '@/lib/utils'
import { SAMPLE_WEEKLY_DATA } from '@/lib/sample-data'

// Vercel cron: runs every Monday at 8am UTC
// vercel.json: { "crons": [{ "path": "/api/cron/weekly-reports", "schedule": "0 8 * * 1" }] }

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Get all active subscribers
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .in('subscription_status', ['active', 'trialing'])
    .not('plan', 'eq', 'none')

  if (error || !users) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const { start: weekStart, end: weekEnd } = getPreviousWeekRange()

  const results = await Promise.allSettled(
    users.map((user) => generateAndSendReport(user, weekStart, weekEnd, appUrl))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ succeeded, failed, total: users.length })
}

async function generateAndSendReport(user: any, weekStart: Date, weekEnd: Date, appUrl: string) {
  const supabase = createAdminClient()

  // Get weekly data (fall back to sample if no data)
  let weeklyData = await getWeeklyData(user.id, weekStart, weekEnd)
  const usingSampleData = !weeklyData
  if (!weeklyData) weeklyData = SAMPLE_WEEKLY_DATA

  // Generate report with Claude
  const barName = user.bar_name || 'Your Bar'
  const { html, text } = await generateWeeklyReport(weeklyData, barName)

  const weekStartStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Save report to database
  const { error: saveError } = await supabase.from('weekly_reports').insert({
    user_id: user.id,
    week_start: weekStart.toISOString().split('T')[0],
    week_end: weekEnd.toISOString().split('T')[0],
    report_html: html,
    report_text: text,
  })

  if (saveError) {
    console.error(`Failed to save report for user ${user.id}:`, saveError)
    throw saveError
  }

  // Send email
  const { error: emailError } = await sendWeeklyReport(
    user.email,
    barName,
    weekStartStr,
    weekEndStr,
    html,
    `${appUrl}/dashboard`
  )

  if (emailError) {
    console.error(`Failed to send email to ${user.email}:`, emailError)
    throw emailError
  }

  console.log(`Report generated and sent for ${barName} (${user.email})${usingSampleData ? ' [sample data]' : ''}`)
}

// Also allow POST for manual triggering / testing
export async function POST(_request: NextRequest) {
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { start: weekStart, end: weekEnd } = getPreviousWeekRange()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  await generateAndSendReport(userData, weekStart, weekEnd, appUrl)

  return NextResponse.json({ success: true, message: 'Report generated and sent' })
}
