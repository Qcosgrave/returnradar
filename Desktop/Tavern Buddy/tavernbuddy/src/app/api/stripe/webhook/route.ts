import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const subscriptionId = session.subscription as string

      if (!userId) break

      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price.id

      // Determine plan
      let plan = 'starter'
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro'

      await admin.from('users').update({
        stripe_subscription_id: subscriptionId,
        plan,
        subscription_status: subscription.status,
        onboarding_complete: true,
      }).eq('id', userId)

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: user } = await admin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!user) break

      const priceId = subscription.items.data[0]?.price.id
      let plan = 'starter'
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro'

      await admin.from('users').update({
        plan,
        subscription_status: subscription.status,
      }).eq('id', user.id)

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: user } = await admin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!user) break

      await admin.from('users').update({
        plan: 'none',
        subscription_status: 'canceled',
      }).eq('id', user.id)

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: user } = await admin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user) {
        await admin.from('users').update({ subscription_status: 'past_due' }).eq('id', user.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
