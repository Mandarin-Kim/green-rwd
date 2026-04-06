'use client'

import { useParams, useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import KpiCard from '@/components/ui/KpiCard'
import Button from '@/components/ui/Button'
import { BarChart3, Send, TrendingUp, Wallet, ArrowLeft, Pause, Loader2, XCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useApi, useMutation } from '@/hooks/use-api'
import { useState } from 'react'

interface CampaignDetail {
  id: string
  name: string
  status: string
  channelType: string
  objective: string
  segmentName: string
  targetCount: number
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalConverted: number
  totalCost: number
  scheduledAt: string
  createdAt: string
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  DRAFT: { label: '초안', variant: 'default' },
  PENDING_APPROVAL: { label: '승인 대기', variant: 'warning' },
  APPROVED: { label: '승인 완료', variant: 'info' },
  EXECUTING: { label: '발송 중', variant: 'success' },
  PAUSED: { label: '일시 중지', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'default' },
  CANCELLED: { label: '취소', variant: 'danger' },
}

const channelLabel: Record<string, string> = {
  SMS: 'SMS', LMS: 'LMS', KAKAO: '카카오', EMAIL: '이메일', PUSH: '푸시',
}

export default function CampaignDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState(false)
  const { data: campaign, loading, error } = useApi<CampaignDetail>(`/api/campaigns/${id}`)
  const { mutate: updateCampaign } = useMutation<CampaignDetail>('put')

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true)
    await updateCampaign(`/api/campaigns/${id}`, { status: newStatus })
    setActionLoading(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">{error || '캠페인을 찾을 수 없습니다.'}</p>
          <Link href="/campaigns"><Button variant="outline">캠페인 목록으로</Button></Link>
        </div>
      </div>
    )
  }

  const c = campaign
  const sent = c.totalSent || 1
  const delivered = c.totalDelivered || 0
  const opened = c.totalOpened || 0
  const clicked = c.totalClicked || 0
  const converted = c.totalConverted || 0

  const deliveryRate = ((delivered / sent) * 100).toFixed(1)
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0'
  const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : '0.0'
  const conversionRate = ((converted / sent) * 100).toFixed(1)

  const statusInfo = statusLabels[c.status] || { label: c.status, variant: 'default' as const }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-3">
          <ArrowLeft size={14} />캠페인 목록
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-navy">{c.name}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <p className="text-sm text-slate-500">{c.objective}</p>
          </div>
          <div className="flex gap-2">
            {c.status === 'PENDING_APPROVAL' && (
              <>
                <Button variant="primary" onClick={() => handleStatusChange('APPROVED')} disabled={actionLoading}>
                  <CheckCircle size={16} />승인
                </Button>
                <Button variant="danger" onClick={() => handleStatusChange('REJECTED')} disabled={actionLoading}>
                  <XCircle size={16} />반려
                </Button>
              </>
            )}
            {c.status === 'EXECUTING' && (
              <Button variant="outline" onClick={() => handleStatusChange('PAUSED')} disabled={actionLoading}>
                <Pause size={16} />일시 중지
              </Button>
            )}
            {(c.status === 'EXECUTING' || c.status === 'PAUSED') && (
              <Button variant="danger" onClick={() => handleStatusChange('CANCELLED')} disabled={actionLoading}>
                <XCircle size={16} />캠페인 종료
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <KpiCard label="발송" value={sent.toLocaleString()} change={`${deliveryRate}% 도달`} up={true} icon={<Send size={20} />} />
        <KpiCard label="도달" value={delivered.toLocaleString()} change={`${deliveryRate}%`} up={true} icon={<Send size={20} />} />
        <KpiCard label="오픈" value={opened.toLocaleString()} change={`${openRate}%`} up={true} icon={<BarChart3 size={20} />} />
        <KpiCard label="클릭" value={clicked.toLocaleString()} change={`${clickRate}%`} up={true} icon={<TrendingUp size={20} />} />
        <KpiCard label="전환" value={converted.toLocaleString()} change={`${conversionRate}%`} up={true} icon={<Wallet size={20} />} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Funnel */}
        <Card>
          <h3 className="font-semibold text-[15px] mb-6">전환 퍼널</h3>
          {[
            { label: '발송', value: sent, pct: 100 },
            { label: '도달', value: delivered, pct: (delivered / sent) * 100 },
            { label: '오픈', value: opened, pct: (opened / sent) * 100 },
            { label: '클릭', value: clicked, pct: (clicked / sent) * 100 },
            { label: '전환', value: converted, pct: (converted / sent) * 100 },
          ].map((step) => (
            <div key={step.label} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">{step.label}</span>
                <span className="text-sm font-medium text-navy">{step.value.toLocaleString()} ({step.pct.toFixed(1)}%)</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${step.pct}%` }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Info */}
        <Card>
          <h3 className="font-semibold text-[15px] mb-6">캠페인 정보</h3>
          <div className="space-y-4">
            {[
              { label: '채널', value: channelLabel[c.channelType] || c.channelType },
              { label: '세그먼트', value: c.segmentName || '-' },
              { label: '대상자 수', value: `${(c.targetCount || 0).toLocaleString()}명` },
              { label: '발송 일시', value: c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('ko-KR') : '-' },
              { label: '총 비용', value: `₩${(c.totalCost || 0).toLocaleString()}` },
              { label: '건당 비용', value: converted > 0 ? `₩${Math.round((c.totalCost || 0) / converted).toLocaleString()}` : '-' },
            ].map(info => (
              <div key={info.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{info.label}</span>
                <span className="text-sm font-medium text-navy">{info.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
