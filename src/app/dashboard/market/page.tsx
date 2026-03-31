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
        setMarketData(data || [])
        setFilteredData(data || [])
      } catch (err) {
        console.error('Failed to fetch market data:', err)
        setError('ìì¥ ë°ì´í°ë¥¼ ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.')
        // Fallback data
        const fallbackData: MarketData[] = [
          {
            id: '1',
            disease: 'ì 2í ë¹ë¨ë³',
            prevalence: 8.5,
            potentialSubjects: 5200,
            activeTrials: 12,
            marketSize: 'ì½ 2ì¡° ì',
            segments: ['40-70ì¸', 'ëìì§ì­'],
            growth: 12.5,
          },
          {
            id: '2',
            disease: 'ê³ íì',
            prevalence: 23.1,
            potentialSubjects: 4850,
            activeTrials: 8,
            marketSize: 'ì½ 1.5ì¡° ì',
            segments: ['50-80ì¸', 'ì êµ­'],
            growth: 8.3,
          },
          {
            id: '3',
            disease: 'ê³ ì½ë ì¤íë¡¤íì¦',
            prevalence: 9.7,
            potentialSubjects: 2100,
            activeTrials: 5,
            marketSize: 'ì½ 800ìµ ì',
            segments: ['40-75ì¸', 'ëì'],
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
        <h1 className="text-3xl font-bold text-gray-900">ìì¥ ë¶ì</h1>
        <p className="text-gray-600 mt-2">ìììí ëì ì§íë³ ìì¥ ê·ëª¨ ë° ê¸°í ë¶ì</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">ì¤ë¥</p>
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
              placeholder="ì§íëªì¼ë¡ ê²ì..."
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
            <p className="text-gray-500">ìì¥ ë°ì´í°ê° ììµëë¤.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì§í</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì ë³ë¥  (%)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ìì ëìì</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì§íì¤ ìí</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ìì¥ê·ëª¨</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì±ì¥ë¥ </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.disease}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.prevalence}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.potentialSubjects.toLocaleString()}ëª</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                        {item.activeTrials}ê±´
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
            ì ì²´ {filteredData.length}ê° ì§í | ì´ ìì ëìì: {filteredData.reduce((sum, d) => sum + d.potentialSubjects, 0).toLocaleString()}ëª
          </div>
        )}
      </div>
    </div>
  )
}
