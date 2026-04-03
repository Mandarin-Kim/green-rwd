'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Plus, Users, Calendar, Tag, ChevronRight, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Segment {
  id: string
  name: string
  patientCount: number
  tags: string[]
  status: string
  createdAt: string
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'default' | 'warning' }> = {
  active: { label: '활성', variant: 'success' },
  ACTIVE: { label: '활성', variant: 'success' },
  archived: { label: '보관', variant: 'default' },
  ARCHIVED: { label: '보관', variant: 'default' },
  completed: { label: '완료', variant: 'default' },
  COMPLETED: { label: '완료', variant: 'default' },
}

export default function SegmentsPage() {
  const { data: segments, loading, error } = useApi<Segment[]>('/api/segments')

  const items = segments || []

  return (
    <div className="p-8">
      <Header
        title="세그먼트"
        description="RWD 기반 타겟 세그먼트를 생성하고 관리하세요"
        actions={<Link href="/segments/new"><Button><Plus size={16} />새 세그먼트</Button></Link>}
      />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users size={40} className="mx-auto mb-3 text-slate-300" />
          <p>등록된 세그먼트가 없습니다.</p>
          <Link href="/segments/new"><Button className="mt-4"><Plus size={16} />첫 세그먼트 만들기</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map(seg => (
            <Card key={seg.id} padding="none" className="hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={statusConfig[seg.status]?.variant || 'default'}>{statusConfig[seg.status]?.label || seg.status}</Badge>
                </div>
                <h3 className="text-[16px] font-semibold text-navy mb-3">{seg.name}</h3>
                {seg.tags && seg.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {seg.tags.map((tag: string) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[12px] font-medium">
                        <Tag size={10} />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-slate-50 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-navy">{(seg.patientCount || 0).toLocaleString()}명</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-500">{new Date(seg.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
                <Link href={`/campaigns/new?segment=${seg.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full justify-between">캠페인 만들기<ChevronRight size={14} /></Button>
                </Link>
                <Button variant="ghost" size="sm">리스트 보기</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
