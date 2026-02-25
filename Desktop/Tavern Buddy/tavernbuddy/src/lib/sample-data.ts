import { DashboardMetrics, WeeklyData } from '@/types'

// Sample data for development / when Square isn't connected
export const SAMPLE_METRICS: DashboardMetrics = {
  revenue7d: 1847500, // in cents
  revenue7dChange: 12.3,
  avgTab7d: 3850, // in cents
  avgTab7dChange: 5.2,
  transactions7d: 480,
  topItems: [
    { name: 'Craft IPA Draft', revenue: 248600, quantity: 142 },
    { name: 'Whiskey Neat', revenue: 187200, quantity: 78 },
    { name: 'Cheeseburger', revenue: 156800, quantity: 52 },
    { name: 'House Red Wine', revenue: 134400, quantity: 96 },
    { name: 'Nachos', revenue: 112000, quantity: 56 },
  ],
  topStaff: [
    { name: 'Marcus T.', avgTab: 4850, transactions: 148 },
    { name: 'Sarah K.', avgTab: 4320, transactions: 162 },
    { name: 'Jake R.', avgTab: 3980, transactions: 170 },
  ],
  revenueByDay: [
    { date: 'Mon', revenue: 182000 },
    { date: 'Tue', revenue: 156000 },
    { date: 'Wed', revenue: 198000 },
    { date: 'Thu', revenue: 245000 },
    { date: 'Fri', revenue: 398000 },
    { date: 'Sat', revenue: 467500 },
    { date: 'Sun', revenue: 201000 },
  ],
}

export const SAMPLE_WEEKLY_DATA: WeeklyData = {
  weekStart: 'Feb 17, 2025',
  weekEnd: 'Feb 23, 2025',
  totalRevenue: 1847500,
  transactionCount: 480,
  avgTab: 3850,
  prevAvgTab: 3660,
  topItems: [
    { name: 'Craft IPA Draft', revenue: 248600, quantity: 142, category: 'Beer' },
    { name: 'Whiskey Neat', revenue: 187200, quantity: 78, category: 'Spirits' },
    { name: 'Cheeseburger', revenue: 156800, quantity: 52, category: 'Food' },
    { name: 'House Red Wine', revenue: 134400, quantity: 96, category: 'Wine' },
    { name: 'Nachos', revenue: 112000, quantity: 56, category: 'Food' },
  ],
  topStaff: [
    { name: 'Marcus T.', avgTab: 4850, transactions: 148, totalRevenue: 717800 },
    { name: 'Sarah K.', avgTab: 4320, transactions: 162, totalRevenue: 699840 },
    { name: 'Jake R.', avgTab: 3980, transactions: 170, totalRevenue: 676600 },
  ],
  revenueByDay: [
    { date: 'Mon Feb 17', revenue: 182000, transactions: 47 },
    { date: 'Tue Feb 18', revenue: 156000, transactions: 41 },
    { date: 'Wed Feb 19', revenue: 198000, transactions: 51 },
    { date: 'Thu Feb 20', revenue: 245000, transactions: 64 },
    { date: 'Fri Feb 21', revenue: 398000, transactions: 103 },
    { date: 'Sat Feb 22', revenue: 467500, transactions: 121 },
    { date: 'Sun Feb 23', revenue: 201000, transactions: 53 },
  ],
  hourlyBreakdown: [
    { hour: 11, revenue: 45000, transactions: 12 },
    { hour: 12, revenue: 89000, transactions: 23 },
    { hour: 13, revenue: 112000, transactions: 29 },
    { hour: 14, revenue: 78000, transactions: 20 },
    { hour: 15, revenue: 67000, transactions: 17 },
    { hour: 16, revenue: 134000, transactions: 35 },
    { hour: 17, revenue: 198000, transactions: 51 },
    { hour: 18, revenue: 267000, transactions: 69 },
    { hour: 19, revenue: 312000, transactions: 81 },
    { hour: 20, revenue: 289000, transactions: 75 },
    { hour: 21, revenue: 198000, transactions: 51 },
    { hour: 22, revenue: 134000, transactions: 35 },
    { hour: 23, revenue: 89000, transactions: 23 },
  ],
  voids: 8,
  discounts: 23400,
}

export const SAMPLE_REPORT_HTML = `
<h2>What happened last week</h2>
<p>Strong week for The Sample Bar — you pulled in <strong>$18,475</strong> across <strong>480 transactions</strong>, with an average tab of <strong>$38.50</strong>. That's up 5.2% from your 4-week average of $36.60, which is a healthy trend heading into the weekend rush.</p>
<p>Saturday was your powerhouse day at <strong>$4,675</strong> — nearly 3x your average weekday. Friday wasn't far behind at $3,980.</p>

<h2>What's working</h2>
<p>Your <strong>Craft IPA Draft</strong> is an absolute workhorse — $2,486 in revenue from 142 pours. That's your menu MVP right now. Pair it with your <strong>Cheeseburger</strong> and you've got a combo that's moving off the shelf.</p>
<p>On the staff side, <strong>Marcus T.</strong> is your top performer with a $48.50 average tab on 148 tickets. Whatever he's doing differently — upselling, timing, conversation — it's working. The gap between him and Jake is $8.70 per tab. Over a shift, that adds up.</p>

<h2>What to fix</h2>
<p><strong>Tuesday and Wednesday are dragging.</strong> You're doing $1,560 and $1,980 on those days vs $3,980–4,675 on your weekend days. Consider a midweek special — a happy hour extension or a themed night — to pull in regulars on slow nights.</p>
<p><strong>Watch your void count.</strong> Eight voids in a week isn't catastrophic, but at your volume it's worth a conversation with the team about order accuracy before the ticket gets to the POS.</p>

<h2>Weekend forecast</h2>
<p>Based on your patterns, expect <strong>Friday and Saturday to be your top nights</strong> again. Your Friday rush typically peaks between 7-9pm, so make sure you're staffed up by 6:30. Stock up on Craft IPA — you burned through 142 pours in 7 days. If last weekend is any guide, Saturday alone could hit $4,500+.</p>
`
