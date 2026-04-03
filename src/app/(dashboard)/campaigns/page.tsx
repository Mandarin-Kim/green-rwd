'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Search, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Campaign {
  id: string
  name: string
  channelType: string
  status: string
  targetCount: number
  totalSent: number
  totalConverted: number
  conversionRate: number
  totalCost: number
  createdAt: string
}

const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  DRAFT: { label: '초안', variant: 'default' },
  PENDING_APPROVAL: { label: '승인 대기', variant: 'warning' },
  APPROVED: { label: '승인 완료', variant: 'info' },
  SCHEDULED: { label: '예약됨', variant: 'info' },
  EXECUTING: { label: '발송 중', variant: 'success' },
  PAUSED: { label: '일시 중지', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'default' },
  CANCELLED: { label: '취소', variant: 'danger' },
}

const channelLabel: Record<string, string> = {
  SMS: 'SMS', LMS: 'LMS', KAKAO: '카카오', EMAIL: '이메일', PUSH: '푸시',
}

export default function CampaignsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const apiParams: Record<string, string | number | undefined> = {
    page: 1,
    limit: 50,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    search: search || undefined,
  }

  const { data: campaigns, loading, error } = useApi<Campaign[]>('/api/campaigns', apiParams)

  const items = campaigns || []

  return (
    <div className="p-8">
      <Header
        title="캠페인 관리"
        description="캠페인을 생성하고 성과를 추적하세요"
        actions={<Link href="/campaigns/new"><Button><Plus size={16} />새 캠페인</Button></Link>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="캠페인 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[
            { key: 'ALL', label: '전체' },
            { key: 'EXECUTING', label: '진행 중' },
            { key: 'PENDING_APPROVAL', label: '대기' },
            { key: 'COMPLETED', label: '완료' },
            { key: 'DRAFT', label: '초안' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.key ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      {/* Campaign Table */}
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
                  <th className="text-left px-5 py-3 font-medium">캠페인명</th>
                  <th className="text-center px-3 py-3 font-medium">채널</th>
                  <th className="text-center px-3 py-3 font-medium">상태</th>
                  <th className="text-right px-3 py-3 font-medium">타겟</th>
                  <th className="text-right px-3 py-3 font-medium">발송</th>
                  <th className="text-right px-3 py-3 font-medium">전환</th>
                  <th className="text-right px-3 py-3 font-medium">전환율</th>
                  <th className="text-right px-3 py-3 font-medium">비용</th>
                  <th className="text-center px-3 py-3 font-medium">생성일</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/campaigns/${c.id}`} className="font-medium text-navy text-[13px] hover:text-primary transition-colors">{c.name}</Link>
                    </td>
                    <td className="text-center px-3 py-3 text-[13px]">{channelLabel[c.channelType] || c.channelType}</td>
                    <td className="text-center px-3 py-3">
                      <Badge variant={statusMap[c.status]?.variant || 'default'}>{statusMap[c.status]?.label || c.status}</Badge>
                    </td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{(c.targetCount || 0).toLocaleString()}</td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{(c.totalSent || 0).toLocaleString()}</td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{(c.totalConverted || 0).toLocaleString()}</td>
                    <td className="text-right px-3 py-3 text-[13px] font-semibold text-primary tabular-nums">{c.conversionRate > 0 ? `${c.conversionRate.toFixed(1)}%` : '-'}</td>
                    <td className="text-right px-3 py-3 text-[13px] tabular-nums">{c.totalCost > 0 ? `₩${c.totalCost.toLocaleString()}` : '-'}</td>
                    <td className="text-center px-3 py-3 text-[13px] text-slate-500">{new Date(c.createdAt).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">캠페인이 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
