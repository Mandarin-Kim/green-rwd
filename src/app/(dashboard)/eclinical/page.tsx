'use client'

import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Plus, Users, MapPin, Calendar, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Study {
  id: string
  protocolNumber: string
  title: string
  phase: string
  status: string
  sponsor: string
  indication: string
  targetEnrollment: number
  currentEnrollment: number
  siteCount: number
  startDate: string
}

interface EnrollmentSummary {
  activeStudies: number
  totalEnrolled: number
  totalSites: number
  overallProgress: number
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  PLANNING: { label: '계획', variant: 'info' },
  ACTIVE: { label: '진행 중', variant: 'success' },
  PAUSED: { label: '일시중지', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'default' },
  TERMINATED: { label: '종료', variant: 'default' },
}

export default function EClinicalPage() {
  const { data: studies, loading } = useApi<Study[]>('/api/eclinical/studies')
  const { data: summary } = useApi<EnrollmentSummary>('/api/eclinical/enrollment-summary')

  const items = studies || []

  return (
    <div className="p-8">
      <Header
        title="eClinical Suite"
        description="임상시험 관리 · CTMS · EDC"
        actions={<Button><Plus size={16} />새 임상시험</Button>}
      />

      {/* KPI */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { label: '진행 중 연구', value: summary?.activeStudies ?? '-', color: 'text-primary' },
          { label: '총 등록 환자', value: summary?.totalEnrolled ?? '-', color: 'text-navy' },
          { label: '참여 기관', value: summary?.totalSites ?? '-', color: 'text-accent' },
          { label: '목표 달성률', value: summary ? `${summary.overallProgress}%` : '-', color: 'text-success' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Study List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">등록된 임상시험이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {items.map(study => {
            const progress = study.targetEnrollment > 0
              ? Math.round((study.currentEnrollment / study.targetEnrollment) * 100)
              : 0
            return (
              <Card key={study.id} padding="none" className="hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusConfig[study.status]?.variant || 'default'}>{statusConfig[study.status]?.label || study.status}</Badge>
                        <span className="text-xs text-slate-400">{study.protocolNumber}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">{study.phase}</span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-navy">{study.title}</h3>
                      <p className="text-[12px] text-slate-500 mt-0.5">{study.sponsor} · {study.indication}</p>
                    </div>
                    <Button variant="outline" size="sm">상세 보기</Button>
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={14} className="text-slate-400" />
                      <span className="text-slate-600"><strong className="text-navy">{study.currentEnrollment}</strong> / {study.targetEnrollment}명</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-slate-600">{study.siteCount}개 기관</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-slate-400" />
                      <span className="text-slate-600">{new Date(study.startDate).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500">{progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
