import Link from 'next/link'
import { BarChart3, Zap, MessageSquare, Mail, CheckCircle, ArrowRight, TrendingUp, Users, DollarSign } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Nav */}
      <nav className="border-b border-[#2d3748] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-extrabold">
            <span className="text-amber-400">Tavern</span>
            <span className="text-slate-100">buddy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-slate-400 hover:text-slate-100 text-sm transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Powered by Claude AI
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-100 leading-tight mb-6">
            Your bar&apos;s weekly{' '}
            <span className="text-amber-400">intelligence report,</span>
            <br />delivered every Monday.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect your Square POS. Every Monday at 8am, Tavernbuddy sends you a plain English report on what happened, what&apos;s working, and what to fix. No spreadsheets. No dashboards. Just answers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signup"
              className="bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold text-lg px-8 py-4 rounded-xl transition-colors inline-flex items-center gap-2"
            >
              Start your 14-day free trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-slate-500 text-sm">No credit card required to start</p>
          </div>
        </div>
      </section>

      {/* Sample report preview */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-slate-500 text-sm mb-6 font-medium uppercase tracking-wider">Example report</p>
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Monday 8:00 AM · From Tavernbuddy</p>
                <p className="text-sm font-semibold text-slate-200">📊 Your Weekly Bar Report — Feb 17 to Feb 23</p>
              </div>
            </div>
            <div className="space-y-5">
              {[
                {
                  title: 'What happened last week',
                  body: 'Strong week — you pulled in $18,475 across 480 transactions, with an average tab of $38.50. That\'s up 5.2% from your 4-week average, a healthy trend heading into the weekend.',
                  bold: ['$18,475', '480 transactions', '$38.50', '5.2%'],
                },
                {
                  title: "What's working",
                  body: 'Your Craft IPA Draft is an absolute workhorse — $2,486 in revenue from 142 pours. Marcus T. is your top performer with a $48.50 average tab on 148 tickets.',
                  bold: ['Craft IPA Draft', '$2,486', 'Marcus T.', '$48.50'],
                },
                {
                  title: 'What to fix',
                  body: 'Tuesday and Wednesday are dragging. You\'re doing $1,560–$1,980 on those days vs $3,980–4,675 on weekends. Consider a midweek special to pull in regulars.',
                  bold: ['Tuesday and Wednesday'],
                },
              ].map((s) => (
                <div key={s.title}>
                  <h3 className="text-amber-400 font-bold text-sm mb-2 pb-2 border-b border-[#2d3748]">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-100 mb-4">Everything you need to run smarter</h2>
          <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto">Built for bar owners who don&apos;t have time to stare at spreadsheets.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Mail,
                title: 'Monday Morning Reports',
                desc: 'AI-written weekly summaries delivered to your inbox at 8am in your timezone. Revenue, top items, staff performance, and weekend prep advice.',
              },
              {
                icon: MessageSquare,
                title: 'Ask Tavernbuddy',
                desc: '"Why were Fridays slow last month?" "Who is my best bartender?" Chat with your data anytime and get plain English answers. (Pro plan)',
              },
              {
                icon: BarChart3,
                title: 'Live Dashboard',
                desc: 'Last 7 days at a glance — revenue, average tab, top items, top staff. All your past reports archived and searchable.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6 card-hover">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 border-y border-[#2d3748]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { icon: DollarSign, value: 'Square POS', label: 'integration — connect in minutes' },
            { icon: TrendingUp, value: 'Every Monday', label: '8am report delivery, guaranteed' },
            { icon: Users, value: 'Claude AI', label: 'generates your insights automatically' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold text-amber-400 mb-1">{s.value}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-100 mb-4">Simple pricing</h2>
          <p className="text-slate-400 text-center mb-12">14-day free trial on all plans. Cancel anytime.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-2xl p-8">
              <h3 className="font-bold text-xl text-slate-100 mb-1">Starter</h3>
              <div className="text-4xl font-extrabold text-slate-100 mb-1">
                $99<span className="text-lg font-normal text-slate-400">/mo</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">Weekly reports to your inbox</p>
              <ul className="space-y-3 mb-8">
                {['Weekly AI insights report every Monday','Email delivery at 8am your timezone','Revenue & item analytics','Staff performance tracking','Dashboard with past reports'].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup?plan=starter" className="block text-center bg-[#2d3748] hover:bg-[#374151] text-slate-100 font-bold py-3 rounded-lg transition-colors">
                Start free trial
              </Link>
            </div>
            <div className="bg-[#1a1f2e] border-2 border-amber-500 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-[#0f1117] text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <h3 className="font-bold text-xl text-slate-100 mb-1">Pro</h3>
              <div className="text-4xl font-extrabold text-slate-100 mb-1">
                $249<span className="text-lg font-normal text-slate-400">/mo</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">Reports + unlimited AI chat</p>
              <ul className="space-y-3 mb-8">
                {['Everything in Starter','Ask Tavernbuddy chat (unlimited)','On-demand data queries','Historical trend analysis','Priority support'].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup?plan=pro" className="block text-center bg-amber-500 hover:bg-amber-400 text-[#0f1117] font-bold py-3 rounded-lg transition-colors">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2d3748] px-6 py-8 text-center text-slate-500 text-sm">
        <div className="mb-2">
          <span className="text-amber-400 font-bold">Tavern</span>
          <span className="text-slate-400 font-bold">buddy</span>
        </div>
        <p>Built for bar owners, by people who love bars. © {new Date().getFullYear()} Tavernbuddy</p>
      </footer>
    </div>
  )
}
