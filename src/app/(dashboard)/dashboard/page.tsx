'use client'

import { BarChart3, Send, TrendingUp, Wallet, Plus, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'
import KpiCard from '@/components/ui/KpiCard'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Header from '@/components/layout/Header'
import { useApi } from '@/hooks/use-api'

/** 대시보드 KPI 데이터 타입 */
interface DashboardData {
  kpis: {
    activeCampaigns: number
    totalSent: number
    avgConversionRate: number
    monthCost: number
    changes: {
      activeCampaigns: string
      totalSent: string
      avgConversionRate: string
      monthCost: string
    }
  }
  recentCampaigns: Array<{
    id: string
    name: string
    segmentName?: string
    totalSent: number
    totalConverted: number
    conversionRate: number
    totalCost: number
    status: string
  }>
  pendingApprovals: Array<{
    id: string
    name: string
    requesterName: string
    createdAt: string
  }>
}

interface ChartData {
  labels: string[]
  data: number[]
}

/** 숫자 포맷 헬퍼 */
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return n.toLocaleString()
  return String(n)
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `₩${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₩${(n / 1_000).toFixed(0)}K`
  return `₩${n}`
}

/** 상태 텍스트 변환 */
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    DRAFT: '초안', EXECUTING: '활성', COMPLETED: '완료', PAUSED: '일시중지',
    SCHEDULED: '예약됨', PENDING_APPROVAL: '승인대기', APPROVED: '승인', CANCELLED: '취소',
  }
  return map[s] || s
}

function statusVariant(s: string): 'success' | 'warning' | 'danger' | 'default' {
  if (s === 'EXECUTING' || s === 'APPROVED') return 'success'
  if (s === 'COMPLETED') return 'default'
  if (s === 'PAUSED' || s === 'PENDING_APPROVAL' || s === 'DRAFT') return 'warning'
  if (s === 'CANCELLED' || s === 'FAILED') return 'danger'
  return 'default'
}

/** 폴백 목데이터 */
const fallbackKpis = [
  { label: '활성 캠페인', value: '-', change: '-', up: true, icon: <BarChart3 size={20} /> },
  { label: '총 발송 건수', value: '-', change: '-', up: true, icon: <Send size={20} /> },
  { label: '평균 전환율', value: '-', change: '-', up: true, icon: <TrendingUp size={20} /> },
  { label: '이번 달 비용', value: '-', change: '-', up: false, icon: <Wallet size={20} /> },
]

export default function DashboardPage() {
  const { data, loading, error } = useApi<DashboardData>('/api/dashboard')
  const { data: chartData } = useApi<ChartData>('/api/dashboard/chart', { period: '7d' })

  // KPI 카드 데이터 구성
  const kpis = data ? [
    { label: '활성 캠페인', value: String(data.kpis.activeCampaigns), change: data.kpis.changes.activeCampaigns, up: !data.kpis.changes.activeCampaigns.startsWith('-'), icon: <BarChart3 size={20} /> },
    { label: '총 발송 건수', value: formatNumber(data.kpis.totalSent), change: data.kpis.changes.totalSent, up: !data.kpis.changes.totalSent.startsWith('-'), icon: <Send size={20} /> },
    { label: '평균 전환율', value: `${data.kpis.avgConversionRate.toFixed(1)}%`, change: data.kpis.changes.avgConversionRate, up: !data.kpis.changes.avgConversionRate.startsWith('-'), icon: <TrendingUp size={20} /> },
    { label: '이번 달 비용', value: formatCurrency(data.kpis.monthCost), change: data.kpis.changes.monthCost, up: data.kpis.changes.monthCost.startsWith('-'), icon: <Wallet size={20} /> },
  ] : fallbackKpis

  const campaigns = data?.recentCampaigns || []
  const approvals = data?.pendingApprovals || []
  const chartValues = chartData?.data || [65, 78, 92, 45, 88, 72, 95]
  const chartLabels = chartData?.labels || ['월','화','수','목','금','토','일']
  const maxChart = Math.max(...chartValues, 1)

  return (
    <div className="p-8">
      <Header
        title="대시보드"
        description="Green-RWD 플랫폼 현황을 한눈에 확인하세요"
        actions={
          <Link href="/campaigns/new">
            <Button size="md"><Plus size={16} />새 캠페인</Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {kpis.map(kpi => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다: {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <div className="col-span-2">
          <Card padding="none">
            <CardHeader>
              <CardTitle>최근 캠페인 성과</CardTitle>
              <Link href="/campaigns" className="text-xs text-primary hover:underline">전체 보기 →</Link>
            </CardHeader>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                아직 캠페인이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-50">
                      <th className="text-left px-5 py-3 font-medium">캠페인</th>
                      <th className="text-right px-3 py-3 font-medium">발송</th>
                      <th className="text-right px-3 py-3 font-medium">전환</th>
                      <th className="text-right px-3 py-3 font-medium">전환율</th>
                      <th className="text-right px-3 py-3 font-medium">비용</th>
                      <th className="text-center px-3 py-3 font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer">
                        <td className="px-5 py-3">
                          <Link href={`/campaigns/${c.id}`}>
                            <p className="font-medium text-navy text-[13px]">{c.name}</p>
                            {c.segmentName && <p className="text-[11px] text-slate-400">{c.segmentName}</p>}
                          </Link>
                        </td>
                        <td className="text-right px-3 py-3 text-[13px] tabular-nums">{c.totalSent.toLocaleString()}</td>
                        <td className="text-right px-3 py-3 text-[13px] tabular-nums">{c.totalConverted.toLocaleString()}</td>
                        <td className="text-right px-3 py-3 text-[13px] font-semibold text-primary tabular-nums">{c.conversionRate.toFixed(1)}%</td>
                        <td className="text-right px-3 py-3 text-[13px] tabular-nums">{formatCurrency(c.totalCost)}</td>
                        <td className="text-center px-3 py-3">
                          <Badge variant={statusVariant(c.status)}>
                            {statusLabel(c.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Pending Approvals */}
          <Card padding="none">
            <CardHeader><CardTitle>승인 대기</CardTitle></CardHeader>
            <div className="p-4 space-y-3">
              {approvals.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-4">대기 중인 승인 요청이 없습니다.</p>
              ) : (
                approvals.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-navy truncate">{a.name}</p>
                      <p className="text-[11px] text-slate-400">{a.requesterName} · {new Date(a.createdAt).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Weekly Chart */}
          <Card>
            <h3 className="font-semibold text-[15px] mb-4">최근 7일 발송량</h3>
            <div className="flex items-end gap-2 h-[120px]">
              {chartValues.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                    style={{ height: `${(v / maxChart) * 100}%` }}
                  />
                  <span className="text-[10px] text-slate-400">{chartLabels[i] || ''}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="font-semibold text-[15px] mb-3">빠른 실행</h3>
            <div className="space-y-2">
              <Link href="/campaigns/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Plus size={16} className="text-primary" /></div>
                <span className="text-[13px] font-medium text-navy">새 캠페인 만들기</span>
              </Link>
              <Link href="/market" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Eye size={16} className="text-accent" /></div>
                <span className="text-[13px] font-medium text-navy">시장보고서 검색</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
