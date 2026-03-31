'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Search, Clock } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface QualifyItem {
  id: string
  screeningId: string
  name: string
  diagnosis: string
  age: number
  inclusion: boolean
  exclusion: boolean
  labTests: boolean
  clinicalEvaluation: boolean
  status: string
  notes?: string
  lastUpdated: string
}

const FALLBACK: QualifyItem[] = [
  { id:'1', screeningId:'SCR-2026-001', name:'김철수', diagnosis:'제2형 당뇨병', age:62, inclusion:true, exclusion:false, labTests:true, clinicalEvaluation:true, status:'적격', lastUpdated:'2026-03-20' },
  { id:'2', screeningId:'SCR-2026-002', name:'이영미', diagnosis:'제2형 당뇨병', age:58, inclusion:true, exclusion:false, labTests:true, clinicalEvaluation:true, status:'적격', lastUpdated:'2026-03-18' },
  { id:'3', screeningId:'SCR-2026-003', name:'박선민', diagnosis:'고혈압', age:71, inclusion:true, exclusion:true, labTests:true, clinicalEvaluation:false, status:'부적격', notes:'제외기준: 신부전 병력', lastUpdated:'2026-03-17' },
  { id:'4', screeningId:'SCR-2026-004', name:'윤서지', diagnosis:'고혈압', age:55, inclusion:true, exclusion:false, labTests:true, clinicalEvaluation:null, status:'검토중', lastUpdated:'2026-03-19' },
  { id:'5', screeningId:'SCR-2026-005', name:'조성호', diagnosis:'고콜레스테롤혈증', age:67, inclusion:false, exclusion:false, labTests:false, clinicalEvaluation:false, status:'부적격', notes:'포함기준 미충족', lastUpdated:'2026-03-16' },
  { id:'6', screeningId:'SCR-2026-006', name:'장미영', diagnosis:'제2형 당뇨병', age:60, inclusion:true, exclusion:false, labTests:null, clinicalEvaluation:null, status:'검토중', lastUpdated:'2026-03-21' },
]

export default function SubjectsQualifyPage() {
  const [data, setData] = useState<QualifyItem[]>([])
  const [filtered, setFiltered] = useState<QualifyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('전체')

  useEffect(() => {
    apiGet('/api/subjects').then(d => { setData(d || []); setFiltered(d || []) })
      .catch(() => { setData(FALLBACK); setFiltered(FALLBACK) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let f = data.filter(q => q.screeningId.toLowerCase().includes(search.toLowerCase()) || q.name.includes(search))
    if (filter !== '전체') f = f.filter(q => q.status === filter)
    setFiltered(f)
  }, [search, filter, data])

  const stats = {
    ok: data.filter(q => q.status === '적격').length,
    no: data.filter(q => q.status === '부적격').length,
    rev: data.filter(q => q.status === '검토중').length,
  }

  const sc = (s: string) => s === '적격' ? 'bg-green-100 text-green-800' : s === '부적격' ? 'bg-red-100 text-red-800' : s === '검토중' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
  const si = (s: string) => s === '적격' ? <CheckCircle className="w-4 h-4" /> : s === '부적격' ? <XCircle className="w-4 h-4" /> : s === '검토중' ? <Clock className="w-4 h-4" /> : null
  const bc = (v: any) => v === true ? 'bg-green-100 text-green-800' : v === false ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
  const bt = (v: any) => v === true ? 'O' : v === false ? 'X' : '-'

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">임상시험 대상자 적격 평가</h1>
        <p className="text-gray-600 mt-2">대상자 포함/제외 기준 및 적격성 평가</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div><p className="text-sm text-green-700 font-medium">적격</p><p className="text-2xl font-bold text-green-900">{stats.ok}</p></div>
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div><p className="text-sm text-red-700 font-medium">부적격</p><p className="text-2xl font-bold text-red-900">{stats.no}</p></div>
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div><p className="text-sm text-yellow-700 font-medium">검토중</p><p className="text-2xl font-bold text-yellow-900">{stats.rev}</p></div>
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="스크리닝ID, 이름으로 검색..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['전체','적격','부적격','검토중'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{s}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500">검색 결과가 없습니다.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">스크리닝ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">나이</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">진단</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">포함/제외</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">검사</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">평가</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">최종상태</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{q.screeningId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{q.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{q.age}세</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{q.diagnosis}</td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs font-semibold ${q.inclusion && !q.exclusion ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{q.inclusion && !q.exclusion ? 'O' : 'X'}</span></td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs font-semibold ${bc(q.labTests)}`}>{bt(q.labTests)}</span></td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs font-semibold ${bc(q.clinicalEvaluation)}`}>{bt(q.clinicalEvaluation)}</span></td>
                    <td className="px-6 py-4 text-sm"><div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold w-fit ${sc(q.status)}`}>{si(q.status)}{q.status}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
