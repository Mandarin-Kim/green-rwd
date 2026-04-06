'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { ArrowLeft, Plus, X, Users } from 'lucide-react'
import Link from 'next/link'

export default function NewSegmentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [filters, setFilters] = useState([{ field: 'ageGroup', operator: 'in', value: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addFilter = () => setFilters(prev => [...prev, { field: '', operator: 'equals', value: '' }])
  const removeFilter = (i: number) => setFilters(prev => prev.filter((_, idx) => idx !== i))

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
        body: JSON.stringify({ name: name.trim(), conditions }),
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
            <Input label="세그먼트 이름" placeholder="예: 심부전 HFrEF 40~80세" value={name} onChange={e => setName(e.target.value)} />
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[15px]">필터 조건</h3>
              <Button variant="ghost" size="sm" onClick={addFilter}><Plus size={14} />조건 추가</Button>
            </div>
            <div className="space-y-3">
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Select
                    options={[
                      { value: 'ageGroup', label: '연령대' },
                      { value: 'gender', label: '성별' },
                      { value: 'region', label: '지역' },
                      { value: 'diagnosisCode', label: '진단코드 (ICD-10)' },
                      { value: 'drugCode', label: '약물코드 (ATC)' },
                    ]}
                    value={f.field}
                    onChange={e => { const next = [...filters]; next[i].field = e.target.value; setFilters(next) }}
                    className="w-40"
                  />
                  <Select
                    options={[
                      { value: 'equals', label: '=' },
                      { value: 'in', label: '포함' },
                      { value: 'gt', label: '>' },
                      { value: 'lt', label: '<' },
                      { value: 'between', label: '범위' },
                    ]}
                    value={f.operator}
                    onChange={e => { const next = [...filters]; next[i].operator = e.target.value; setFilters(next) }}
                    className="w-24"
                  />
                  <Input
                    placeholder={f.field === 'ageGroup' ? '예: 40-80' : f.field === 'gender' ? '예: M, F' : '값 입력...'}
                    value={f.value}
                    onChange={e => { const next = [...filters]; next[i].value = e.target.value; setFilters(next) }}
                    className="flex-1"
                  />
                  {filters.length > 1 && (
                    <button onClick={() => removeFilter(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><X size={16} /></button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="sticky top-8">
            <h3 className="font-semibold text-[15px] mb-4">예상 결과</h3>
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl mb-4">
              <Users size={24} className="text-primary" />
              <div>
                <p className="text-2xl font-bold text-navy">4,217</p>
                <p className="text-xs text-slate-500">예상 대상자 수</p>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>{submitting ? '생성 중...' : '세그먼트 생성'}</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
