'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, FileText, MessageSquare, Settings, LogOut, Beer, Crown, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NavProps {
  user: any
  email: string
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/reports', label: 'Weekly Reports', icon: FileText },
  { href: '/dashboard/chat', label: 'Ask Tavernbuddy', icon: MessageSquare, pro: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardNav({ user, email }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isPro = user?.plan === 'pro'

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-[#2d3748]">
        <div className="text-xl font-extrabold">
          <span className="text-amber-400">Tavern</span>
          <span className="text-slate-100">buddy</span>
        </div>
        <div className="mt-2">
          {user?.bar_name ? (
            <p className="text-slate-300 font-medium text-sm truncate">{user.bar_name}</p>
          ) : (
            <p className="text-slate-500 text-sm">Setup your bar →</p>
          )}
          {user?.plan && user.plan !== 'none' && (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-1',
              isPro ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
            )}>
              {isPro && <Crown className="w-2.5 h-2.5" />}
              {user.plan.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const isLocked = item.pro && !isPro

          return (
            <Link
              key={item.href}
              href={isLocked ? '/dashboard/settings?upgrade=true' : item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#2d3748]',
                isLocked && 'opacity-60'
              )}
            >
              <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-amber-400' : '')} />
              {item.label}
              {isLocked && (
                <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded">
                  PRO
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User / sign out */}
      <div className="p-4 border-t border-[#2d3748]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
            <Beer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-[#2d3748] transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a1f2e] border-b border-[#2d3748] px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-extrabold">
          <span className="text-amber-400">Tavern</span>
          <span className="text-slate-100">buddy</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-400 hover:text-slate-100 p-1"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#0f1117]/80" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile nav drawer */}
      <div className={cn(
        'lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#1a1f2e] border-r border-[#2d3748] flex flex-col transform transition-transform pt-14',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#1a1f2e] border-r border-[#2d3748] shrink-0 sticky top-0 h-screen">
        <NavContent />
      </aside>
    </>
  )
}
