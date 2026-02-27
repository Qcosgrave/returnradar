import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ChatInterface from '@/components/dashboard/ChatInterface'
import { Crown, Lock } from 'lucide-react'
import Link from 'next/link'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  const isPro = userData?.plan === 'pro' || userData?.subscription_status === 'trialing'

  if (!isPro) {
    return (
      <div className="p-6 lg:p-8 pt-20 lg:pt-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-3">Ask Tavernbuddy is a Pro feature</h1>
          <p className="text-slate-400 mb-6 leading-relaxed">
            Upgrade to Pro to chat with your data anytime. Ask anything — &quot;Why were Fridays slow last month?&quot; — and get Claude-powered answers with your actual numbers.
          </p>
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 mb-6 text-left">
            {[
              'Unlimited questions about your data',
              'Historical trend analysis',
              'Staff performance deep-dives',
              'Seasonal pattern recognition',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-300 py-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/settings?upgrade=true"
            className="bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold px-6 py-3 rounded-xl transition-colors inline-block"
          >
            Upgrade to Pro — $249/mo
          </Link>
          <p className="text-slate-500 text-xs mt-3">14-day free trial included</p>
        </div>
      </div>
    )
  }

  // Load existing messages
  const { data: messages } = await admin
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  return (
    <div className="flex flex-col h-screen lg:h-screen pt-14 lg:pt-0">
      <div className="border-b border-[#2d3748] px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-bold text-slate-100">Ask Tavernbuddy</h1>
          <p className="text-slate-400 text-xs">Powered by Claude — ask anything about your bar&apos;s data</p>
        </div>
        <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <Crown className="w-3 h-3" />
          PRO
        </span>
      </div>
      <ChatInterface initialMessages={messages || []} barName={userData?.bar_name} />
    </div>
  )
}
