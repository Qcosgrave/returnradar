import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, PLANS, createStripeCustomer, createCheckoutSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await request.json()
  const planConfig = PLANS[plan as keyof typeof PLANS]

  if (!planConfig) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  let customerId = userData?.stripe_customer_id

  // Create Stripe customer if needed
  if (!customerId) {
    const customer = await createStripeCustomer(user.email!, userData?.bar_name || 'Bar Owner')
    customerId = customer.id

    await admin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await createCheckoutSession(
    customerId,
    planConfig.priceId,
    user.id,
    `${appUrl}/dashboard?subscription=success`,
    `${appUrl}/onboarding?step=3&subscription=canceled`
  )

  return NextResponse.json({ url: session.url })
}
