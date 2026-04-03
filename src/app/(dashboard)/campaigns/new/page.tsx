'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Stepper from '@/components/ui/Stepper'
import { ArrowLeft, ArrowRight, Check, Megaphone, Target, FileText, Calendar, ClipboardCheck, Loader2 } from 'lucide-react'
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

export default function NewCampaignPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState('objective')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '', objective: '', channelType: 'SMS', segmentId: '',
    contentTitle: '', contentBody: '',
    scheduledDate: '', sendingTime: '09:00',
  })

  // API에서 세그먼트 목록 로드
  const { data: segments } = useApi<Segment[]>('/api/segments')
  const { mutate: createCampaign } = useMutation<{ id: string }>('post')

  const segmentList = segments || []
  const stepIndex = steps.findIndex(s => s.key === currentStep)
  const canNext = stepIndex < steps.length - 1
  const canPrev = stepIndex > 0

  const update = (data: Partial<typeof form>) => setForm(prev => ({ ...prev, ...data }))

  const selectedSegment = segmentList.find(s => s.id === form.segmentId)

  const handleSubmit = async () => {
    setSubmitting(true)
    const scheduledAt = form.scheduledDate && form.sendingTime
      ? `${form.scheduledDate}T${form.sendingTime}:00`
      : undefined

    const result = await createCampaign('/api/campaigns', {
      name: form.name,
      objective: form.objective,
      channelType: form.channelType,
      segmentId: form.segmentId || undefined,
      content: {
        title: form.contentTitle,
        body: form.contentBody,
      },
      scheduledAt,
    })

    setSubmitting(false)
    if (result.success) {
      router.push('/campaigns')
    }
  }

  return (
    <div className="p-8">
      <Header title="새 캠페인 만들기" description="5단계로 캠페인을 생성하세요" />

      {/* Stepper */}
      <Card className="mb-6">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
      </Card>

      {/* Step Content */}
      <Card className="mb-6">
        <div className="min-h-[400px]">
          {/* Step 1: 목표 설정 */}
          {currentStep === 'objective' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone size={20} className="text-primary" /></div>
                <div><h2 className="font-semibold text-navy">캠페인 목표 설정</h2><p className="text-sm text-slate-500">캠페인의 기본 정보와 목표를 입력하세요</p></div>
              </div>
              <Input label="캠페인명" placeholder="예: 심부전 Entresto Phase III 모집" value={form.name} onChange={e => update({ name: e.target.value })} />
              <Textarea label="캠페인 목표" placeholder="이 캠페인의 목적과 기대 효과를 작성하세요..." rows={4} value={form.objective} onChange={e => update({ objective: e.target.value })} />
              <Select
                label="발송 채널"
                options={[
                  { value: 'SMS', label: 'SMS (단문)' },
                  { value: 'LMS', label: 'LMS (장문)' },
                  { value: 'KAKAO', label: '카카오 알림톡' },
                  { value: 'EMAIL', label: '이메일' },
                ]}
                value={form.channelType}
                onChange={e => update({ channelType: e.target.value })}
              />
            </div>
          )}

          {/* Step 2: 타겟 선택 */}
          {currentStep === 'target' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Target size={20} className="text-primary" /></div>
                <div><h2 className="font-semibold text-navy">타겟 세그먼트 선택</h2><p className="text-sm text-slate-500">캠페인 대상 세그먼트를 선택하세요</p></div>
              </div>
              {segmentList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>등록된 세그먼트가 없습니다.</p>
                  <p className="text-sm mt-1">먼저 세그먼트를 생성해주세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {segmentList.map(seg => (
                    <button
                      key={seg.id}
                      onClick={() => update({ segmentId: seg.id })}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                        form.segmentId === seg.id
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-navy">{seg.name}</p>
                        <p className="text-sm text-slate-500">{(seg.patientCount || 0).toLocaleString()}명</p>
                      </div>
                      {form.segmentId === seg.id && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
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
              <Textarea label="본문" placeholder={'메시지 본문을 작성하세요. 변수: {이름}, {병원명}, {날짜}'} rows={8} value={form.contentBody} onChange={e => update({ contentBody: e.target.value })} />
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-medium text-slate-500 mb-2">미리보기</p>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-sm text-navy whitespace-pre-wrap">
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
                  <p className="text-sm font-medium text-navy">{selectedSegment?.name || '-'}</p>
                  <p className="text-xs text-slate-400">{selectedSegment ? `${selectedSegment.patientCount.toLocaleString()}명` : ''}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 mb-1">발송 일시</p>
                  <p className="text-sm font-medium text-navy">{form.scheduledDate} {form.sendingTime}</p>
                </div>
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
