'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Search, Star, ShoppingCart, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Report {
  id: string
  slug: string
  title: string
  categories: string[]
  marketSize: string
  patientPool: string
  tier: string
  priceBasic: number
  pricePro: number
  pricePremium: number
}

const categories = ['전체', '심혈관', '종양', '당뇨', '자가면역', '건기식', '병원마케팅', '비만']

const categoryColors: Record<string, string> = {
  '심혈관': 'bg-red-50 text-red-700 border border-red-200',
  '종양': 'bg-purple-50 text-purple-700 border border-purple-200',
  '당뇨': 'bg-orange-50 text-orange-700 border border-orange-200',
  '건기식': 'bg-green-50 text-green-700 border border-green-200',
  '병원마케팅': 'bg-pink-50 text-pink-700 border border-pink-200',
  '비만': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  '자가면역': 'bg-blue-50 text-blue-700 border border-blue-200',
}

export default function MarketPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('전체')

  const apiParams: Record<string, string | undefined> = {
    search: search || undefined,
    category: category !== '전체' ? category : undefined,
  }

  const { data: reports, loading, error } = useApi<Report[]>('/api/reports', apiParams)

  const items = reports || []

  return (
    <div className="p-8">
      <Header title="AI 시장보고서" description="RWD 기반 의약품·건강식품 시장 분석 보고서를 검색하고 주문하세요" />

      {/* Search */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1">
          <Input placeholder="보고서 제목, 의약품명, 질환 검색..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
        </div>
        <Button>검색</Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
              category === cat ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(report => (
              <Link key={report.id || report.slug} href={`/market/${report.slug}`}>
                <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer">
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(report.categories || []).map((cat: string) => (
                          <span key={cat} className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${categoryColors[cat] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium text-amber-700">{report.tier}</span>
                      </div>
                    </div>
                    <h3 className="text-[15px] font-semibold text-navy">{report.title}</h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">시장규모</p>
                        <p className="text-[16px] font-bold text-primary">{report.marketSize || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">환자풀</p>
                        <p className="text-[16px] font-bold text-navy">{report.patientPool || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Basic ₩{((report.priceBasic || 500000) / 10000).toFixed(0)}만 ~</span>
                    <span className="text-sm font-medium text-primary flex items-center gap-1"><ShoppingCart size={14} />주문하기</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-16"><p className="text-slate-400">검색 결과가 없습니다</p></div>
          )}
        </>
      )}
    </div>
  )
}
