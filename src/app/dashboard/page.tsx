'use client'

import { BarChart3, Send, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const kpis = [
  { label: 'íì± ìº íì¸', value: '12', change: '+3', up: true, icon: <BarChart3 size={20} /> },
  { label: 'ì´ ë°ì  ê±´ì', value: '847,293', change: '+12.4%', up: true, icon: <Send size={20} /> },
  { label: 'íê·  ì íì¨', value: '7.7%', change: '+0.8%p', up: true, icon: <TrendingUp size={20} /> },
  { label: 'ì´ë² ë¬ ë¹ì©', value: 'â©34.2M', change: '-5.2%', up: false, icon: <Wallet size={20} /> },
]

const recentCampaigns = [
  { name: 'ì¬ë¶ì  Entresto Phase III', segment: 'ì¬ë¶ì  HFrEF 40~80ì¸', sent: 4217, converted: 324, rate: '7.7%', cost: 'â©168,680', status: 'íì±' },
  { name: 'íì í¤í¸ë£¨ë¤ Phase III', segment: 'NSCLC Stage III-IV', sent: 2156, converted: 147, rate: '6.8%', cost: 'â©107,800', status: 'íì±' },
  { name: 'ê±´ê¸°ì ë£¨íì¸ í¨ë¥ì°êµ¬', segment: '40ë+ ìêµ¬ê±´ì¡°', sent: 8420, converted: 1263, rate: '15.0%', cost: 'â©126,300', status: 'íì±' },
  { name: 'ë¹ë¨ SGLT2i ìííì¡°ì¬', segment: 'ì 2í ë¹ë¨ 50~70ì¸', sent: 3420, converted: 53, rate: '1.5%', cost: 'â©51,300', status: 'ìµì í ì¤' },
  { name: 'ë³ì ê±´ê°ì²ì§ íë¡ëª¨ì', segment: 'ìì¸/ê²½ê¸° 30~60ì¸', sent: 15230, converted: 2437, rate: '16.0%', cost: 'â©228,450', status: 'ìë£' },
]

const pendingApprovals = [
  { name: 'ê³ íì ARB ë¹êµì°êµ¬ ìº íì¸', requester: 'ê¹ì°êµ¬ì', date: '2026-03-27' },
  { name: 'ìí í¼ ìë¬¼íì ì ì  ëª¨ì§', requester: 'ë°ë§¤ëì ', date: '2026-03-28' },
]

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">ëìë³´ë</h1>
        <p className="text-sm text-slate-500 mt-1">Green-RWD íë«í¼ íí©ì íëì íì¸íì¸ì</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {kpi.icon}
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-success' : 'text-danger'}`}>
                {kpi.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-navy">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-[15px]">ìµê·¼ ìº íì¸ ì±ê³¼</h2>
            <a href="/green-rwd/dashboard/campaigns/" className="text-xs text-primary hover:underline">ì ì²´ ë³´ê¸° â</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-50">
                  <th className="text-left px-5 py-3 font-medium">ìº íì¸</th>
                  <th className="text-right px-3 py-3 font-medium">ë°ì¡</th>
                  <th className="text-right px-3 py-3 font-medium">ì í</th>
                  <th className="text-right px-3 py-3 font-medium">ì íì¨</th>
                  <th className="text-right px-3 py-3 font-medium">ë¹ì©</th>
                  <th className="text-center px-3 py-3 font-medium">ìí</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map(c => (
                  <tr key={c.name} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy text-[13px]">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.segment}</p>
                    </td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{c.sent.toLocaleString()}</td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{c.converted.toLocaleString()}</td>
                    <td className="text-right px-3 py-3 text-[13px] font-semibold text-primary tabular-nums">{c.rate}</td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{c.cost}</td>
                    <td className="text-center px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        c.status === 'íì±' ? 'bg-success/10 text-success' :
                        c.status === 'ìë£' ? 'bg-slate-100 text-slate-500' :
                        'bg-accent/10 text-accent'
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending + Quick Actions */}
        <div className="space-y-5">
          {/* Pending Approvals */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-[15px]">ì¹ì¸ ëê¸°</h2>
            </div>
            <div className="p-4 space-y-3">
              {pendingApprovals.map(a => (
                <div key={a.name} className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-navy truncate">{a.name}</p>
                    <p className="text-[11px] text-slate-400">{a.requester} Â· {a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sending Volume Chart (CSS bars) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-[15px] mb-4">ìµê·¼ 7ì¼ ë°ì¡ë</h2>
            <div className="flex items-end gap-2 h-[120px]">
              {[65, 78, 92, 45, 88, 72, 95].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                    style={{ height: `${v}%` }}
                  />
                  <span className="text-[10px] text-slate-400">
                    {['ì','í','ì','ëª©','ê¸','í ','ì¼'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
