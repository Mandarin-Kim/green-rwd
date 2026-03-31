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
  status: 'ì ê²©' | 'ë¶ì ê²©' | 'ê²í ì¤'
  notes?: string
  lastUpdated: string
}

export default function SubjectsQualifyPage() {
  const [qualifications, setQualifications] = useState<QualificationStatus[]>([])
  const [filteredQualifications, setFilteredQualifications] = useState<QualificationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ì ì²´' | 'ì ê²©' | 'ë¶ì ê²©' | 'ê²í ì¤'>('ì ì²´')
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
        setError('ì ê²© íì  ë°ì´í°ë¥¼ ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.')
        // Fallback data
        const fallbackData: QualificationStatus[] = [
          {
            id: '1',
            screeningId: 'SCR-2026-001',
            name: 'ê¹ì² ì',
            diagnosis: 'ì 2í ë¹ë¨ë³',
            age: 62,
            inclusion: true,
            exclusion: false,
            labTests: true,
            clinicalEvaluation: true,
            status: 'ì ê²©',
            lastUpdated: '2026-03-20',
          },
          {
            id: '2',
            screeningId: 'SCR-2026-002',
            name: 'ì´ìí¬',
            diagnosis: 'ì 2í ë¹ë¨ë³',
            age: 58,
            inclusion: true,
            exclusion: false,
            labTests: true,
            clinicalEvaluation: true,
            status: 'ì ê²©',
            lastUpdated: '2026-03-18',
          },
          {
            id: '3',
            screeningId: 'SCR-2026-003',
            name: 'ë°ì ë¯¼',
            diagnosis: 'ê³ íì',
            age: 71,
            inclusion: true,
            exclusion: true,
            labTests: true,
            clinicalEvaluation: false,
            status: 'ë¶ì ê²©',
            notes: 'ì ì¸ê¸°ì¤: ì ë¶ì  ë³ë ¥',
            lastUpdated: '2026-03-17',
          },
          {
            id: '4',
            screeningId: 'SCR-2026-004',
            name: 'ìµìì§',
            diagnosis: 'ê³ íì',
            age: 55,
            inclusion: true,
            exclusion: false,
            labTests: true,
            clinicalEvaluation: null,
            status: 'ê²í ì¤',
            lastUpdated: '2026-03-19',
          },
          {
            id: '5',
            screeningId: 'SCR-2026-005',
            name: 'ì¡°ìí¸',
            diagnosis: 'ê³ ì½ë ì¤íë¡¤íì¦',
            age: 67,
            inclusion: false,
            exclusion: false,
            labTests: false,
            clinicalEvaluation: false,
            status: 'ë¶ì ê²©',
            notes: 'í¬í¨ê¸°ì¤ ë¯¸ì¶©ì¡±',
            lastUpdated: '2026-03-16',
          },
          {
            id: '6',
            screeningId: 'SCR-2026-006',
            name: 'ì¥ë¯¸ì',
            diagnosis: 'ì 2í ë¹ë¨ë³',
            age: 60,
            inclusion: true,
            exclusion: false,
            labTests: null,
            clinicalEvaluation: null,
            status: 'ê²í ì¤',
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

    if (statusFilter !== 'ì ì²´') {
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
      case 'ì ê²©':
        return 'bg-green-100 text-green-800'
      case 'ë¶ì ê²©':
        return 'bg-red-100 text-red-800'
      case 'ê²í ì¤':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ì ê²©':
        return <CheckCircle className="w-4 h-4" />
      case 'ë¶ì ê²©':
        return <XCircle className="w-4 h-4" />
      case 'ê²í ì¤':
        return <Clock className="w-4 h-4" />
      default:
        return null
    }
  }

  const statsData = {
    qualified: qualifications.filter((q) => q.status === 'ì ê²©').length,
    disqualified: qualifications.filter((q) => q.status === 'ë¶ì ê²©').length,
    reviewing: qualifications.filter((q) => q.status === 'ê²í ì¤').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ìììí ëìì ì ê²© íì </h1>
        <p className="text-gray-600 mt-2">ëìì í¬í¨/ì ì¸ ê¸°ì¤ ë° ì ê²©ì± íê°</p>
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

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">ì ê²©</p>
                <p className="text-2xl font-bold text-green-900">{statsData.qualified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">ë¶ì ê²©</p>
                <p className="text-2xl font-bold text-red-900">{statsData.disqualified}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">ê²í ì¤</p>
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
              placeholder="ì¤í¬ë¦¬ëID, ì´ë¦ì¼ë¡ ê²ì..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['ì ì²´', 'ì ê²©', 'ë¶ì ê²©', 'ê²í ì¤'] as const).map((status) => (
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
            <p className="text-gray-500">ê²ì ê²°ê³¼ê° ììµëë¤.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì¤í¬ë¦¬ëID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì´ë¦</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ëì´</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì§ë¨</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">í¬í¨/ì ì¸</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ê²ì¬</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">íê°</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ìµì¢ìí</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((q) => (
                  <tr key={q.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{q.screeningId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{q.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{q.age}ì¸</td>
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
                ì ì²´ {filteredQualifications.length}ëª | {startIndex + 1}-{Math.min(endIndex, filteredQualifications.length)}ëª
                íì
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ì´ì 
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ë¤ì
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
