import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  // Initialize user record if it doesn't exist
  if (!userData) {
    await admin.from('users').insert({
      id: user.id,
      plan: 'none',
      subscription_status: 'none',
      square_connected: false,
      onboarding_complete: false,
    })
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex">
      <DashboardNav user={userData || { id: user.id, email: user.email }} email={user.email || ''} />
      <main className="flex-1 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  )
}
