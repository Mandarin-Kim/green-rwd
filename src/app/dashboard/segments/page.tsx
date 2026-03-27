'use client'

import Link from 'next/link'
import { Plus, ChevronRight, Tag, Users, Calendar } from 'lucide-react'

interface Segment {
  id: string
  name: string
  patientCount: number
  createdDate: string
  status: 'active' | 'archived' | 'completed'
  tags: string[]
}

const segments: Segment[] = [
  {
    id: '1',
    name: '심부전 HFrEF 40~80세',
    patientCount: 4217,
    createdDate: '2026-03-28',
    status: 'active',
    tags: ['I50.0', '40-80세', '심혈관']
  },
  {
    id: '2',
    name: 'NSCLC Stage III-IV',
    patientCount: 1892,
    createdDate: '2026-03-25',
    status: 'active',
    tags: ['C34', '종양', '폐암']
  },
  {
    id: '3',
    name: '제2형 당뇨 50~70세',
    patientCount: 8742,
    createdDate: '2026-03-22',
    status: 'archived',
    tags: ['E11', '50-70세', '당뇨']
  },
  {
    id: '4',
    name: '40대+ 안구건조 건기식',
    patientCount: 15340,
    createdDate: '2026-03-20',
    status: 'active',
    tags: ['루테인', '40대+', '건기식']
  },
  {
    id: '5',
    name: '서울/경기 30~60세 건감',
    patientCount: 42180,
    createdDate: '2026-03-18',
    status: 'completed',
    tags: ['서울', '경기', '30-60세', '건강검진']
  }
]

const statusConfig = {
  active: { label: '활성', className: 'bg-success/10 text-success border border-success/30' },
  archived: { label: '보관', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  completed: { label: '완료', className: 'bg-slate-50 text-slate-500 border border-slate-200' }
}

export default function SegmentsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy mb-2">세그먼트</h1>
          <p className="text-slate-500">RWD 기반 타겟 세그먼트를 생성하고 관리하세요</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors text-[14px]">
          <Plus size={18} />
          새 세그먼트 만들기
        </button>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {segments.map(segment => (
          <div
            key={segment.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
          >
            {/* Header Section */}
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-[16px] font-semibold text-navy mb-4 line-clamp-2">
                {segment.name}
              </h3>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {segment.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[12px] font-medium"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig[segment.status].className}`}>
                  {statusConfig[segment.status].label}
                </span>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-6 py-4 bg-slate-50 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-semibold uppercase">인원수</p>
                    <p className="text-[15px] font-bold text-navy">{segment.patientCount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-semibold uppercase">생성일</p>
                    <p className="text-[13px] font-medium text-navy">{segment.createdDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
              <Link
                href={`/dashboard/campaigns?segment=${segment.id}`}
                className="flex-1 flex items-center justify-between px-4 py-2.5 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium text-[13px]"
              >
                <span>캠페인 만들기</span>
                <ChevronRight size={16} />
              </Link>
              <button className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-[13px]">
                리스트 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State Alternative */}
      {segments.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">세그먼트가 없습니다</h3>
          <p className="text-slate-500 mb-6">새 세그먼트를 만들어 시작하세요</p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors text-[14px]">
            <Plus size={18} />
            새 세그먼트 만들기
          </button>
        </div>
      )}
    </div>
  )
}
