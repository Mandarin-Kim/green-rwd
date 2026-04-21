'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Stepper from '@/components/ui/Stepper'
import {
  ArrowLeft, ArrowRight, Check, Megaphone, Target, FileText, Calendar,
  ClipboardCheck, Loader2, Sparkles, Plus, Users, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Database,
} from 'lucide-react'
import Link from 'next/link'
import { useApi, useMutation } from '@/hooks/use-api'

const steps = [
  { key: 'objective', label: '목표 설정', description: '캠페인 목표와 KPI' },
  { key: 'target', label: '타겟 선택', description: '세그먼트 & 대상자' },
  { key: 'content', label: '콘텐츠', description: '메시지 작성' },
  { key: 'schedule', label: '일정', description: '발송 스케줄' },
  { key: 'review', label: '검수·제출', description: '최종 확인' },
]

interface Segment {
  id: string
  name: string
  patientCount: number
}

/* ─────────── Databricks 필터 타입 ─────────── */
interface DatabricksFilter {
  age:               { enabled: boolean; min: string; max: string }
  gender:            { enabled: boolean; value: string }
  region:            { enabled: boolean; value: string }
  userType:          { enabled: boolean; value: string }
  partnerMemberType: { enabled: boolean; value: string }
  incomingChannel:   { enabled: boolean; value: string }
}

const DEFAULT_DB_FILTER: DatabricksFilter = {
  age:               { enabled: false, min: '', max: '' },
  gender:            { enabled: false, value: '' },
  region:            { enabled: false, value: '' },
  userType:          { enabled: false, value: '' },
  partnerMemberType: { enabled: false, value: '' },
  incomingChannel:   { enabled: false, value: '' },
}

