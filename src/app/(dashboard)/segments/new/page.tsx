'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowLeft, Users, Search, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import type { SegmentFilter } from '@/lib/databricks'

/* ── 필터 상태 타입 ── */
interface FilterState {
  age: { enabled: boolean; min: string; max: string }
  userType: { enabled: boolean; value: string }
  partnerMemberType: { enabled: boolean; value: string }
  incomingChannel: { enabled: boolean; value: string }
}

const DEFAULT_FILTERS: FilterState = {
  age:               { enabled: false, min: '', max: '' },
  userType:          { enabled: false, value: '' },
  partnerMemberType: { enabled: false, value: '' },
  incomingChannel:   { enabled: false, value: '' },
}

/* ── 선택지 목록 (Databricks 실제 컬럼 값 기준) ── */
const USER_TYPE_OPTIONS = [
  { value: 'patient',   label: '환자 (patient)' },
  { value: 'caregiver', label: '보호자 (caregiver)' },
  { value: 'hcp',       label: '의료인 (hcp)' },
  { value: 'other',     label: '기타 (other)' },
]

const PARTNER_TYPE_OPTIONS = [
  { value: 'standard',  label: '일반 회원 (standard)' },
  { value: 'premium',   label: '프리미엄 회원 (premium)' },
  { value: 'trial',     label: '체험 회원 (trial)' },
  { value: 'vip',       label: 'VIP 회원 (vip)' },
]

const CHANNEL_OPTIONS = [
  { value: 'app',     label: '앱 (app)' },
  { value: 'web',     label: '웹 사이트 (web)' },
  { value: 'partner', label: '파트너사 (partner)' },
  { value: 'event',   label: '이벤트 (event)' },
  { value: 'referral',label: '지인 추천 (referral)' },
  { value: 'ads',     label: '광고 (ads)' },
]

