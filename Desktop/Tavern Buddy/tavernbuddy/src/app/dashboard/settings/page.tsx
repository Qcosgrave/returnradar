'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Settings, Link2, CreditCard, User, Loader2, CheckCircle, AlertCircle, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'GMT/BST (UK)' },
  { value: 'Europe/Dublin', label: 'Ireland Time' },
  { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
]

function SettingsContent() {
  const searchParams = useSearchParams()
  const showUpgrade = searchParams.get('upgrade') === 'true'

  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [barName, setBarName] = useState('')
  const [location, setLocation] = useState('')
  const [timezone, setTimezone] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [loadingConnect, setLoadingConnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then(({ user: u, email: e }) => {
        setUser(u)
        setEmail(e || '')
        setBarName(u?.bar_name || '')
        setLocation(u?.location || '')
        setTimezone(u?.timezone || 'America/New_York')
      })
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bar_name: barName, location, timezone }),
    })
    if (res.ok) toast.success('Profile saved')
    else toast.error('Failed to save')
    setSaving(false)
  }

  async function handleConnectSquare() {
    setLoadingConnect(true)
    const res = await fetch('/api/square/auth-url')
    const { url } = await res.json()
    window.location.href = url
  }

  async function handleDisconnectSquare() {
    if (!confirm('Disconnect Square? Your historical data will be preserved, but no new data will be synced.')) return
    setDisconnecting(true)
    await fetch('/api/square/disconnect', { method: 'POST' })
    toast.success('Square disconnected')
    setUser((prev: any) => ({ ...prev, square_connected: false }))
    setDisconnecting(false)
  }

  async function handleManageBilling() {
    setLoadingBilling(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
      else toast.error('No billing portal found. Please contact support.')
    } catch {
      toast.error('Failed to open billing portal')
    }
    setLoadingBilling(false)
  }

  async function handleUpgrade(plan: string) {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  const isPro = user?.plan === 'pro'
  const hasSubscription = user?.plan && user.plan !== 'none'

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your bar profile, integrations, and subscription.</p>
      </div>

      {/* Upgrade banner */}
      {showUpgrade && !isPro && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-amber-300 mb-1 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </h3>
          <p className="text-amber-300/70 text-sm mb-4">Get unlimited access to Ask Tavernbuddy and more.</p>
          <button
            onClick={() => handleUpgrade('pro')}
            className="bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Start Pro trial — $249/mo
          </button>
        </div>
      )}

      {/* Profile */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-amber-400" />
          Bar Profile
        </h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Account email</label>
            <input
              value={email}
              disabled
              className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-2.5 text-slate-400 text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Bar / Pub name</label>
            <input
              value={barName}
              onChange={(e) => setBarName(e.target.value)}
              placeholder="The Rusty Anchor"
              className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">City, State</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Chicago, IL"
              className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Timezone (for 8am report delivery)</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#0f1117] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save changes
          </button>
        </form>
      </div>

      {/* Square */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-400" />
          Square Integration
        </h2>
        {user.square_connected ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Square connected</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Your data syncs nightly. Historical data is preserved even if you disconnect.
            </p>
            <button
              onClick={handleDisconnectSquare}
              disabled={disconnecting}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Disconnect Square
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">Square not connected</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Connect your Square account to sync real sales data. We only read data — never modify anything.
            </p>
            <button
              onClick={handleConnectSquare}
              disabled={loadingConnect}
              className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loadingConnect ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Connect Square Account
            </button>
          </div>
        )}
      </div>

      {/* Billing */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6">
        <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-400" />
          Subscription & Billing
        </h2>
        {hasSubscription ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPro ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-300'}`}>
                {isPro ? '⭐ PRO' : 'STARTER'} plan
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                user.subscription_status === 'active' || user.subscription_status === 'trialing'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {user.subscription_status}
              </span>
            </div>
            {!isPro && (
              <div className="bg-[#0f1117] border border-[#2d3748] rounded-lg p-4 mb-4">
                <p className="text-slate-300 text-sm font-medium mb-1">Upgrade to Pro</p>
                <p className="text-slate-400 text-xs mb-3">Unlock Ask Tavernbuddy chat + unlimited data queries.</p>
                <button
                  onClick={() => handleUpgrade('pro')}
                  className="bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold text-sm px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade to Pro — $249/mo
                </button>
              </div>
            )}
            <button
              onClick={handleManageBilling}
              disabled={loadingBilling}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loadingBilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Manage billing & cancel
            </button>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-4">You don&apos;t have an active subscription. Start a trial to unlock reports.</p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => handleUpgrade('starter')}
                className="bg-[#2d3748] hover:bg-[#374151] text-slate-100 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                Starter — $99/mo
              </button>
              <button
                onClick={() => handleUpgrade('pro')}
                className="bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                Pro — $249/mo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}
