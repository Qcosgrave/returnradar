import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { answerBarQuestion } from '@/lib/claude'
import { getContextForQuestion } from '@/lib/data'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Check plan — only Pro users can chat
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (userData.plan !== 'pro' && userData.subscription_status !== 'trialing') {
    return NextResponse.json(
      { error: 'Ask Tavernbuddy requires the Pro plan', upgrade: true },
      { status: 403 }
    )
  }

  const { message, sessionId } = await request.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Get conversation history (last 10 messages for this session)
  const { data: history } = await admin
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const conversationHistory = (history || [])
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // Save user message
  await admin.from('chat_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  // Get relevant context data
  const contextData = await getContextForQuestion(user.id, message)

  // Generate answer
  const barName = userData.bar_name || 'Your Bar'
  const answer = await answerBarQuestion(
    message,
    user.id,
    barName,
    contextData,
    conversationHistory
  )

  // Save assistant response
  await admin.from('chat_messages').insert({
    user_id: user.id,
    role: 'assistant',
    content: answer,
  })

  return NextResponse.json({ answer })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: messages } = await admin
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  return NextResponse.json({ messages: messages || [] })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  await admin.from('chat_messages').delete().eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
