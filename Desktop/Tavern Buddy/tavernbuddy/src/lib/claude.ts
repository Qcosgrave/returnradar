import Anthropic from '@anthropic-ai/sdk'
import { WeeklyData } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateWeeklyReport(
  data: WeeklyData,
  barName: string
): Promise<{ html: string; text: string }> {
  const systemPrompt = `You are Tavernbuddy, an AI analyst for bars and pubs. You write weekly business reports that are friendly, specific, and actionable — like advice from a savvy friend who happens to know everything about your bar's numbers. Always use specific numbers from the data. Be conversational but professional. Use "you" and "your bar." Keep it punchy — no fluff.`

  const userPrompt = `Generate a weekly business report for ${barName} based on this data:

WEEK: ${data.weekStart} to ${data.weekEnd}

OVERALL:
- Total Revenue: $${(data.totalRevenue / 100).toFixed(2)}
- Transactions: ${data.transactionCount}
- Average Tab: $${(data.avgTab / 100).toFixed(2)}
- Previous 4-week avg tab: $${(data.prevAvgTab / 100).toFixed(2)}

TOP ITEMS BY REVENUE:
${data.topItems
  .slice(0, 5)
  .map((i) => `- ${i.name}: $${(i.revenue / 100).toFixed(2)} (${i.quantity} sold)`)
  .join('\n')}

TOP STAFF BY AVG TAB:
${data.topStaff
  .slice(0, 3)
  .map((s) => `- ${s.name}: $${(s.avgTab / 100).toFixed(2)} avg tab (${s.transactions} orders)`)
  .join('\n')}

REVENUE BY DAY:
${data.revenueByDay
  .map((d) => `- ${d.date}: $${(d.revenue / 100).toFixed(2)} (${d.transactions} transactions)`)
  .join('\n')}

VOIDS: ${data.voids} | DISCOUNTS: $${(data.discounts / 100).toFixed(2)}

Write the report with these EXACT sections (use HTML formatting):

1. **What happened last week** — 2-3 sentences on overall performance vs average
2. **What's working** — Top items and staff highlights with specific numbers
3. **What to fix** — 1-2 specific, actionable recommendations based on the data
4. **Weekend forecast** — Based on patterns in the data, what to expect and prep for

Format as clean HTML with: h2 for section titles, p tags for paragraphs, strong for key numbers. No CSS classes needed — just semantic HTML. Start directly with the first h2, no intro paragraph.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const html = text

  return { html, text: stripHtml(text) }
}

export async function answerBarQuestion(
  question: string,
  userId: string,
  barName: string,
  contextData: Record<string, unknown>,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const systemPrompt = `You are Tavernbuddy, an AI analyst for ${barName}. You answer questions about the bar's business data in plain English. Be specific with numbers, be concise, and be friendly. If you don't have enough data to answer definitively, say so and explain what you can see. Never make up numbers — only use what's in the provided data context.`

  const dataContext = `AVAILABLE DATA FOR ${barName.toUpperCase()}:
${JSON.stringify(contextData, null, 2)}

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory,
    {
      role: 'user',
      content: `DATA CONTEXT:\n${dataContext}\n\nQUESTION: ${question}`,
    },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systemPrompt,
    messages,
  })

  return response.content[0].type === 'text' ? response.content[0].text : 'Unable to generate response.'
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}
