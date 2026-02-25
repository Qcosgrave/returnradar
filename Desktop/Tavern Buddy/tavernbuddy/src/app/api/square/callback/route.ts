import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeSquareCode, getSquareLocations } from '@/lib/square'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error) {
    return NextResponse.redirect(`${appUrl}/onboarding?error=square_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/onboarding?error=square_missing_params`)
  }

  // Decode state to get userId
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    userId = decoded.userId
    if (!userId) throw new Error('No userId in state')
  } catch {
    return NextResponse.redirect(`${appUrl}/onboarding?error=square_invalid_state`)
  }

  try {
    const tokens = await exchangeSquareCode(code)

    // Get the first location
    const locations = await getSquareLocations(tokens.access_token)
    const locationId = locations[0]?.id || null

    const supabase = createAdminClient()

    // Save connection
    await supabase.from('square_connections').upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      merchant_id: tokens.merchant_id,
      location_id: locationId,
      expires_at: tokens.expires_at,
    })

    // Update user
    await supabase
      .from('users')
      .update({ square_connected: true })
      .eq('id', userId)

    return NextResponse.redirect(`${appUrl}/onboarding?step=3&square=connected`)
  } catch (err) {
    console.error('Square OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/onboarding?error=square_exchange_failed`)
  }
}
