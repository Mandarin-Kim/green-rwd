'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Plus, Users, Calendar, Tag, ChevronRight, Loader2, Filter, Database } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Segment {
  id: string
  name: string
  description?: string | null
  patientCount: number
  tags: string[]
  status: string
  catalogSlug?: string | null
  sourceMonth?: string | null
  currentVersion: number
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

  // 세그먼트 통계
  const totalPatients = items.reduce((sum, s) => sum + (s.patientCount || 0), 0)
  const activeCount = items.filter(s => s.status === 'active' || s.status === 'ACTIVE').length

  return (
    <div className="p-8">
      <Header
        title="세그먼트"
        description="RWD 기반 타겝 세그먼트를 생성하고 관리하세요"
        actions={<Link href="/segments/new"><Button><Plus size={16} />새 세그먼트</Button></Link>}
      />

      {/* 통계 요약 */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-navy">{activeCount}</p>
              <p className="text-[12px] text-slate-500">활성 세그먼트</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-navy">{totalPatients.toLocaleString()}</p>
              <p className="text-[12px] text-slate-500">총 환자 풀</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Filter size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-navy">{items.length}</p>
              <p className="text-[12px] text-slate-500">전체 세그먼트</p>
            </div>
          </div>
        </div>
      )}

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
          <p className="mb-1 text-[15px] font-medium text-slate-500">등록된 세그먼트가 없습니다</p>
          <p className="text-[13px] text-slate-400 mb-4">시장보고서에서 타겟 코호트를 세그먼트로 생성해보세요</p>
          <Link href="/segments/new"><Button className="mt-2"><Plus size={16} />첫 세그먼트 만들기</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {items.map(seg => (
            <Card key={seg.id} padding="none" className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[seg.status]?.variant || 'default'}>
                      {statusConfig[seg.status]?.label || seg.status}
                    </Badge>
                    {seg.currentVersion > 1 && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">v{seg.currentVersion}</span>
                    )}
                    {seg.sourceMonth && (
                      <span className="text-[10px] text-slate-400">{seg.sourceMonth}</span>
                    )}
                  </div>
                </div>
                <h3 className="text-[15px] font-semibold text-navy mb-1.5">{seg.name}</h3>
                {seg.description && (
                  <p className="text-[12px] text-slate-500 mb-2 line-clamp-2">{seg.description}</p>
                )}
                {seg.tags && seg.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {seg.tags.map((tag: string) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]">
                        <Tag size={9} />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-primary" />
                    <span className="text-[13px] font-semibold text-primary">{(seg.patientCount || 0).toLocaleString()}명</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span className="text-[12px] text-slate-500">{new Date(seg.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
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