const GENDER_OPTIONS       = [{ value: '남', label: '남성' }, { value: '여', label: '여성' }]
const REGION_OPTIONS        = [{ value: 'seoul', label: 'seoul' }]
const USER_TYPE_OPTIONS    = [{ value: 'INSURED_PERSON', label: '피보험자' }, { value: 'CLAIM_ADJUSTER', label: '손해사정인' }, { value: 'ADMIN', label: '관리자' }, { value: 'SUPER_ADMIN', label: '슈퍼관리자' }]
const PARTNER_TYPE_OPTIONS  = [{ value: 'BASIC', label: '기본' }, { value: 'EASY', label: '간편' }, { value: 'BANK', label: '은행' }, { value: 'CHANGE', label: '전환' }, { value: 'KYOBO_DAITJI_REGISTER', label: '교보대이지 가입' }, { value: 'KYOBO_DAITJI_LOGIN', label: '교보대이지 로그인' }]
const CHANNEL_OPTIONS       = [{ value: 'None', label: '오가닉(직접)' }, { value: 'OrganicIOS', label: 'iOS 오가닉' }, { value: 'direct_payment', label: '직접결제' }, { value: '보험청구', label: '보험청구' }, { value: '실손보험', label: '실손보험' }, { value: '숨은보험찾기', label: '숨은보험찾기' }, { value: '휴면보험금', label: '휴면보험금' }, { value: 'toss', label: '토스' }, { value: 'woori', label: '우리은행' }, { value: 'kyobodaitji', label: '교보대이지' }, { value: 'kwangju', label: '광주은행' }, { value: 'NPL', label: 'NPL' }, { value: 'google', label: '구글검색' }, { value: 'googleads', label: '구글광고' }, { value: 'naverG', label: '네이버' }, { value: 'naverpower2', label: '네이버파워링크' }, { value: 'instagram2', label: '인스타그램' }, { value: 'meta_간편하게수십_app', label: '메타광고(앱)' }, { value: 'meta_간편하게20_web', label: '메타광고(웹)' }]
function FilterRow({ label, enabled, onToggle, children }: { label: string; enabled: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border transition-all ${enabled ? 'border-primary/30 bg-primary/5' : 'border-slate-200 bg-slate-50'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between p-3 text-left">
        <p className={`font-medium text-[13px] ${enabled ? 'text-navy' : 'text-slate-500'}`}>{label}</p>
        {enabled ? <ToggleRight size={20} className="text-primary shrink-0" /> : <ToggleLeft size={20} className="text-slate-300 shrink-0" />}
      </button>
      {enabled && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

/* ─────────── 선택 버튼 그룹 ─────────── */
function OptionButtons({ options, value, onChange }: { options: {value: string; label: string}[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${value === opt.value ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState('objective')
  const [submitting, setSubmitting] = useState(false)
  const [showDbFilter, setShowDbFilter] = useState(false)
  const [dbFilter, setDbFilter] = useState<DatabricksFilter>(DEFAULT_DB_FILTER)
  const [dbQueryState, setDbQueryState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [dbCount, setDbCount] = useState<number | null>(null)
  const [dbError, setDbError] = useState('')
  const [form, setForm] = useState({
    name: '', objective: '', channelType: 'KAKAO', segmentId: '',
    contentTitle: '', contentBody: '',
    scheduledDate: '', sendingTime: '09:00',
  })

  const { data: segments } = useApi<Segment[]>('/api/segments')
  const { mutate: createCampaign } = useMutation<{ id: string }>('post')

  const segmentList = segments || []
  const stepIndex = steps.findIndex(s => s.key === currentStep)
  const canNext = stepIndex < steps.length - 1
  const canPrev = stepIndex > 0

  const update = (data: Partial<typeof form>) => setForm(prev => ({ ...prev, ...data }))
  const updateDbFilter = useCallback(<K extends keyof DatabricksFilter>(key: K, val: Partial<DatabricksFilter[K]>) => {
    setDbFilter(prev => ({ ...prev, [key]: { ...prev[key], ...val } }))
    setDbQueryState('idle')
    setDbCount(null)
  }, [])

  const selectedSegment = segmentList.find(s => s.id === form.segmentId)

  /* ── Databricks 대상자 수 조회 ── */
  const queryDatabricks = async () => {
    setDbQueryState('loading')
    setDbError('')
    try {
      const body: Record<string, any> = {}
      if (dbFilter.age.enabled && dbFilter.age.min)    body.ageMin = parseInt(dbFilter.age.min)
      if (dbFilter.age.enabled && dbFilter.age.max)    body.ageMax = parseInt(dbFilter.age.max)
      if (dbFilter.gender.enabled && dbFilter.gender.value)              body.gender = dbFilter.gender.value
      if (dbFilter.region.enabled && dbFilter.region.value)              body.region = dbFilter.region.value
      if (dbFilter.userType.enabled && dbFilter.userType.value)          body.userType = dbFilter.userType.value
      if (dbFilter.partnerMemberType.enabled && dbFilter.partnerMemberType.value) body.partnerMemberType = dbFilter.partnerMemberType.value
      if (dbFilter.incomingChannel.enabled && dbFilter.incomingChannel.value)     body.incomingChannel = dbFilter.incomingChannel.value

      const res = await fetch('/api/segments/query-databricks?mode=count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '조회 실패')
      setDbCount(data.count)
      setDbQueryState('done')
    } catch (err: any) {
      setDbError(err.message)
      setDbQueryState('error')
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const scheduledAt = form.scheduledDate && form.sendingTime
      ? `${form.scheduledDate}T${form.sendingTime}:00`
      : undefined

    // 활성화된 DB 필터만 추출
    const activeDatabricksFilter: Record<string, any> = {}
    if (dbFilter.age.enabled) { activeDatabricksFilter.ageMin = parseInt(dbFilter.age.min) || undefined; activeDatabricksFilter.ageMax = parseInt(dbFilter.age.max) || undefined }
    if (dbFilter.gender.enabled && dbFilter.gender.value)              activeDatabricksFilter.gender = dbFilter.gender.value
    if (dbFilter.region.enabled && dbFilter.region.value)              activeDatabricksFilter.region = dbFilter.region.value
    if (dbFilter.userType.enabled && dbFilter.userType.value)          activeDatabricksFilter.userType = dbFilter.userType.value
    if (dbFilter.partnerMemberType.enabled && dbFilter.partnerMemberType.value) activeDatabricksFilter.partnerMemberType = dbFilter.partnerMemberType.value
    if (dbFilter.incomingChannel.enabled && dbFilter.incomingChannel.value)     activeDatabricksFilter.incomingChannel = dbFilter.incomingChannel.value

    const result = await createCampaign('/api/campaigns', {
      name: form.name,
      objective: form.objective,
      channelType: form.channelType,
      segmentId: form.segmentId || undefined,
      content: { title: form.contentTitle, body: form.contentBody },
      scheduledAt,
      targetCount: dbCount ?? selectedSegment?.patientCount,
      databricksFilter: Object.keys(activeDatabricksFilter).length > 0 ? activeDatabricksFilter : undefined,
    })

    setSubmitting(false)
    if (result.success) router.push('/campaigns')
  }

  const activeFilterCount = Object.values(dbFilter).filter(f => f.enabled).length

  return (
    <div className="p-8">
      <Header title="새 캠페인 만들기" description="5단계로 캠페인을 생성하세요" />

      <Card className="mb-6">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
      </Card>

      <Card className="mb-6">
        <div className="min-h-[400px]">

          {/* Step 1: 목표 설정 */}
          {currentStep === 'objective' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone size={20} className="text-primary" /></div>
                <div><h2 className="font-semibold text-navy">캠페인 목표 설정</h2><p className="text-sm text-slate-500">캠페인의 기본 정보와 목표를 입력하세요</p></div>
              </div>
              <Input label="캠페인명" placeholder="예: 고지혈증 임상시험 리크루팅 2026 Q2" value={form.name} onChange={e => update({ name: e.target.value })} />
              <Textarea label="캠페인 목표" placeholder="이 캠페인의 목적과 기대 효과를 작성하세요..." rows={4} value={form.objective} onChange={e => update({ objective: e.target.value })} />
              <Select
                label="발송 채널"
                options={[
                  { value: 'KAKAO', label: '카카오 알림톡 (권장)' },
                  { value: 'SMS', label: 'SMS (단문)' },
                  { value: 'LMS', label: 'LMS (장문)' },
                  { value: 'EMAIL', label: '이메일' },
                ]}
                value={form.channelType}
                onChange={e => update({ channelType: e.target.value })}
              />
            </div>
          )}

          {/* Step 2: 타겟 선택 + Databricks 조건 + 대상자 추출 */}
          {currentStep === 'target' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Target size={20} className="text-primary" /></div>
                <div><h2 className="font-semibold text-navy">타겟 세그먼트 선택</h2><p className="text-sm text-slate-500">세그먼트를 선택하고 추가 조건을 설정하세요</p></div>
              </div>

              {/* 세그먼트 선택 */}
              {segmentList.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3"><Sparkles size={16} className="text-amber-500" /><p className="font-medium text-amber-800">저장된 세그먼트 없음</p></div>
                  <p className="text-sm text-amber-700 mb-3">아래에서 직접 Databricks 조건을 설정해 대상자를 추출하거나, 먼저 세그먼트를 만드세요.</p>
                  <Link href="/segments/new"><Button size="sm" variant="outline"><Plus size={14} />세그먼트 만들러 가기</Button></Link>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">기본 세그먼트 선택 (선택사항)</p>
                  <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                    {segmentList.map(seg => (
                      <button
                        key={seg.id}
                        onClick={() => update({ segmentId: form.segmentId === seg.id ? '' : seg.id })}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${form.segmentId === seg.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div>
                          <p className="font-medium text-navy text-sm">{seg.name}</p>
                          <p className="text-xs text-slate-400">{(seg.patientCount || 0).toLocaleString()}명 (기존 집계)</p>
                        </div>
                        {form.segmentId === seg.id && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Databricks 조건 설정 토글 */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDbFilter(v => !v)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-primary" />
                    <span className="font-medium text-sm text-navy">Databricks 대상자 조건 설정</span>
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs">{activeFilterCount}개 조건</span>
                    )}
                  </div>
                  {showDbFilter ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {showDbFilter && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500 mb-3">실제 그린리본 데이터에서 조건에 맞는 대상자를 추출합니다. 조건을 켜고 값을 선택하세요.</p>

                    {/* 연령 */}
                    <FilterRow label="연령 범위" enabled={dbFilter.age.enabled} onToggle={() => updateDbFilter('age', { enabled: !dbFilter.age.enabled })}>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="최소 나이" value={dbFilter.age.min} onChange={e => updateDbFilter('age', { min: e.target.value })}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center" min={0} max={120} />
                        <span className="text-slate-400 text-sm">~</span>
                        <input type="number" placeholder="최대 나이" value={dbFilter.age.max} onChange={e => updateDbFilter('age', { max: e.target.value })}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center" min={0} max={120} />
                        <span className="text-slate-400 text-xs">세</span>
                      </div>
                    </FilterRow>

                    {/* 성별 */}
                    <FilterRow label="성별" enabled={dbFilter.gender.enabled} onToggle={() => updateDbFilter('gender', { enabled: !dbFilter.gender.enabled })}>
                      <OptionButtons options={GENDER_OPTIONS} value={dbFilter.gender.value} onChange={v => updateDbFilter('gender', { value: v })} />
                    </FilterRow>

                    {/* 지역 */}
                    <FilterRow label="거주 지역" enabled={dbFilter.region.enabled} onToggle={() => updateDbFilter('region', { enabled: !dbFilter.region.enabled })}>
                      <OptionButtons options={REGION_OPTIONS} value={dbFilter.region.value} onChange={v => updateDbFilter('region', { value: v })} />
                    </FilterRow>

                    {/* 유저 유형 */}
                    <FilterRow label="유저 유형" enabled={dbFilter.userType.enabled} onToggle={() => updateDbFilter('userType', { enabled: !dbFilter.userType.enabled })}>
                      <OptionButtons options={USER_TYPE_OPTIONS} value={dbFilter.userType.value} onChange={v => updateDbFilter('userType', { value: v })} />
                    </FilterRow>

                    {/* 파트너 회원 유형 */}
                    <FilterRow label="파트너 회원 유형" enabled={dbFilter.partnerMemberType.enabled} onToggle={() => updateDbFilter('partnerMemberType', { enabled: !dbFilter.partnerMemberType.enabled })}>
                      <OptionButtons options={PARTNER_TYPE_OPTIONS} value={dbFilter.partnerMemberType.value} onChange={v => updateDbFilter('partnerMemberType', { value: v })} />
                    </FilterRow>

                    {/* 유입 채널 */}
                    <FilterRow label="유입 채널" enabled={dbFilter.incomingChannel.enabled} onToggle={() => updateDbFilter('incomingChannel', { enabled: !dbFilter.incomingChannel.enabled })}>
                      <OptionButtons options={CHANNEL_OPTIONS} value={dbFilter.incomingChannel.value} onChange={v => updateDbFilter('incomingChannel', { value: v })} />
                    </FilterRow>

                    {/* 대상자 조회 버튼 */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={queryDatabricks}
                          disabled={dbQueryState === 'loading' || activeFilterCount === 0}
                          className="flex-1"
                        >
                          {dbQueryState === 'loading'
                            ? <><Loader2 size={15} className="animate-spin" />조회 중...</>
                            : <><Database size={15} />Databricks 대상자 수 조회</>
                          }
                        </Button>
                        {dbQueryState === 'done' && dbCount !== null && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                            <Users size={15} className="text-green-600" />
                            <span className="font-bold text-green-700">{dbCount.toLocaleString()}명</span>
                          </div>
                        )}
                      </div>
                      {dbQueryState === 'error' && (
                        <p className="text-xs text-red-500 mt-2">⚠ {dbError}</p>
                      )}
                      {activeFilterCount === 0 && (
                        <p className="text-xs text-slate-400 mt-2">조건을 하나 이상 켜야 조회할 수 있습니다</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 대상자 요약 */}
              {(form.segmentId || dbQueryState === 'done') && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-medium text-blue-700 mb-2">현재 설정된 대상자</p>
                  {selectedSegment && <p className="text-sm text-blue-800">세그먼트: <strong>{selectedSegment.name}</strong></p>}
                  {dbQueryState === 'done' && dbCount !== null && (
                    <p className="text-sm text-blue-800 mt-1">Databricks 실시간 조회: <strong className="text-green-700">{dbCount.toLocaleString()}명</strong></p>
                  )}
                  {!form.segmentId && dbQueryState !== 'done' && (
                    <p className="text-sm text-slate-500">세그먼트 선택 또는 Databricks 조건을 설정하세요</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: 콘텐츠 */}
          {currentStep === 'content' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FileText size={20} className="text-primary" /></div>
                <div><h2 className="font-semibold text-navy">메시지 콘텐츠 작성</h2><p className="text-sm text-slate-500">발송할 메시지 내용을 작성하세요</p></div>
              </div>
              <Input label="제목" placeholder="메시지 제목" value={form.contentTitle} onChange={e => update({ contentTitle: e.target.value })} />
              <Textarea
                label="본문"
                placeholder={'메시지 본문을 작성하세요.\n\n변수: {이름}, {병원명}, {날짜}\n\n예시:\n안녕하세요 {이름}님,\n임상시험 참여 기회를 안내드립니다...'}
                rows={8}
                value={form.contentBody}
                onChange={e => update({ contentBody: e.target.value })}
              />
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-medium text-slate-500 mb-2">미리보기</p>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-sm text-navy whitespace-pre-wrap min-h-[80px]">
                  {form.contentBody || '메시지 내용이 여기에 표시됩니다...'}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 일정 */}
          {currentStep === 'schedule' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar size={20} className="text-primary" /></div>
                <div><h2 className="font-semibold text-navy">발송 일정 설정</h2><p className="text-sm text-slate-500">캠페인 발송 시간을 설정하세요</p></div>
              </div>
              <Input label="발송 예정일" type="date" value={form.scheduledDate} onChange={e => update({ scheduledDate: e.target.value })} />
              <Input label="발송 시간" type="time" value={form.sendingTime} onChange={e => update({ sendingTime: e.target.value })} />
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700">⚠ 발송 전 반드시 승인 절차가 필요합니다. 설정 시간보다 최소 24시간 전에 제출하세요.</p>
              </div>
            </div>
          )}

          {/* Step 5: 검수·제출 */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ClipboardCheck size={20} className="text-primary" /></div>
                <div><h2 className="font-semibold text-navy">최종 검수</h2><p className="text-sm text-slate-500">입력 내용을 확인하고 제출하세요</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 mb-1">캠페인명</p>
                  <p className="text-sm font-medium text-navy">{form.name || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 mb-1">채널</p>
                  <p className="text-sm font-medium text-navy">{form.channelType}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 mb-1">타겟 세그먼트</p>
                  <p className="text-sm font-medium text-navy">{selectedSegment?.name || (dbQueryState === 'done' ? 'Databricks 조건 대상자' : '-')}</p>
                  {dbQueryState === 'done' && dbCount !== null
                    ? <p className="text-xs text-green-600 font-medium mt-0.5">Databricks 실시간 {dbCount.toLocaleString()}명</p>
                    : <p className="text-xs text-slate-400 mt-0.5">{selectedSegment ? `${selectedSegment.patientCount.toLocaleString()}명` : ''}</p>
                  }
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 mb-1">발송 일시</p>
                  <p className="text-sm font-medium text-navy">{form.scheduledDate ? `${form.scheduledDate} ${form.sendingTime}` : '미설정'}</p>
                </div>
                {activeFilterCount > 0 && (
                  <div className="col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 mb-2">Databricks 조건 ({activeFilterCount}개)</p>
                    <div className="flex flex-wrap gap-2">
                      {dbFilter.age.enabled && (dbFilter.age.min || dbFilter.age.max) && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">연령 {dbFilter.age.min || '?'}~{dbFilter.age.max || '?'}세</span>}
                      {dbFilter.gender.enabled && dbFilter.gender.value && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{dbFilter.gender.value}성</span>}
                      {dbFilter.region.enabled && dbFilter.region.value && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{dbFilter.region.value}</span>}
                      {dbFilter.userType.enabled && dbFilter.userType.value && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{dbFilter.userType.value}</span>}
                      {dbFilter.partnerMemberType.enabled && dbFilter.partnerMemberType.value && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{dbFilter.partnerMemberType.value}</span>}
                      {dbFilter.incomingChannel.enabled && dbFilter.incomingChannel.value && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{dbFilter.incomingChannel.value}</span>}
                    </div>
                  </div>
                )}
                <div className="col-span-2 p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 mb-1">메시지 내용</p>
                  <p className="text-sm text-navy whitespace-pre-wrap">{form.contentBody || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => canPrev && setCurrentStep(steps[stepIndex - 1].key)} disabled={!canPrev}>
          <ArrowLeft size={16} />이전
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => router.push('/campaigns')}>취소</Button>
          {canNext ? (
            <Button onClick={() => setCurrentStep(steps[stepIndex + 1].key)}>
              다음<ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              승인 요청 제출
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
