'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Search, Star, ShoppingCart, Eye, Loader2, TrendingUp, FileText } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Report {
  id: string
  slug: string
  title: string
  description: string
  categories: string[]
  therapeuticArea: string
  marketSize: string
  patientPool: string
  tier: string
  priceBasic: number
  pricePro: number
  pricePremium: number
  isGenerated: boolean
}

const categories = ['전체', '종양/항암', '대사질환', '자가면역', '신경질환', '바이오의약품', '디지털헬스', '건기식', '심혈관']

const categoryColors: Record<string, string> = {
  '종양/항암': 'bg-red-50 text-red-700 border border-red-200',
  '대사질환': 'bg-orange-50 text-orange-700 border border-orange-200',
  '자가면역': 'bg-blue-50 text-blue-700 border border-blue-200',
  '신경질환': 'bg-purple-50 text-purple-700 border border-purple-200',
  '바이오의약품': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  '디지털헬스': 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  '건기식': 'bg-green-50 text-green-700 border border-green-200',
  '심혈관': 'bg-rose-50 text-rose-700 border border-rose-200',
}

export default function MarketPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('전체')
  const router = useRouter()

  const apiParams: Record<string, string | undefined> = {
    search: search || undefined,
    category: category !== '전체' ? category : undefined,
  }

  const { data: reports, loading, error } = useApi<Report[]>('/api/reports', apiParams)

  const items = reports || []

  // Category counts
  const categoryCounts: Record<string, number> = {}
  items.forEach(r => {
    (r.categories || []).forEach(c => {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1
    })
  })

  return (
    <div className="p-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <span className="text-blue-200 text-sm font-medium">AI-Powered Market Intelligence</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">AI 시장보고서</h1>
        <p className="text-blue-200 mb-6">
          RWD 기반 의약품/건강식품 시장 분석 보고서를 검색하고, AI로 실시간 생성하세요
        </p>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-300" />
            <span>{items.length}개 보고서</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-300" />
            <span>IQVIA/GlobalData 수준 퀄리티</span>
          </div>
        </div>
      </div>

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
              category === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
            {cat !== '전체' && categoryCounts[cat] ? ` (${categoryCounts[cat]})` : ''}
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
              <div key={report.id || report.slug} className="h-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <Link href={`/market/${report.slug}`}>
                  <div className="p-5 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(report.categories || []).map((cat: string) => (
                          <span key={cat} className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${categoryColors[cat] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                      {report.isGenerated && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 border border-green-200 text-xs text-green-700">
                          생성완료
                        </span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-2">{report.title}</h3>
                    {report.description && (
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">{report.description}</p>
                    )}
                  </div>
                  <div className="p-5 cursor-pointer">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">시장규모</p>
                        <p className="text-[16px] font-bold text-blue-600">{report.marketSize || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">환자풀</p>
                        <p className="text-[16px] font-bold text-gray-900">{report.patientPool || '-'}</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Basic ₩{((report.priceBasic || 500000) / 10000).toFixed(0)}만 ~</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/market/${report.slug}`); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Eye size={13} />상세보기
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/market/${report.slug}?tab=order`); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ShoppingCart size={13} />주문하기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-slate-400">검색 결과가 없습니다</p>
              <p className="text-slate-300 text-sm mt-1">다른 검색어나 카테고리를 선택해보세요</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