/* ── 토글 행 컴포넌트 ── */
function FilterRow({
  label,
  description,
  enabled,
  onToggle,
  children,
}: {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border transition-all ${enabled ? 'border-primary/30 bg-primary/3' : 'border-slate-200 bg-slate-50'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <p className={`font-medium text-[14px] ${enabled ? 'text-navy' : 'text-slate-500'}`}>{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        {enabled
          ? <ToggleRight size={24} className="text-primary shrink-0" />
          : <ToggleLeft size={24} className="text-slate-300 shrink-0" />}
      </button>
      {enabled && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── 메인 페이지 ── */
export default function NewSegmentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [querying, setQuerying] = useState(false)
  const [targetCount, setTargetCount] = useState<number | null>(null)
  const [queryError, setQueryError] = useState('')

  const toggle = (key: keyof FilterState) =>
    setFilters(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))

  const setVal = (key: keyof FilterState, field: string, val: string) =>
    setFilters(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))

  /** 활성화된 필터 수 */
  const activeCount = Object.values(filters).filter(f => f.enabled).length

  /** UI 상태 → Databricks SegmentFilter 변환 */
  const buildDatabricksFilter = useCallback((): SegmentFilter => {
    const f: SegmentFilter = {}
    if (filters.age.enabled) {
      if (filters.age.min) f.ageMin = parseInt(filters.age.min)
      if (filters.age.max) f.ageMax = parseInt(filters.age.max)
    }
    if (filters.userType.enabled && filters.userType.value)
      f.userType = filters.userType.value
    if (filters.partnerMemberType.enabled && filters.partnerMemberType.value)
      f.partnerMemberType = filters.partnerMemberType.value
    if (filters.incomingChannel.enabled && filters.incomingChannel.value)
      f.incomingChannel = filters.incomingChannel.value
    return f
  }, [filters])

  /** Databricks 대상자 수 조회 */
  const handleQuery = async () => {
    if (activeCount === 0) { setQueryError('조건을 1개 이상 활성화하세요.'); return }
    setQueryError('')
    setQuerying(true)
    setTargetCount(null)
    try {
      const res = await fetch('/api/segments/query-databricks?mode=count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDatabricksFilter()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '조회 실패')
      setTargetCount(data.count)
    } catch (e: unknown) {
      setQueryError(e instanceof Error ? e.message : '조회 중 오류 발생')
    } finally {
      setQuerying(false)
    }
  }

  /** 세그먼트 저장 */
  const handleCreate = async () => {
    if (!name.trim()) { setError('세그먼트 이름을 입력하세요.'); return }
    if (activeCount === 0) { setError('조건을 1개 이상 설정하세요.'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          conditions: filters,
          targetCount: targetCount ?? undefined,
          databricksFilter: buildDatabricksFilter(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/segments')
      } else {
        setError(data.error || '세그먼트 생성에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      <Link href="/segments" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-4">
        <ArrowLeft size={14} />세그먼트 목록
      </Link>
      <Header title="새 세그먼트 만들기" description="조건을 켜고 값을 선택하면 Databricks에서 실제 대상자를 조회합니다" />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">

          {/* 이름 */}
          <Card>
            <h3 className="font-semibold text-[15px] mb-4">세그먼트 이름</h3>
            <input
              type="text"
              placeholder="예: 심부전 환자 40~60세 앱 유입"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Card>

          {/* 필터 조건 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[15px]">필터 조건</h3>
              {activeCount > 0 && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {activeCount}개 조건 활성
                </span>
              )}
            </div>

            <div className="space-y-3">

              {/* 연령 범위 */}
              <FilterRow
                label="연령 범위"
                description="최소~최대 나이 기준으로 대상자를 필터링합니다"
                enabled={filters.age.enabled}
                onToggle={() => toggle('age')}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">최소 나이 (세)</label>
                    <input
                      type="number"
                      min={0} max={120}
                      placeholder="예: 40"
                      value={filters.age.min}
                      onChange={e => setVal('age', 'min', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <span className="text-slate-400 mt-5">~</span>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">최대 나이 (세)</label>
                    <input
                      type="number"
                      min={0} max={120}
                      placeholder="예: 60"
                      value={filters.age.max}
                      onChange={e => setVal('age', 'max', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                {filters.age.min && filters.age.max && (
                  <p className="text-xs text-primary mt-2">
                    → {filters.age.min}세 이상 {filters.age.max}세 이하 회원 조회
                  </p>
                )}
              </FilterRow>

              {/* 유저 유형 */}
              <FilterRow
                label="유저 유형"
                description="회원 가입 시 설정된 유저 유형 (user_type)"
                enabled={filters.userType.enabled}
                onToggle={() => toggle('userType')}
              >
                <div className="grid grid-cols-2 gap-2">
                  {USER_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVal('userType', 'value', opt.value)}
                      className={`px-3 py-2 rounded-lg border text-[13px] text-left transition-all ${
                        filters.userType.value === opt.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {filters.userType.value && (
                  <p className="text-xs text-primary mt-2">
                    → user_type = &apos;{filters.userType.value}&apos; 조회
                  </p>
                )}
              </FilterRow>

              {/* 유입 채널 */}
              <FilterRow
                label="유입 채널"
                description="회원이 그린리본에 가입한 경로 (incoming_channel)"
                enabled={filters.incomingChannel.enabled}
                onToggle={() => toggle('incomingChannel')}
              >
                <div className="grid grid-cols-2 gap-2">
                  {CHANNEL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVal('incomingChannel', 'value', opt.value)}
                      className={`px-3 py-2 rounded-lg border text-[13px] text-left transition-all ${
                        filters.incomingChannel.value === opt.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {filters.incomingChannel.value && (
                  <p className="text-xs text-primary mt-2">
                    → incoming_channel = &apos;{filters.incomingChannel.value}&apos; 조회
                  </p>
                )}
              </FilterRow>

              {/* 파트너 회원 유형 */}
              <FilterRow
                label="파트너 회원 유형"
                description="파트너사를 통한 회원 등급 (partner_member_type)"
                enabled={filters.partnerMemberType.enabled}
                onToggle={() => toggle('partnerMemberType')}
              >
                <div className="grid grid-cols-2 gap-2">
                  {PARTNER_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVal('partnerMemberType', 'value', opt.value)}
                      className={`px-3 py-2 rounded-lg border text-[13px] text-left transition-all ${
                        filters.partnerMemberType.value === opt.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {filters.partnerMemberType.value && (
                  <p className="text-xs text-primary mt-2">
                    → partner_member_type = &apos;{filters.partnerMemberType.value}&apos; 조회
                  </p>
                )}
              </FilterRow>

            </div>
          </Card>
        </div>

        {/* 오른쪽 패널 */}
        <div>
          <Card className="sticky top-8 space-y-4">
            <h3 className="font-semibold text-[15px]">실제 대상자 조회</h3>

            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
              <Users size={24} className="text-primary shrink-0" />
              <div>
                {targetCount !== null ? (
                  <>
                    <p className="text-2xl font-bold text-navy">{targetCount.toLocaleString()}명</p>
                    <p className="text-xs text-slate-500">Databricks 실측 기준</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-300">—</p>
                    <p className="text-xs text-slate-400">조회 전</p>
                  </>
                )}
              </div>
            </div>

            {/* 설정된 조건 요약 */}
            {activeCount > 0 && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-slate-600 mb-1">설정된 조건</p>
                {filters.age.enabled && (filters.age.min || filters.age.max) && (
                  <p>• 연령: {filters.age.min || '0'}세 ~ {filters.age.max || '무제한'}세</p>
                )}
                {filters.userType.enabled && filters.userType.value && (
                  <p>• 유저 유형: {USER_TYPE_OPTIONS.find(o => o.value === filters.userType.value)?.label}</p>
                )}
                {filters.incomingChannel.enabled && filters.incomingChannel.value && (
                  <p>• 유입 채널: {CHANNEL_OPTIONS.find(o => o.value === filters.incomingChannel.value)?.label}</p>
                )}
                {filters.partnerMemberType.enabled && filters.partnerMemberType.value && (
                  <p>• 파트너 유형: {PARTNER_TYPE_OPTIONS.find(o => o.value === filters.partnerMemberType.value)?.label}</p>
                )}
              </div>
            )}

            {queryError && (
              <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{queryError}</p>
            )}

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleQuery}
              disabled={querying || activeCount === 0}
            >
              {querying
                ? <><Loader2 size={14} className="animate-spin" />조회 중...</>
                : <><Search size={14} />대상자 수 조회</>
              }
            </Button>

            <p className="text-xs text-slate-400 leading-relaxed">
              조건을 켜고 값을 선택한 뒤 조회하면 그린리본 실제 DB에서 해당 조건의 회원 수를 확인합니다.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={submitting || activeCount === 0}
            >
              {submitting ? '생성 중...' : '세그먼트 생성'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
