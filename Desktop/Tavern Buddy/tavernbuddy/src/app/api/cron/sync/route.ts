import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, fetchSquareTransactions, fetchSquareEmployees } from '@/lib/square'

// Vercel cron: runs nightly at 2am UTC
// vercel.json: { "crons": [{ "path": "/api/cron/sync", "schedule": "0 2 * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get all users with connected Square accounts
  const { data: connections, error } = await supabase
    .from('square_connections')
    .select('*, users(id, plan, subscription_status)')

  if (error || !connections) {
    console.error('Failed to fetch Square connections:', error)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }

  const results = await Promise.allSettled(
    connections.map((conn) => syncUserData(conn))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(`Nightly sync complete: ${succeeded} succeeded, ${failed} failed`)

  return NextResponse.json({ succeeded, failed, total: connections.length })
}

async function syncUserData(conn: any) {
  const supabase = createAdminClient()
  const userId = conn.user_id

  // Skip users without active subscription (except during development)
  const user = conn.users
  if (user?.subscription_status && !['active', 'trialing'].includes(user.subscription_status)) {
    console.log(`Skipping user ${userId} — subscription status: ${user.subscription_status}`)
    return
  }

  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) {
    console.error(`No valid access token for user ${userId}`)
    return
  }

  const locationId = conn.location_id
  if (!locationId) {
    console.error(`No location_id for user ${userId}`)
    return
  }

  // Sync yesterday's data
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const endOfYesterday = new Date(yesterday)
  endOfYesterday.setHours(23, 59, 59, 999)

  const beginTime = yesterday.toISOString()
  const endTime = endOfYesterday.toISOString()

  try {
    // Fetch and upsert employees
    const employees = await fetchSquareEmployees(accessToken)
    for (const emp of employees) {
      await supabase.from('employees').upsert({
        user_id: userId,
        square_employee_id: emp.id,
        name: `${emp.given_name || ''} ${emp.family_name || ''}`.trim(),
      }, { onConflict: 'square_employee_id' })
    }

    // Fetch orders
    const orders = await fetchSquareTransactions(accessToken, locationId, beginTime, endTime)

    for (const order of orders) {
      // Calculate totals
      const totalAmount = order.total_money?.amount || 0
      const lineItems = order.line_items || []
      const itemCount = lineItems.reduce((sum: number, li: any) => sum + (parseInt(li.quantity) || 1), 0)
      const createdAt = new Date(order.created_at)
      const hour = createdAt.getHours()
      const dateStr = createdAt.toISOString().split('T')[0]

      // Find employee
      let employeeId: string | null = null
      if (order.fulfillments?.[0]?.pickup_details?.recipient?.customer_id) {
        // Not employee — skip
      }
      // Get employee from tender
      const tender = order.tenders?.[0]
      if (tender?.employee_id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('square_employee_id', tender.employee_id)
          .eq('user_id', userId)
          .single()
        employeeId = emp?.id || null
      }

      // Upsert transaction
      const { data: txn } = await supabase
        .from('transactions')
        .upsert({
          user_id: userId,
          square_transaction_id: order.id,
          date: dateStr,
          hour,
          total_amount: totalAmount,
          item_count: itemCount,
          employee_id: employeeId,
        }, { onConflict: 'square_transaction_id' })
        .select('id')
        .single()

      if (!txn) continue

      // Upsert line items
      for (const li of lineItems) {
        await supabase.from('transaction_items').upsert({
          transaction_id: txn.id,
          item_name: li.name || 'Unknown Item',
          category: li.variation_name || li.catalog_object_type || 'Other',
          quantity: parseInt(li.quantity) || 1,
          gross_amount: li.gross_sales_money?.amount || 0,
        }, { onConflict: 'transaction_id,item_name' })
      }
    }

    console.log(`Synced ${orders.length} orders for user ${userId}`)
  } catch (err) {
    console.error(`Failed to sync data for user ${userId}:`, err)
    throw err
  }
}
