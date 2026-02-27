import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

export function buildWeeklyReportEmail(
  barName: string,
  ownerEmail: string,
  weekStart: string,
  weekEnd: string,
  reportHtml: string,
  dashboardUrl: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Weekly Report — Tavernbuddy</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e2e8f0; }
  .container { max-width: 620px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 40px; }
  .logo { font-size: 28px; font-weight: 800; color: #f59e0b; letter-spacing: -0.5px; }
  .logo span { color: #e2e8f0; }
  .tagline { color: #64748b; font-size: 14px; margin-top: 4px; }
  .week-badge { display: inline-block; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 6px 16px; font-size: 13px; color: #94a3b8; margin-top: 16px; }
  .card { background: #1a1f2e; border: 1px solid #2d3748; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
  .card h2 { font-size: 18px; font-weight: 700; color: #f59e0b; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #2d3748; }
  .card p { color: #cbd5e1; line-height: 1.7; font-size: 15px; margin-bottom: 12px; }
  .card p:last-child { margin-bottom: 0; }
  .card strong { color: #f1f5f9; font-weight: 600; }
  .cta { text-align: center; margin: 32px 0; }
  .btn { display: inline-block; background: #f59e0b; color: #0f1117; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; }
  .footer { text-align: center; color: #475569; font-size: 13px; margin-top: 40px; line-height: 1.6; }
  .footer a { color: #64748b; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">Tavern<span>buddy</span></div>
    <div class="tagline">Your bar's weekly intelligence report</div>
    <div class="week-badge">Week of ${weekStart} — ${weekEnd}</div>
  </div>

  <div style="background: #1a1f2e; border: 1px solid #f59e0b33; border-radius: 12px; padding: 20px 32px; margin-bottom: 24px;">
    <p style="color: #94a3b8; font-size: 14px; margin: 0;">Hey ${barName} 👋 Here's what happened at your bar this week. Grab a coffee.</p>
  </div>

  ${reportHtml
    .replace(/<h2>/g, '</div><div class="card"><h2>')
    .replace(/<\/h2>/g, '</h2>')
    .replace(/^<\/div>/, '')
    + '</div>'}

  <div class="cta">
    <a href="${dashboardUrl}" class="btn">View Full Report in Dashboard →</a>
  </div>

  <div class="footer">
    <p>You're receiving this because you're a Tavernbuddy subscriber.</p>
    <p style="margin-top: 8px;"><a href="${dashboardUrl}/settings">Manage preferences</a> · <a href="${dashboardUrl}/settings">Unsubscribe</a></p>
    <p style="margin-top: 16px; color: #334155;">Tavernbuddy — Built for bar owners, by people who love bars.</p>
  </div>
</div>
</body>
</html>`
}

export async function sendWeeklyReport(
  to: string,
  barName: string,
  weekStart: string,
  weekEnd: string,
  reportHtml: string,
  dashboardUrl: string
) {
  const html = buildWeeklyReportEmail(barName, to, weekStart, weekEnd, reportHtml, dashboardUrl)

  return resend.emails.send({
    from: 'Tavernbuddy <reports@tavernbuddy.com>',
    to,
    subject: `📊 Your Weekly Bar Report — ${weekStart} to ${weekEnd}`,
    html,
  })
}
