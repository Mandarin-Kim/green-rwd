'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { ArrowLeft, Plus, X, Users, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { SegmentFilter } from '@/lib/databricks'

export default function NewSegmentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [filters, setFilters] = useState([{ field: 'ageGroup', operator: 'between', value: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Databricks 조회 상태
  const [querying, setQuerying] = useState(false)
  const [targetCount, setTargetCount] = useState<number | null>(null)
  const [queryError, setQueryError] = useState('')

  const addFilter = () => setFilters(prev => [...prev, { field: '', operator: 'equals', value: '' }])
  const removeFilter = (i: number) => setFilters(prev => prev.filter((_, idx) => idx !== i))

  /** UI 필터 → Databricks SegmentFilter 변환 */
  const buildDatabricksFilter = useCallback((): SegmentFilter => {
    const filter: SegmentFilter = {}
    const valid = filters.filter(f => f.field && f.value)

    valid.forEach(f => {
      switch (f.field) {
        case 'ageGroup': {
          // "40-80" → ageMin:40, ageMax:80
          const parts = f.value.split(/[-~]/)
          if (parts.length === 2) {
            filter.ageMin = parseInt(parts[0].trim())
            filter.ageMax = parseInt(parts[1].trim())
          } else if (!isNaN(parseInt(f.value))) {
            filter.ageMin = parseInt(f.value)
          }
          break
        }
        case 'gender':
          filter.gender = f.value.trim()
          break
        case 'region':
          filter.region = f.value.trim()
          break
        case 'userType':
          filter.userType = f.value.trim()
          break
        case 'partnerMemberType':
          filter.partnerMemberType = f.value.trim()
          break
        case 'incomingChannel':
          filter.incomingChannel = f.value.trim()
          break
      }
    })

    return filter
  }, [filters])

  /** Databricks에서 대상자 수 조회 */
  const handleQueryDatabricks = async () => {
    const valid = filters.filter(f => f.field && f.value)
    if (valid.length === 0) {
      setQueryError('필터 조건을 1개 이상 입력하세요.')
      return
    }
    setQueryError('')
    setQuerying(true)
    setTargetCount(null)
    try {
      const filter = buildDatabricksFilter()
      const res = await fetch('/api/segments/query-databricks?mode=count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filter),
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

  const handleCreate = async () => {
    if (!name.trim()) { setError('세그먼트 이름을 입력하세요.'); return }
    const validFilters = filters.filter(f => f.field && f.value)
    if (validFilters.length === 0) { setError('필터 조건을 1개 이상 입력하세요.'); return }
    setError('')
    setSubmitting(true)
    try {
      const conditions: Record<string, unknown> = {}
      validFilters.forEach(f => { conditions[f.field] = { operator: f.operator, value: f.value } })
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          conditions,
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
      <Header title="새 세그먼트 만들기" description="필터 조건을 설정하여 타겟 세그먼트를 생성하세요" />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <h3 className="font-semibold text-[15px] mb-4">기본 정보</h3>
            <Input
              label="세그먼트 이름"
              placeholder="예: 심부전 HFrEF 40~80세"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[15px]">필터 조건</h3>
              <Button variant="ghost" size="sm" onClick={addFilter}>
                <Plus size={14} />조건 추가
              </Button>
            </div>
            <div className="space-y-3">
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Select
                    options={[
                      { value: 'ageGroup', label: '연령대' },
                      { value: 'gender', label: '성별' },
                      { value: 'region', label: '지역' },
                      { value: 'userType', label: '유저 유형' },
                      { value: 'partnerMemberType', label: '파트너 회원 유형' },
                      { value: 'incomingChannel', label: '유입 채널' },
                    ]}
                    value={f.field}
                    onChange={e => { const next = [...filters]; next[i].field = e.target.value; setFilters(next) }}
                    className="w-44"
                  />
                  <Select
                    options={[
                      { value: 'equals', label: '=' },
                      { value: 'between', label: '범위' },
                      { value: 'contains', label: '포함' },
                    ]}
                    value={f.operator}
                    onChange={e => { const next = [...filters]; next[i].operator = e.target.value; setFilters(next) }}
                    className="w-24"
                  />
                  <Input
                    placeholder={
                      f.field === 'ageGroup' ? '예: 40-80' :
                      f.field === 'gender' ? '예: M 또는 F' :
                      f.field === 'region' ? '예: 서울' :
                      f.field === 'userType' ? '예: patient' :
                      f.field === 'incomingChannel' ? '예: app' :
                      '값 입력...'
                    }
                    value={f.value}
                    onChange={e => { const next = [...filters]; next[i].value = e.target.value; setFilters(next) }}
                    className="flex-1"
                  />
                  {filters.length > 1 && (
                    <button
                      onClick={() => removeFilter(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 대상자 조회 패널 */}
        <div>
          <Card className="sticky top-8 space-y-4">
            <h3 className="font-semibold text-[15px]">실제 대상자 조회</h3>

            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
              <Users size={24} className="text-primary shrink-0" />
              <div>
                {targetCount !== null ? (
                  <>
                    <p className="text-2xl font-bold text-navy">
                      {targetCount.toLocaleString()}명
                    </p>
                    <p className="text-xs text-slate-500">Databricks 실제 데이터 기준</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-300">—</p>
                    <p className="text-xs text-slate-400">조회 전</p>
                  </>
                )}
              </div>
            </div>

            {queryError && (
              <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{queryError}</p>
            )}

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleQueryDatabricks}
              disabled={querying}
            >
              {querying ? (
                <><Loader2 size={14} className="animate-spin" />조회 중...</>
              ) : (
                <><Search size={14} />대상자 수 조회</>
              )}
            </Button>

            <p className="text-xs text-slate-400 leading-relaxed">
              필터 조건을 입력한 후 &apos;대상자 수 조회&apos;를 클릭하면
              그린리본 실제 회원 데이터에서 해당 조건에 맞는 대상자 수를 확인합니다.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? '생성 중...' : '세그먼트 생성'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
