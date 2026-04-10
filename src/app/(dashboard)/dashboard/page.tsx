'use client'

import { BarChart3, Send, TrendingUp, Wallet, Plus, Eye, Loader2, FileText, Users, Activity, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import KpiCard from '@/components/ui/KpiCard'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Header from '@/components/layout/Header'
import { useApi } from '@/hooks/use-api'

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
  platformStats: {
    totalReports: number
    totalSegments: number
    totalPatients: number
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
  recentReports: Array<{
    id: string
    title: string
    slug: string
    category: string
    marketSize: string
    patientPool: string
    createdAt: string
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

const categoryColors: Record<string, string> = {
  '종양/항암': 'bg-red-100 text-red-700',
  '대사질환': 'bg-orange-100 text-orange-700',
  '자가면역': 'bg-purple-100 text-purple-700',
  '신경질환': 'bg-blue-100 text-blue-700',
  '바이오의약품': 'bg-teal-100 text-teal-700',
  '디지털헬스': 'bg-cyan-100 text-cyan-700',
  '건기식': 'bg-green-100 text-green-700',
  '건강기능식품': 'bg-green-100 text-green-700',
  '심혈관': 'bg-rose-100 text-rose-700',
}

export default function DashboardPage() {
  const { data, loading, error } = useApi<DashboardData>('/api/dashboard')
  const { data: chartData } = useApi<ChartData>('/api/dashboard/chart', { period: '7d' })

  const stats = data?.platformStats
  const hasCampaigns = (data?.kpis?.activeCampaigns ?? 0) > 0 || (data?.kpis?.totalSent ?? 0) > 0

  // 캠페인이 있으면 캠페인 KPI, 없으면 플랫폼 통계를 보여줌
  const kpis = hasCampaigns && data?.kpis ? [
    { label: '활성 캠페인', value: String(data.kpis.activeCampaigns ?? 0), change: data.kpis.changes?.activeCampaigns ?? '+0%', up: true, icon: <BarChart3 size={20} /> },
    { label: '총 발송 건수', value: formatNumber(data.kpis.totalSent ?? 0), change: data.kpis.changes?.totalSent ?? '+0%', up: true, icon: <Send size={20} /> },
    { label: '평균 전환율', value: `${(data.kpis.avgConversionRate ?? 0).toFixed(1)}%`, change: data.kpis.changes?.avgConversionRate ?? '+0%', up: true, icon: <TrendingUp size={20} /> },
    { label: '이번 달 비용', value: formatCurrency(data.kpis.monthCost ?? 0), change: data.kpis.changes?.monthCost ?? '+0%', up: true, icon: <Wallet size={20} /> },
  ] : [
    { label: '시장보고서', value: String(stats?.totalReports ?? 0), change: '누적', up: true, icon: <FileText size={20} /> },
    { label: '활성 세그먼트', value: String(stats?.totalSegments ?? 0), change: '활성', up: true, icon: <Users size={20} /> },
    { label: '총 환자 풀', value: formatNumber(stats?.totalPatients ?? 0), change: 'RWD 기반', up: true, icon: <Activity size={20} /> },
    { label: '활성 캠페인', value: '0', change: '시작 전', up: true, icon: <Send size={20} /> },
  ]

  const campaigns = data?.recentCampaigns || []
  const reports = data?.recentReports || []
  const approvals = data?.pendingApprovals || []
  const chartValues = chartData?.data || [0, 0, 0, 0, 0, 0, 0]
  const chartLabels = chartData?.labels || ['월','화','수','목','금','토','일']
  const maxChart = Math.max(...chartValues, 1)

  return (
    <div className="p-8">
      <Header
        title="대시보드"
        description="Green-RWD 플랫폼 현황을 한눈에 확인하세요"
        actions={
          <div className="flex gap-2">
            <Link href="/market">
              <Button variant="outline" size="md"><FileText size={16} />보고서</Button>
            </Link>
            <Link href="/campaigns/new">
              <Button size="md"><Plus size={16} />새 캠페인</Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {kpis.map(kpi => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다: {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* 캠페인이 있으면 캠페인 테이블, 없으면 최근 보고서 */}
          {campaigns.length > 0 ? (
            <Card padding="none">
              <CardHeader>
                <CardTitle>최근 캠페인 성과</CardTitle>
                <Link href="/campaigns" className="text-xs text-primary hover:underline">전체 보기 →</Link>
              </CardHeader>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
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
                            <Badge variant={statusVariant(c.status)}>{statusLabel(c.status)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card padding="none">
              <CardHeader>
                <CardTitle>최근 생성 보고섰</CardTitle>
                <Link href="/market" className="text-xs text-primary hover:underline">전체 보기 →</Link>
              </CardHeader>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400">
                  아직 보고서가 없습니다. AI 시장보고서를 생성해보세요.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {reports.map(r => (
                    <Link key={r.id} href={`/market/${r.slug}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {r.category && (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${categoryColors[r.category] || 'bg-slate-100 text-slate-600'}`}>
                              {r.category}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-[13px] font-medium text-navy truncate">{r.title}</p>
                        <div className="flex gap-4 mt-1">
                          {r.marketSize && (
                            <span className="text-[11px] text-slate-500">시장규모: {r.marketSize}</span>
                          )}
                          {r.patientPool && (
                            <span className="text-[11px] text-slate-500">환자풀: {r.patientPool}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 플랫폼 현황 가이드 (캠페인 없을 때) */}
          {!hasCampaigns && !loading && (
            <Card>
              <h3 className="font-semibold text-[15px] mb-4">플랫폼 활용 가이드</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="text-[13px] font-medium text-navy">AI 시장보고서 생성</p>
                    <p className="text-[12px] text-slate-500">질환/의약품 키워드로 HIRA, ClinicalTrials, PubMed 데이터 기반 보고서 자동 생성</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-600">세그먼트 설정</p>
                    <p className="text-[12px] text-slate-400">보고서 데이터 기반으로 타겟 환자 세그먼트를 생성하고 관리</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-600">캠페인 발송</p>
                    <p className="text-[12px] text-slate-400">세그먼트 기반 카카오 알림톡/맲짠 캠페인 생성 및 발송</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
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
                    className={`w-full rounded-t-md transition-colors ${v > 0 ? 'bg-primary/80 hover:bg-primary' : 'bg-slate-100'}`}
                    style={{ height: `${Math.max((v / maxChart) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] text-slate-400">{chartLabels[i] || ''}</span>
                </div>
              ))}
            </div>
            {maxChart <= 1 && (
              <p className="text-[11px] text-slate-400 text-center mt-3">아직 발송 데이터가 없습니다</p>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="font-semibold text-[15px] mb-3">빠른 실행</h3>
            <div className="space-y-2">
              <Link href="/market" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><FileText size={16} className="text-primary" /></div>
                <span className="text-[13px] font-medium text-navy">AI 시장보고서</span>
              </Link>
              <Link href="/segments/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Users size={16} className="text-emerald-600" /></div>
                <span className="text-[13px] font-medium text-navy">세그먼트 만들기</span>
              </Link>
              <Link href="/campaigns/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Send size={16} className="text-accent" /></div>
                <span className="text-[13px] font-medium text-navy">새 캠페인 만들기</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
