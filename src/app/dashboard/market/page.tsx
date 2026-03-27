'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, Star } from 'lucide-react'

interface Report {
  id: string
  title: string
  categories: string[]
  marketSize: string
  patients: string
  patientCount: number
  tier: 'Standard' | 'Premium'
}

const reports: Report[] = [
  {
    id: '1',
    title: 'Entresto 심뵠전 시장분석',
    categories: ['심혈관'],
    marketSize: '₩4,820억',
    patients: '12,438명',
    patientCount: 12438,
    tier: 'Premium'
  },
  {
    id: '2',
    title: 'SGLT2i 시장분석',
    categories: ['심혈관', '당뇨'],
    marketSize: '₩3,200억',
    patients: '28,564명',
    patientCount: 28564,
    tier: 'Standard'
  },
  {
    id: '3',
    title: '키트루다 면역항암제',
    categories: ['종양'],
    marketSize: '₩5,400억',
    patients: '3,847명',
    patientCount: 3847,
    tier: 'Premium'
  },
  {
    id: '4',
    title: '루테인 건기식 시장',
    categories: ['건기식'],
    marketSize: '₩2,100억',
    patients: '84,236명',
    patientCount: 84236,
    tier: 'Standard'
  },
  {
    id: '5',
    title: '건강검진 시장동향',
    categories: ['병원마케팅'],
    marketSize: '₩8,900억',
    patients: '160만명',
    patientCount: 1600000,
    tier: 'Premium'
  },
  {
    id: '6',
    title: 'GLP-1 비마치료제',
    categories: ['당뇨', '비만'],
    marketSize: '₩12,300억',
    patients: '45,123명',
    patientCount: 45123,
    tier: 'Premium'
  }
]

const categories = ['전체', '심혈관', '종양', '당뇨', '자가면역', '건기식', '병원마케팅']
const regions = ['한국', '미국', '유럽', '일본']

export default function MarketPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedRegion, setSelectedRegion] = useState('한국')

  const filteredReports = reports.filter(report => {
    const matchSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = selectedCategory === '전체' || report.categories.includes(selectedCategory)
    return matchSearch && matchCategory
  })

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      '심혈관': 'bg-red-50 text-red-700 border border-red-200',
      '종양': 'bg-purple-50 text-purple-700 border border-purple-200',
      '당뇨': 'bg-orange-50 text-orange-700 border border-orange-200',
      '자가면역': 'bg-blue-50 text-blue-700 border border-blue-200',
      '건기식': 'bg-green-50 text-green-700 border border-green-200',
      '병원마케팅': 'bg-pink-50 text-pink-700 border border-pink-200',
      '비만': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    }
    return colors[category] || 'bg-gray-50 text-gray-700 border border-gray-200'
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">시장보고서</h1>
        <p className="text-slate-500">RWD 기반 의약품·건강식품 시장 분석 보고서를 검색하고 타겝 대상자를 확인하세요</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="보고서 제목, 의약품명, 질환 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-[14px]"
          />
        </div>
        <button className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors text-[14px]">
          검색
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8">
        <div className="relative inline-block">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative inline-block">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white cursor-pointer"
          >
            {regions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(report => (
          <Link key={report.id} href={`/dashboard/rwd-list?report=${report.id}`}>
            <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer">
              {/* Header with tier badge */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {report.categories.map(cat => (
                      <span
                        key={cat}
                        className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(cat)}`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-amber-700">
                      {report.tier}
                    </span>
                  </div>
                </div>
                <h3 className="text-[15px] font-semibold text-navy">{report.title}</h3>
              </div>

              {/* Content */}
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">시잦규모</p>
                    <p className="text-[16px] font-bold text-primary">{report.marketSize}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">환자풀</p>
                    <p className="text-[16px] font-bold text-navy">{report.patients}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-medium text-primary">RWD 리스트 보기</span>
                <span className="text-primary">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  )
}
