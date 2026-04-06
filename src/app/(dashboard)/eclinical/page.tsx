'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Plus, Users, MapPin, Calendar, Loader2, Megaphone, X, Sparkles } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'

interface Study {
  id: string
  protocolNumber: string
  title: string
  phase: string
  status: string
  sponsorName: string
  indication: string
  targetEnrollment: number
  currentEnrollment: number
  sites?: Array<{ id: string; name: string; targetCount: number; enrolledCount: number }>
  startDate: string
}

interface EnrollmentSummary {
  overall: {
    target: number
    enrolled: number
    percentage: number
  }
  studyCount: number
  siteCount: number
  byStudy: unknown[]
  bySite: unknown[]
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  PLANNING: { label: '계획', variant: 'info' },
  ACTIVE: { label: '진행 중', variant: 'success' },
  PAUSED: { label: '일시중지', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'default' },
  TERMINATED: { label: '종료', variant: 'default' },
}

export default function EClinicalPage() {
  const router = useRouter()
  const { data: studies, loading, refetch } = useApi<Study[]>('/api/eclinical/studies')
  const { data: summary } = useApi<EnrollmentSummary>('/api/eclinical/enrollment-summary')
  const { mutate: createStudy } = useMutation<Study>('post')
  const { mutate: createAutoCampaign } = useMutation<{ id: string }>('post')

  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [generatingCampaign, setGeneratingCampaign] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [studyForm, setStudyForm] = useState({
    protocolNumber: '',
    title: '',
    phase: 'Phase III',
    sponsorName: '',
    indication: '',
    targetEnrollment: 100,
  })

  const items = studies || []
  const siteCountForStudy = (study: Study) => study.sites?.length ?? 0

  const handleCreateStudy = async () => {
    if (!studyForm.protocolNumber.trim() || !studyForm.title.trim()) return
    setCreating(true)
    const result = await createStudy('/api/eclinical/studies', studyForm)
    setCreating(false)
    if (result.success) {
      setShowModal(false)
      setStudyForm({ protocolNumber: '', title: '', phase: 'Phase III', sponsorName: '', indication: '', targetEnrollment: 100 })
      refetch()
    }
  }

  const handleAutoCampaign = async (studyId: string) => {
    setGeneratingCampaign(studyId)
    const result = await createAutoCampaign('/api/eclinical/auto-campaign', { studyId })
    setGeneratingCampaign(null)
    if (result.success) {
      setSuccessMsg('리크루팅 캠페인이 자동 생성되었습니다!')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  return (
    <div className="p-8">
      <Header
        title="eClinical Suite"
        description="임상시험 관리 · CTMS · EDC"
        actions={<Button onClick={() => setShowModal(true)}><Plus size={16} />새 임상시험</Button>}
      />

      {/* 성공 메시지 */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
          <Sparkles size={16} className="text-green-500" />
          {successMsg}
          <button className="ml-auto" onClick={() => setSuccessMsg('')}><X size={14} /></button>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { label: '진행 중 연구', value: summary?.studyCount ?? '-', color: 'text-primary' },
          { label: '총 등록 환자', value: summary?.overall?.enrolled ?? '-', color: 'text-navy' },
          { label: '참여 기관', value: summary?.siteCount ?? '-', color: 'text-accent' },
          { label: '목표 달성률', value: summary ? `${summary.overall?.percentage ?? 0}%` : '-', color: 'text-success' },
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
        <div className="text-center py-16">
          <p className="text-slate-400 mb-4">등록된 임상시험이 없습니다.</p>
          <Button onClick={() => setShowModal(true)}><Plus size={16} />새 임상시험 등록</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(study => {
            const progress = study.targetEnrollment > 0
              ? Math.round((study.currentEnrollment / study.targetEnrollment) * 100)
              : 0
            const remaining = study.targetEnrollment - study.currentEnrollment
            const isGenerating = generatingCampaign === study.id

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
                      <p className="text-[12px] text-slate-500 mt-0.5">{study.sponsorName} · {study.indication}</p>
                    </div>
                    <div className="flex gap-2">
                      {study.status === 'ACTIVE' && remaining > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAutoCampaign(study.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                          캠페인 자동생성
                        </Button>
                      )}
                      <Button variant="outline" size="sm">상세 보기</Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={14} className="text-slate-400" />
                      <span className="text-slate-600"><strong className="text-navy">{study.currentEnrollment}</strong> / {study.targetEnrollment}명</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-slate-600">{siteCountForStudy(study)}개 기관</span>
                    </div>
                    {study.startDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-slate-600">{new Date(study.startDate).toLocaleDateString('ko-KR')}</span>
                      </div>
                    )}
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

      {/* 새 임상시험 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-navy">새 임상시험 등록</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <Input
                label="프로토콜 번호 *"
                placeholder="예: GR-HF-2026-001"
                value={studyForm.protocolNumber}
                onChange={e => setStudyForm(p => ({ ...p, protocolNumber: e.target.value }))}
              />
              <Input
                label="연구 제목 *"
                placeholder="예: 심부전 환자 대상 Entresto 효과 연구"
                value={studyForm.title}
                onChange={e => setStudyForm(p => ({ ...p, title: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="연구 단계"
                  options={[
                    { value: 'Phase I', label: 'Phase I' },
                    { value: 'Phase II', label: 'Phase II' },
                    { value: 'Phase III', label: 'Phase III' },
                    { value: 'Phase IV', label: 'Phase IV' },
                  ]}
                  value={studyForm.phase}
                  onChange={e => setStudyForm(p => ({ ...p, phase: e.target.value }))}
                />
                <Input
                  label="목표 등록 수"
                  type="number"
                  value={String(studyForm.targetEnrollment)}
                  onChange={e => setStudyForm(p => ({ ...p, targetEnrollment: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <Input
                label="스폰서"
                placeholder="예: 노바티스"
                value={studyForm.sponsorName}
                onChange={e => setStudyForm(p => ({ ...p, sponsorName: e.target.value }))}
              />
              <Input
                label="적읉증"
                placeholder="예: 심부전 (HFrEF)"
                value={studyForm.indication}
                onChange={e => setStudyForm(p => ({ ...p, indication: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
              <Button onClick={handleCreateStudy} disabled={creating || !studyForm.protocolNumber.trim() || !studyForm.title.trim()}>
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                등록하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
