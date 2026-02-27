import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
})

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: [
      'Weekly AI insights reports',
      'Email delivery every Monday',
      'Revenue & item analytics',
      'Staff performance tracking',
    ],
  },
  pro: {
    name: 'Pro',
    price: 249,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Everything in Starter',
      'Ask Tavernbuddy chat (unlimited)',
      'On-demand data queries',
      'Historical trend analysis',
      'Priority support',
    ],
  },
}

export async function createStripeCustomer(email: string, name: string) {
  return stripe.customers.create({ email, name })
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
      trial_period_days: 14,
    },
  })
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
