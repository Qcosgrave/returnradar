'use client'

import { useState } from 'react'
import { Link2, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SquareBanner() {
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleConnect() {
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

  return (
    <div className="bg-[#1a1f2e] border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
      <Link2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-slate-200 font-semibold text-sm">Connect your Square account to see real data</p>
        <p className="text-slate-400 text-xs mt-0.5 mb-3">
          We&apos;re showing sample data. Connect Square to sync your actual sales.
        </p>
        <button
          onClick={handleConnect}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
          Connect Square
        </button>
      </div>
      <button onClick={() => setDismissed(true)} className="text-slate-600 hover:text-slate-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
