'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface Subject {
  id: string
  screeningId: string
  name: string
  age: number
  gender: '남' | '여'
  diagnosis: string
  hospital: string
  consentStatus: '동의' | '미동의' | '동기중'
  enrollmentDate: string
  notes?: string
}

export default function SubjectsManagePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/subjects')
        setSubjects(data || [])
        setFilteredSubjects(data || [])
      } catch (err) {
        console.error('Failed to fetch subjects:', err)
        setError('임상시험 대상자 데이터를 불러오는데 실패했습니다.')
        // Fallback data
        const fallbackData: Subject[] = [
          {
            id: '1',
            screeningId: 'SCR-2026-001',
            name: '김철수',
            age: 62,
            gender: '남',
            diagnosis: '제2형 당뇨병',
            hospital: '서울의료원',
            consentStatus: '동의',
            enrollmentDate: '2026-03-01',
          },
          {
            id: '2',
            screeningId: 'SCR-2026-002',
            name: '이영미',
            age: 58,
            gender: '여',
            diagnosis: '제2형 당뇨병',
            hospital: '경북의료원',
            consentStatus: '동의',
            enrollmentDate: '2026-03-02',
          },
          {
            id: '3',
            screeningId: 'SCR-2026-003',
            name: '박선민',
            age: 71,
            gender: '남',
            diagnosis: '고혈압',
            hospital: '종로의료원',
            consentStatus: '동기중',
            enrollmentDate: '2026-03-10',
          },
          {
            id: '4',
            screeningId: 'SCR-2026-004',
            name: '유서지',
            age: 55,
            gender: '여',
            diagnosis: '고혈압',
            hospital: '서울의료원',
            consentStatus: '동의',
            enrollmentDate: '2026-03-05',
          },
          {
            id: '5',
            screeningId: 'SCR-2026-005',
            name: '조성호',
            age: 67,
            gender: '남',
            diagnosis: '고콜레스테롤혈증',
            hospital: '경북의료원',
            consentStatus: '미동의',
            enrollmentDate: '2026-03-12',
          },
        ]
        setSubjects(fallbackData)
        setFilteredSubjects(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [])

  useEffect(() => {
    const filtered = subjects.filter(
      (subject) =>
        subject.screeningId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.hospital.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredSubjects(filtered)
    setCurrentPage(1)
  }, [searchTerm, subjects])

  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredSubjects.slice(startIndex, endIndex)

  const getConsentStatusColor = (status: string) => {
    switch (status) {
      case '동의':
        return 'bg-green-100 text-green-800'
      case '미동의':
        return 'bg-red-100 text-red-800'
      case '동기중':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConsentIcon = (status: string) => {
    switch (status) {
      case '동의':
        return <CheckCircle className="w-4 h-4" />
      case '동기중':
        return <Clock className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">임상시험 대상자 관리</h1>
        <p className="text-gray-600 mt-2">스크리닝 및 등록된 대상자 관리</p>
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
              placeholder="스크리닝ID, 이름, 병원으로 검색..."
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
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">대상자가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">스크리닝ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">나이</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">성별</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">진단명</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">병원</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">동의 상태</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((subject) => (
                  <tr key={subject.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{subject.screeningId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{subject.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{subject.age}세</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          subject.gender === '남'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-pink-100 text-pink-800'
                        }`}
                      >
                        {subject.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{subject.diagnosis}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{subject.hospital}</td>
                    <td className="px-6 py-4 text-sm">
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold w-fit ${getConsentStatusColor(
                          subject.consentStatus
                        )}`}
                      >
                        {getConsentIcon(subject.consentStatus)}
                        {subject.consentStatus}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredSubjects.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                전체 {filteredSubjects.length}명 | {startIndex + 1}-{Math.min(endIndex, filteredSubjects.length)}명 표시
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
