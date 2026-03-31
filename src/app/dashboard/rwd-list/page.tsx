'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2, AlertCircle, Users, MapPin } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface RWDRecord {
  id: string
  patientId: string
  diagnosis: string
  hospital: string
  age: number
  gender: 'ë¨' | 'ì¬'
  lastVisit: string
  medication?: string[]
  notes?: string
}

export default function RWDListPage() {
  const [rwdData, setRwdData] = useState<RWDRecord[]>([])
  const [filteredData, setFilteredData] = useState<RWDRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchRWDData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/rwd')
        setRwdData(data || [])
        setFilteredData(data || [])
      } catch (err) {
        console.error('Failed to fetch RWD data:', err)
        setError('RWD ë°ì´í°ë¥¼ ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.')
        // Fallback data
        const fallbackData: RWDRecord[] = [
          {
            id: '1',
            patientId: 'P001',
            diagnosis: 'ì 2í ë¹ë¨ë³',
            hospital: 'ìì¸ìë£ì',
            age: 62,
            gender: 'ë¨',
            lastVisit: '2026-03-20',
            medication: ['ë©í¸í¬ë¥´ë¯¼', 'ê¸ë¦½íì´ë'],
          },
          {
            id: '2',
            patientId: 'P002',
            diagnosis: 'ì 2í ë¹ë¨ë³',
            hospital: 'ê²½í¬ìë£ì',
            age: 58,
            gender: 'ì¬',
            lastVisit: '2026-03-18',
            medication: ['ë©í¸í¬ë¥´ë¯¼'],
          },
          {
            id: '3',
            patientId: 'P003',
            diagnosis: 'ê³ íì',
            hospital: 'ì¢ë¡ìë£ì',
            age: 71,
            gender: 'ë¨',
            lastVisit: '2026-03-15',
            medication: ['ë¦¬ìë¸íë¦´', 'ìë¡ëí'],
          },
          {
            id: '4',
            patientId: 'P004',
            diagnosis: 'ê³ íì',
            hospital: 'ìì¸ìë£ì',
            age: 55,
            gender: 'ì¬',
            lastVisit: '2026-03-21',
            medication: ['ì¹¼ììì±ëì°¨ë¨ì '],
          },
          {
            id: '5',
            patientId: 'P005',
            diagnosis: 'ê³ ì½ë ì¤íë¡¤íì¦',
            hospital: 'ê²½í¬ìë£ì',
            age: 67,
            gender: 'ë¨',
            lastVisit: '2026-03-19',
            medication: ['ì¤íí´'],
          },
        ]
        setRwdData(fallbackData)
        setFilteredData(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchRWDData()
  }, [])

  useEffect(() => {
    const filtered = rwdData.filter(
      (record) =>
        record.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.hospital.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredData(filtered)
    setCurrentPage(1)
  }, [searchTerm, rwdData])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">RWD ë°ì´í° ëª©ë¡</h1>
        <p className="text-gray-600 mt-2">ì¤ì  ìì íì ë°ì´í° ì¡°í</p>
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
              placeholder="íìID, ì§ë¨ëª, ë³ìì¼ë¡ ê²ì..."
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
            <p className="text-gray-500">ë°ì´í°ê° ììµëë¤.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">íìID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì§ë¨ëª</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ë³ì</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ëì´</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì±ë³</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ë§ì§ë§ ë°©ë¬¸</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((record) => (
                  <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{record.patientId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.diagnosis}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        {record.hospital}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.age}ì¸</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.gender === 'ë¨'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-pink-100 text-pink-800'
                        }`}
                      >
                        {record.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.lastVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredData.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ì ì²´ {filteredData.length}ëª | {startIndex + 1}-{Math.min(endIndex, filteredData.length)}ëª íì
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
