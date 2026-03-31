'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface MarketData {
  id: string
  disease: string
  prevalence: number
  potentialSubjects: number
  activeTrials: number
  marketSize: string
  segments: string[]
  growth: number
}

export default function MarketPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [filteredData, setFilteredData] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/market')
        // API 데이터가 MarketData 형식인지 검증
        if (Array.isArray(data) && data.length > 0 && data[0].disease) {
          setMarketData(data)
          setFilteredData(data)
        } else {
          // API 데이터가 다른 형식이면 fallback 사용
          throw new Error('시장 분석 데이터 형식이 일치하지 않습니다.')
        }
      } catch (err) {
        console.error('Failed to fetch market data:', err)
        setError('시장 데이터를 불러오는데 실패했습니다.')
        // Fallback data
        const fallbackData: MarketData[] = [
          {
            id: '1',
            disease: '제2형 당뇨병',
            prevalence: 8.5,
            potentialSubjects: 5200,
            activeTrials: 12,
            marketSize: '약 2조 원',
            segments: ['40-70세', '대상자지역'],
            growth: 12.5,
          },
          {
            id: '2',
            disease: '고혈압',
            prevalence: 23.1,
            potentialSubjects: 4850,
            activeTrials: 8,
            marketSize: '약 1.5조 원',
            segments: ['50-80세', '서 국'],
            growth: 8.3,
          },
          {
            id: '3',
            disease: '고콜레스테롤혈증',
            prevalence: 9.7,
            potentialSubjects: 2100,
            activeTrials: 5,
            marketSize: '약 800억 원',
            segments: ['40-75세', '남성'],
            growth: 6.8,
          },
        ]
        setMarketData(fallbackData)
        setFilteredData(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketData()
  }, [])

  useEffect(() => {
    const filtered = marketData.filter((item) =>
      item.disease.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredData(filtered)
  }, [searchTerm, marketData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">시장 분석</h1>
        <p className="text-gray-600 mt-2">임상시험 대상 질환별 시장 규모 및 기회 분석</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">오류</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="질환명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">시장 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">질환</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">유병률 (%)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">예상 대상자</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">진행중 상태</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">시장규모</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">성장율 </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.disease}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.prevalence}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{(item.potentialSubjects || 0).toLocaleString()}명</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                        {item.activeTrials}건
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.marketSize}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <TrendingUp className="w-4 h-4" />
                        {item.growth}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredData.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            전체 {filteredData.length}개 질환 | 총 예상 대상자: {filteredData.reduce((sum, d) => sum + (d.potentialSubjects || 0), 0).toLocaleString()}명
          </div>
        )}
      </div>
    </div>
  )
}
