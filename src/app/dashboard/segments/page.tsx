'use client'

import { useEffect, useState } from 'react'
import { Users, Search, Loader2, AlertCircle } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface Segment {
  id: string
  name: string
  description: string
  criteria: string
  count: number
  createdDate: string
  status: '활성' | '비활성'
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [filteredSegments, setFilteredSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchSegments = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/segments')
        setSegments(data || [])
        setFilteredSegments(data || [])
      } catch (err) {
        console.error('Failed to fetch segments:', err)
        setError('세그먼트 데이터를 불러오는데 실패했습니다.')
        // Fallback data
        const fallbackData: Segment[] = [
          {
            id: '1',
            name: '당뇨병 환자군',
            description: '제 2형 당뇨병으로 진단받은 환자',
            criteria: '나이 40-70, HbA1c > 7%',
            count: 2350,
            createdDate: '2025-12-01',
            status: '활성',
          },
          {
            id: '2',
            name: '고혈압 환자군',
            description: '혈압 조절 미흡한 환자',
            criteria: '나이 30-80, 수축기 > 130mmHg',
            count: 1850,
            createdDate: '2025-11-15',
            status: '활성',
          },
          {
            id: '3',
            name: '콜레 스트롤 환자군',
            description: '고 콜레 스트롤혈증 환자',
            criteria: 'LDL > 160mg/dL',
            count: 950,
            createdDate: '2025-10-20',
            status: '활성',
          },
        ]
        setSegments(fallbackData)
        setFilteredSegments(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchSegments()
  }, [])

  useEffect(() => {
    const filtered = segments.filter((segment) =>
      segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredSegments(filtered)
  }, [searchTerm, segments])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">세그먼트 관리</h1>
        <p className="text-gray-600 mt-2">대상자 세그먼트 목록 및 조건 관리</p>
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
              placeholder="세그먼트명, 설명으로 검색..."
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
        ) : filteredSegments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">세그먼트가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">세그먼트명</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">조건</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">대상자</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredSegments.map((segment) => (
                  <tr key={segment.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{segment.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{segment.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{segment.criteria}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{segment.count.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          segment.status === '활성'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {segment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredSegments.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            전 체 {filteredSegments.length}건 | 이 대상자: {filteredSegments.reduce((sum, s) => sum + s.count, 0).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}
