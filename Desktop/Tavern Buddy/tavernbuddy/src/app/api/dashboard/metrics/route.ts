import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics } from '@/lib/data'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const metrics = await getDashboardMetrics(user.id)
  return NextResponse.json(metrics)
}
