'use client'

import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Order {
  id: string
  reportTitle: string
  tier: string
  userName: string
  organizationName: string
  price: number
  status: string
  createdAt: string
}

interface OrderKpis {
  totalOrders: number
  totalRevenue: number
  generatingCount: number
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'danger' }> = {
  PENDING: { label: '대기', variant: 'warning' },
  GENERATING: { label: '생성 중', variant: 'info' },
  COMPLETED: { label: '완료', variant: 'success' },
  FAILED: { label: '실패', variant: 'danger' },
  CANCELLED: { label: '취소', variant: 'default' },
}

export default function AdminOrdersPage() {
  const { data: orders, loading } = useApi<Order[]>('/api/admin/orders')
  const { data: kpis } = useApi<OrderKpis>('/api/admin/orders', { kpi: 'true' })

  const items = orders || []

  return (
    <div className="p-8">
      <Header title="주문 관리" description="AI 시장보고서 주문 현황을 관리하세요" />
      <div className="grid grid-cols-3 gap-5 mb-8">
        <Card><p className="text-xs text-slate-500 mb-1">총 주문</p><p className="text-2xl font-bold text-navy">{kpis?.totalOrders ?? items.length}건</p></Card>
        <Card><p className="text-xs text-slate-500 mb-1">총 매출</p><p className="text-2xl font-bold text-primary">₩{((kpis?.totalRevenue ?? 0) / 10000).toLocaleString()}만</p></Card>
        <Card><p className="text-xs text-slate-500 mb-1">생성 중</p><p className="text-2xl font-bold text-accent">{kpis?.generatingCount ?? 0}건</p></Card>
      </div>
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">주문ID</th>
                <th className="text-left px-3 py-3 font-medium">보고서</th>
                <th className="text-center px-3 py-3 font-medium">티어</th>
                <th className="text-left px-3 py-3 font-medium">주문자</th>
                <th className="text-right px-3 py-3 font-medium">금액</th>
                <th className="text-center px-3 py-3 font-medium">상태</th>
                <th className="text-center px-3 py-3 font-medium">주문일</th>
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-[13px] font-mono text-slate-500">{o.id.slice(0, 8)}</td>
                  <td className="px-3 py-3 text-[13px] font-medium text-navy">{o.reportTitle}</td>
                  <td className="text-center px-3 py-3"><Badge variant={o.tier === 'PREMIUM' ? 'warning' : o.tier === 'PRO' ? 'info' : 'default'}>{o.tier}</Badge></td>
                  <td className="px-3 py-3 text-[13px]"><span className="text-navy">{o.userName}</span> <span className="text-slate-400">· {o.organizationName || '-'}</span></td>
                  <td className="text-right px-3 py-3 text-[13px] font-medium tabular-nums">₩{(o.price || 0).toLocaleString()}</td>
                  <td className="text-center px-3 py-3"><Badge variant={statusMap[o.status]?.variant || 'default'}>{statusMap[o.status]?.label || o.status}</Badge></td>
                  <td className="text-center px-3 py-3 text-[13px] text-slate-500">{new Date(o.createdAt).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">주문 내역이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
