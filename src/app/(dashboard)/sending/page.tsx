'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { CheckCircle, XCircle, Play, Pause, Clock, Loader2 } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'

type Tab = 'approve' | 'execute' | 'performance'

interface Sending {
  id: string
  campaignName: string
  channelType: string
  totalCount: number
  successCount: number
  status: string
  requestedBy: string
  createdAt: string
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  PENDING: { label: '승인 대기', variant: 'warning' },
  APPROVED: { label: '승인 완료', variant: 'info' },
  REJECTED: { label: '반려', variant: 'danger' },
  READY: { label: '발송 준비', variant: 'info' },
  EXECUTING: { label: '발송 중', variant: 'success' },
  PAUSED: { label: '일시 중지', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'default' },
  FAILED: { label: '실패', variant: 'danger' },
}

const channelLabel: Record<string, string> = {
  SMS: 'SMS', LMS: 'LMS', KAKAO: '카카오', EMAIL: '이메일', PUSH: '푸시',
}

const tabStatusMap: Record<Tab, string> = {
  approve: 'PENDING',
  execute: 'APPROVED,EXECUTING,PAUSED',
  performance: 'COMPLETED,FAILED',
}

export default function SendingPage() {
  const [tab, setTab] = useState<Tab>('approve')
  const { data: sendings, loading, error, refetch } = useApi<Sending[]>('/api/sending', { status: tabStatusMap[tab] })
  const { mutate: approveSending } = useMutation('post')
  const { mutate: updateSending } = useMutation('put')

  const items = sendings || []

  const handleApprove = async (id: string, approved: boolean) => {
    await approveSending(`/api/sending/${id}/approve`, { approved })
    refetch()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateSending(`/api/sending/${id}`, { status })
    refetch()
  }

  return (
    <div className="p-8">
      <Header title="발송 관리" description="캠페인 발송 승인, 실행 및 성과를 관리하세요" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'approve' as Tab, label: '승인 대기' },
          { key: 'execute' as Tab, label: '발송 실행' },
          { key: 'performance' as Tab, label: '성과 분석' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-medium">캠페인</th>
                  <th className="text-center px-3 py-3 font-medium">채널</th>
                  <th className="text-right px-3 py-3 font-medium">대상</th>
                  <th className="text-right px-3 py-3 font-medium">성공</th>
                  <th className="text-center px-3 py-3 font-medium">상태</th>
                  <th className="text-left px-3 py-3 font-medium">요청자</th>
                  <th className="text-center px-3 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">해당 항목이 없습니다</td></tr>
                ) : items.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-navy text-[13px]">{s.campaignName}</td>
                    <td className="text-center px-3 py-3 text-[13px]">{channelLabel[s.channelType] || s.channelType}</td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{(s.totalCount || 0).toLocaleString()}</td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{(s.successCount || 0).toLocaleString()}</td>
                    <td className="text-center px-3 py-3">
                      <Badge variant={statusConfig[s.status]?.variant || 'default'}>{statusConfig[s.status]?.label || s.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-slate-500">{s.requestedBy}</td>
                    <td className="text-center px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {s.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleApprove(s.id, true)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle size={16} /></button>
                            <button onClick={() => handleApprove(s.id, false)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><XCircle size={16} /></button>
                          </>
                        )}
                        {s.status === 'APPROVED' && <button onClick={() => handleStatusChange(s.id, 'EXECUTING')} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Play size={16} /></button>}
                        {s.status === 'EXECUTING' && <button onClick={() => handleStatusChange(s.id, 'PAUSED')} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><Pause size={16} /></button>}
                        {s.status === 'COMPLETED' && <span className="text-slate-300"><Clock size={16} /></span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
