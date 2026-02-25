'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Store, MapPin, Users, ArrowRight, Link2 } from 'lucide-react'

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
  { value: 'Australia/Melbourne', label: 'AEST (Melbourne)' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [barName, setBarName] = useState('')
  const [location, setLocation] = useState('')
  const [staffCount, setStaffCount] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth/login')
        return
      }
      setUserId(data.user.id)
    })
    // Detect timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (TIMEZONES.find((t) => t.value === tz)) setTimezone(tz)
  }, [])

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    if (!barName.trim()) {
      toast.error('Please enter your bar name')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        bar_name: barName.trim(),
        location: location.trim(),
        timezone,
        onboarding_complete: false,
      })

    if (error) {
      toast.error('Failed to save info: ' + error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setStep(2)
  }

  async function handleConnectSquare() {
    setLoading(true)
    try {
      const res = await fetch('/api/square/auth-url')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      toast.error('Failed to start Square connection')
      setLoading(false)
    }
  }

  async function handleSkipSquare() {
    setStep(3)
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-extrabold">
            <span className="text-amber-400">Tavern</span>
            <span className="text-slate-100">buddy</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full transition-colors ${s <= step ? 'bg-amber-500' : 'bg-[#2d3748]'}`} />
            </div>
          ))}
        </div>

        {/* Step 1: Bar info */}
        {step === 1 && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Tell us about your bar</h1>
            <p className="text-slate-400 text-sm mb-8">We&apos;ll use this to personalize your reports.</p>

            <form onSubmit={handleSaveInfo} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-400" />
                  Bar / Pub name *
                </label>
                <input
                  type="text"
                  required
                  value={barName}
                  onChange={(e) => setBarName(e.target.value)}
                  placeholder="The Rusty Anchor"
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  City, State
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Chicago, IL"
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  Approximate number of staff
                </label>
                <select
                  value={staffCount}
                  onChange={(e) => setStaffCount(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">Select range</option>
                  <option value="1-5">1–5 staff</option>
                  <option value="6-10">6–10 staff</option>
                  <option value="11-20">11–20 staff</option>
                  <option value="20+">20+ staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Your timezone (for 8am Monday delivery)
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#0f1117] font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Connect Square */}
        {step === 2 && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Connect your Square account</h1>
            <p className="text-slate-400 text-sm mb-8">
              Tavernbuddy pulls your sales data nightly to generate insights. We only read your data — we never modify anything.
            </p>

            <div className="bg-[#0f1117] border border-[#2d3748] rounded-xl p-5 mb-6 space-y-3">
              {[
                'Transaction history & sales data',
                'Item-level sales (what\'s selling)',
                'Employee sales attribution',
                'No payment card data — ever',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={handleConnectSquare}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#0f1117] font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Connect Square Account
            </button>
            <button
              onClick={handleSkipSquare}
              className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
            >
              Skip for now — I&apos;ll connect later
            </button>
          </div>
        )}

        {/* Step 3: Choose plan / billing */}
        {step === 3 && (
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Choose your plan</h1>
            <p className="text-slate-400 text-sm mb-8">Start with a 14-day free trial. Cancel anytime.</p>

            <div className="space-y-4 mb-6">
              <PlanCard
                name="Starter"
                price="$99/mo"
                description="Weekly AI reports every Monday"
                features={['Weekly email reports', 'Revenue & item analytics', 'Staff performance', 'Dashboard access']}
                planKey="starter"
                userId={userId}
              />
              <PlanCard
                name="Pro"
                price="$249/mo"
                description="Reports + unlimited AI chat"
                features={['Everything in Starter', 'Ask Tavernbuddy chat', 'On-demand data queries', 'Priority support']}
                planKey="pro"
                userId={userId}
                featured
              />
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
            >
              Skip billing — explore dashboard first
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PlanCard({
  name,
  price,
  description,
  features,
  planKey,
  userId,
  featured,
}: {
  name: string
  price: string
  description: string
  features: string[]
  planKey: string
  userId: string | null
  featured?: boolean
}) {
  const [loading, setLoading] = useState(false)

  async function handleSelect() {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      toast.error('Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <div
      className={`border rounded-xl p-5 cursor-pointer transition-colors ${
        featured ? 'border-amber-500 bg-amber-500/5' : 'border-[#2d3748] hover:border-[#4a5568]'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100">{name}</span>
            {featured && (
              <span className="bg-amber-500 text-[#0f1117] text-xs font-bold px-2 py-0.5 rounded-full">Popular</span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-0.5">{description}</p>
        </div>
        <span className="font-bold text-amber-400">{price}</span>
      </div>
      <ul className="space-y-1.5 mb-4">
        {features.map((f) => (
          <li key={f} className="text-xs text-slate-400 flex items-center gap-1.5">
            <div className="w-1 h-1 bg-amber-400 rounded-full" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={handleSelect}
        disabled={loading}
        className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
          featured
            ? 'bg-amber-500 hover:bg-amber-400 text-[#0f1117]'
            : 'bg-[#2d3748] hover:bg-[#374151] text-slate-100'
        }`}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Start free trial
      </button>
    </div>
  )
}

