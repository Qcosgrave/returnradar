import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { FileText, Calendar, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { SAMPLE_REPORT_HTML } from '@/lib/sample-data'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: reports } = await admin
    .from('weekly_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })

  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  // Show sample report if no real reports
  const showSample = !reports || reports.length === 0

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Weekly Reports</h1>
        <p className="text-slate-400 mt-1">Your AI-generated business intelligence, every Monday.</p>
      </div>

      {showSample ? (
        <div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-sm font-medium">Your first report arrives next Monday at 8am</p>
              <p className="text-amber-300/60 text-xs mt-0.5">Below is a sample report so you know what to expect.</p>
            </div>
          </div>
          <SampleReport barName={userData?.bar_name} />
        </div>
      ) : (
        <>
          {/* First report — fully expanded */}
          <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl mb-6 overflow-hidden">
            <div className="border-b border-[#2d3748] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="font-semibold text-slate-100 text-sm">
                    Week of {formatDate(reports[0].week_start)} — {formatDate(reports[0].week_end)}
                  </p>
                  <p className="text-slate-500 text-xs">Generated {formatDate(reports[0].generated_at)}</p>
                </div>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">LATEST</span>
            </div>
            <div
              className="p-6 prose-report"
              dangerouslySetInnerHTML={{ __html: reports[0].report_html }}
            />
          </div>

          {/* Archived reports */}
          {reports.length > 1 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Archive</h2>
              <div className="space-y-2">
                {reports.slice(1).map((report) => (
                  <details key={report.id} className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden group">
                    <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-[#2d3748]/30 transition-colors list-none">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-200 text-sm">
                            Week of {formatDate(report.week_start)} — {formatDate(report.week_end)}
                          </p>
                          <p className="text-slate-500 text-xs">Generated {formatDate(report.generated_at)}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div
                      className="px-6 pb-6 pt-2 prose-report border-t border-[#2d3748]"
                      dangerouslySetInnerHTML={{ __html: report.report_html }}
                    />
                  </details>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SampleReport({ barName }: { barName?: string }) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
      <div className="border-b border-[#2d3748] px-6 py-4 flex items-center gap-3">
        <FileText className="w-4 h-4 text-slate-500" />
        <div>
          <p className="font-semibold text-slate-200 text-sm">Sample Report — Week of Feb 17–23</p>
          <p className="text-slate-500 text-xs">This is what your Monday reports will look like</p>
        </div>
        <span className="ml-auto text-xs bg-[#2d3748] text-slate-400 px-2 py-0.5 rounded-full">SAMPLE</span>
      </div>
      <div
        className="p-6 prose-report"
        dangerouslySetInnerHTML={{ __html: SAMPLE_REPORT_HTML.replace('The Sample Bar', barName || 'Your Bar') }}
      />
    </div>
  )
}
