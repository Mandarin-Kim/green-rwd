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
  status: '적 격' | '부적 격' | '검토 중'
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
        const fallbackData = [{ id: '1', screeningId: 'SCR-2026-001', name: '김철 수', diagnosis: '제 2형 당뇨병', age: 62, inclusion: true, exclusion: false, labTests: true, clinicalEvaluation: true, status: '적 격', lastUpdated: '2026-03-20' }];
        setQualifications(fallbackData)
        setFilteredQualifications(fallbackData)
      } finally { setLoading(false) }
    }
    fetchQualifications()
  }, [])

  return <div><h1>적 격 평가</h1></div>
}
