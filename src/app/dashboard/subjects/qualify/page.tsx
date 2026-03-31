'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2, Search, Clock } from 'lucide-react'
import { apiGet, apiPut } from '@/lib/api'

interface QualificationStatus {
  id: string
  screeningId: string
  name: string
  diagnosis: string
  age: number
  inclusion: boolean
  exclusion: boolean
  labTests: boolean
  clinicalEvaluation: boolean
  status: '적 격' | '부적 격' | '가토 중'
  notes?: string
  lastUpdated: string
}

export default function SubjectsQualifyPage() {
  const [qualifications, setQualifications] = useState<QualificationStatus[]>([])
  const [filteredQualifications, setFilteredQualifications] = useState<QualificationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'전 체' | '적 격' | '부적 격' | '검토 중'>('전 체')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    const fetchQualifications = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/subjects')
        setQualifications(data || [])
        setFilteredQualifications(data || [])
      } catch (err) {
        console.error('Failed to fetch qualifications:', err)
        setError('적 격 평가 데이터를 불러오는데 실패했습니다.')
        // Fallback data
        const fallbackData: QualificationStatus[] = [
          {
            id: '1',
            screeningId: 'SCR-2026-001',
            name: '김철 수',
            diagnosis: '제 2형 당뇨병',
            age: 62,
            inclusion: true,
            exclusion: false,
            labTests: true,
            clinicalEvaluation: true,
            status: '적 격',
            lastUpdated: '2026-03-20',
          },
          {
            id: '2',
            screeningId: 'SCR-2026-002',
            name: '이영미',
            diagnosis: '제 2형 당뇨병',
            age: 58,
            inclusion: true,
            exclusion: false,
            labTests: true,
            clinicalEvaluation: true,
            status: '적 격',
            lastUpdated: '2026-03-18',
          },
          {
            id: '3',
            screeningId: 'SCR-2026-003',
            name: '박선 민',
            diagnosis: '고혈압',
            age: 71,
            inclusion: true,
            exclusion: true,
            labTests: true,
            clinicalEvaluation: false,
            status: '부적 격',
            notes: '제 외기중: 신 부전 병력',
            lastUpdated: '2026-03-17',
          },
          {
            id: '4',
            screeningId: 'SCR-2026-004',
            name: '윤서지',
            diagnosis: '고혈압',
            age: 55,
            inclusion: true,
            exclusion: false,
            labTests: true,
            clinicalEvaluation: null,
            status: '검토 중',
            lastUpdated: '2026-03-19',
          },
          {
            id: '5',
            screeningId: 'SCR-2026-005',
            name: '조성호',
            diagnosis: '고 콜레 스트롤혈증',
            age: 67,
            inclusion: false,
            exclusion: false,
            labTests: false,
            clinicalEvaluation: false,
            status: '부적 격',
            notes: '포함기중 미충족',
            lastUpdated: '2026-03-16',
          },
          {
            id: '6',
            screeningId: 'SCR-2026-006',
            name: '장미영',
            diagnosis: '제 2형 당뇨병',
            age: 60,
            inclusion: true,
            exclusion: false,
            labTests: null,
            clinicalEvaluation: null,
            status: '검토 중',
            lastUpdated: '2026-03-21',
          },
        ]
        setQualifications(fallbackData)
        setFilteredQualifications(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchQualifications()
  }, [])

  useEffect(() => {
    let filtered = qualifications.filter(
      (q) =>
        q.screeningId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (statusFilter !== '전 체') {
      filtered = filtered.filter((q) => q.status === statusFilter)
    }

    setFilteredQualifications(filtered)
    setCurrentPage(1)
  }, [searchTerm, statusFilter, qualifications])

  const totalPages = Math.ceil(filteredQualifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredQualifications.slice(startIndex, endIndex)

  const getStatusColor = (status: string) => {
    switch (status) {
      case '적 격':
        return 'bg-green-100 text-green-800'
      case '부적 격':
        return 'bg-red-100 text-red-800'
      case '검토 중':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '적 격':
        return <CheckCircle className="w-4 h-4" />
      case '부적 격':
        return <XCircle className="w-4 h-4" />
      case '검토 중':
        return <Clock className="w-4 h-4" />
      default:
        return null
    }
  }

  const statsData = {
    qualified: qualifications.filter((q) => q.status === '적 격').length,
    disqualified: qualifications.filter((q) => q.status === '부적 격').length,
    reviewing: qualifications.filter((q) => q.status === '검토 중').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">임상시험 대상자 적 격 평가 </h1>
        <p className="text-gray-600 mt-2">대상자 포함/제외 기중 및 적 격성 평가</p>
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

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">적 격</p>
                <p className="text-2xl font-bold text-green-900">{statsData.qualified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">부적 격</p>
                <p className="text-2xl font-bold text-red-900">{statsData.disqualified}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">검토 중</p>
                <p className="text-2xl font-bold text-yellow-900">{statsData.reviewing}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="스크리닝ID, 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['전 체', '적 격', '부적 격', '검토 중'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredQualifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">스크리닝ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">나이</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">진단</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">포함/제외</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">검사</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">평가</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">최종상태</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((q) => (
                  <tr key={q.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{q.screeningId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{q.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{q.age}세</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{q.diagnosis}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          q.inclusion && !q.exclusion
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {q.inclusion && !q.exclusion ? 'O' : 'X'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          q.labTests === true
                            ? 'bg-green-100 text-green-800'
                            : q.labTests === false
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {q.labTests === true ? 'O' : q.labTests === false ? 'X' : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          q.clinicalEvaluation === true
                            ? 'bg-green-100 text-green-800'
                            : q.clinicalEvaluation === false
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {q.clinicalEvaluation === true ? 'O' : q.clinicalEvaluation === false ? 'X' : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold w-fit ${getStatusColor(
                          q.status
                        )}`}
                      >
                        {getStatusIcon(q.status)}
                        {q.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredQualifications.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                전 체 {filteredQualifications.length}명 | {startIndex + 1}-{Math.min(endIndex, filteredQualifications.length)}명
                표시
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
