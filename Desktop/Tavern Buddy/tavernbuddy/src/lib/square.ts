import { createAdminClient } from '@/lib/supabase/admin'

const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const SQUARE_BASE_URL =
  SQUARE_ENV === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'

export const SQUARE_OAUTH_URL =
  SQUARE_ENV === 'production'
    ? 'https://connect.squareup.com/oauth2/authorize'
    : 'https://connect.squareupsandbox.com/oauth2/authorize'

export function getSquareAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SQUARE_APPLICATION_ID!,
    scope: [
      'MERCHANT_PROFILE_READ',
      'PAYMENTS_READ',
      'ORDERS_READ',
      'ITEMS_READ',
      'EMPLOYEES_READ',
      'TIMECARDS_READ',
    ].join('+'),
    session: 'false',
    state,
  })
  return `${SQUARE_OAUTH_URL}?${params.toString()}`
}

export async function exchangeSquareCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: string
  merchant_id: string
}> {
  const res = await fetch(`${SQUARE_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2024-01-17' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/square/callback`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Square OAuth exchange failed: ${err}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    merchant_id: data.merchant_id,
  }
}

export async function refreshSquareToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: string
}> {
  const res = await fetch(`${SQUARE_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2024-01-17' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Square token refresh failed: ${err}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  }
}

export async function getSquareLocations(accessToken: string) {
  const res = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': '2024-01-17',
    },
  })
  if (!res.ok) throw new Error('Failed to fetch Square locations')
  const data = await res.json()
  return data.locations || []
}

export async function fetchSquareTransactions(
  accessToken: string,
  locationId: string,
  beginTime: string,
  endTime: string
) {
  const allOrders: any[] = []
  let cursor: string | undefined

  do {
    const body: any = {
      location_ids: [locationId],
      query: {
        filter: {
          date_time_filter: {
            created_at: { start_at: beginTime, end_at: endTime },
          },
          state_filter: { states: ['COMPLETED'] },
        },
        sort: { sort_field: 'CREATED_AT', sort_order: 'ASC' },
      },
      limit: 500,
    }
    if (cursor) body.cursor = cursor

    const res = await fetch(`${SQUARE_BASE_URL}/v2/orders/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-17',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Square orders search failed: ${errText}`)
    }

    const data = await res.json()
    allOrders.push(...(data.orders || []))
    cursor = data.cursor
  } while (cursor)

  return allOrders
}

export async function fetchSquareEmployees(accessToken: string) {
  const res = await fetch(`${SQUARE_BASE_URL}/v2/team-members?status=ACTIVE`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': '2024-01-17',
    },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.team_members || []
}

// Get or refresh a valid access token for a user
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: conn, error } = await supabase
    .from('square_connections')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !conn) return null

  const expiresAt = new Date(conn.expires_at)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000 // 5 minutes

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return conn.access_token
  }

  // Refresh the token
  try {
    const refreshed = await refreshSquareToken(conn.refresh_token)
    await supabase
      .from('square_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
      })
      .eq('user_id', userId)

    return refreshed.access_token
  } catch (err) {
    console.error('Failed to refresh Square token for user', userId, err)
    return null
  }
}
