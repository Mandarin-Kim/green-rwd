'use client'
import { useState } from 'react'
import { AlertTriangle, Shield, Clock, FileText, ChevronDown, Search, Filter, Bell, TrendingUp, Activity } from 'lucide-react'

const saeAlerts = [
  { id: 'SAE-2024-001', subject: 'SCR-0045', site: '서울대병원', event: '급성 간손상', grade: 'Grade 3', status: '보고완료', reportDate: '2024-01-15', dueDate: '2024-01-22', daysLeft: 0 },
  { id: 'SAE-2024-002', subject: 'SCR-0078', site: '세브란스병원', event: '아나필락시스', grade: 'Grade 4', status: '검토중', reportDate: '2024-01-18', dueDate: '2024-01-25', daysLeft: 2 },
  { id: 'SAE-2024-003', subject: 'SCR-0112', site: '삼성서울병원', event: '심근경색', grade: 'Grade 4', status: '초기보고', reportDate: '2024-01-20', dueDate: '2024-01-27', daysLeft: 5 },
  { id: 'SAE-2024-004', subject: 'SCR-0034', site: '아산병원', event: '폐색전증', grade: 'Grade 3', status: '보고완료', reportDate: '2024-01-10', dueDate: '2024-01-17', daysLeft: 0 },
  { id: 'SAE-2024-005', subject: 'SCR-0091', site: '고려대병원', event: '패혈증', grade: 'Grade 3', status: '후속보고', reportDate: '2024-01-22', dueDate: '2024-01-29', daysLeft: 4 },
]

const aeData = [
  { term: '두통', total: 45, mild: 30, moderate: 12, severe: 3, related: 18, rate: '22.5%' },
  { term: '오심', total: 38, mild: 25, moderate: 10, severe: 3, related: 15, rate: '19.0%' },
  { term: '피로', total: 32, mild: 22, moderate: 8, severe: 2, related: 12, rate: '16.0%' },
  { term: '설사', total: 28, mild: 20, moderate: 6, severe: 2, related: 10, rate: '14.0%' },
  { term: '발진', total: 18, mild: 12, moderate: 4, severe: 2, related: 8, rate: '9.0%' },
  { term: '어지러움', total: 15, mild: 10, moderate: 4, severe: 1, related: 6, rate: '7.5%' },
  { term: '관절통', total: 12, mild: 8, moderate: 3, severe: 1, related: 5, rate: '6.0%' },
]

const statusColor: Record<string, string> = {
  '보고완료': 'bg-green-100 text-green-700',
  '검토중': 'bg-yellow-100 text-yellow-700',
  '초기보고': 'bg-red-100 text-red-700',
  '후속보고': 'bg-blue-100 text-blue-700',
}

const gradeColor: Record<string, string> = {
  'Grade 1': 'text-green-600',
  'Grade 2': 'text-yellow-600',
  'Grade 3': 'text-orange-600',
  'Grade 4': 'text-red-600',
  'Grade 5': 'text-red-800 font-bold',
}

export default function SafetyPage() {
  const [selectedStudy, setSelectedStudy] = useState('GR-ONC-2024-001')
  const [searchTerm, setSearchTerm] = useState('')

  const kpis = [
    { label: '총 AE 건수', value: '188', change: '+12', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'SAE 건수', value: '5', change: '+1', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '평균 보고 소요일', value: '3.2일', change: '-0.5', icon: Clock, color: 'text-[#0D9488]', bg: 'bg-teal-50' },
    { label: '규정 준수율', value: '96.8%', change: '+1.2%', icon: Shield, color: 'text-[#F59E0B]', bg: 'bg-amber-50' },
  ]

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Safety Management</h1>
          <p className="text-sm text-slate-500 mt-1">안전성 데이터 관리 및 SAE/AE 모니터링</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedStudy}
              onChange={(e) => setSelectedStudy(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="GR-ONC-2024-001">GR-ONC-2024-001</option>
              <option value="GR-CNS-2024-002">GR-CNS-2024-002</option>
              <option value="GR-CV-2024-003">GR-CV-2024-003</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors">
            <Bell size={16} />
            긴급 SAE 보고
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <span className={`text-xs font-medium ${kpi.change.startsWith('+') && kpi.label !== 'SAE 건수' ? 'text-green-600' : kpi.change.startsWith('-') ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* SAE Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h2 className="text-lg font-semibold text-[#0F172A]">SAE Alerts</h2>
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">5건</span>
            </div>
            <button className="text-sm text-[#0D9488] hover:underline">전체보기</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 font-medium text-slate-600">SAE ID</th>
                <th className="px-5 py-3 font-medium text-slate-600">대상자</th>
                <th className="px-5 py-3 font-medium text-slate-600">기관</th>
                <th className="px-5 py-3 font-medium text-slate-600">이상반응</th>
                <th className="px-5 py-3 font-medium text-slate-600">중증도</th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 font-medium text-slate-600">보고일</th>
                <th className="px-5 py-3 font-medium text-slate-600">마감일</th>
              </tr>
            </thead>
            <tbody>
              {saeAlerts.map((sae) => (
                <tr key={sae.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-5 py-3 font-medium text-[#0D9488]">{sae.id}</td>
                  <td className="px-5 py-3 text-slate-700">{sae.subject}</td>
                  <td className="px-5 py-3 text-slate-700">{sae.site}</td>
                  <td className="px-5 py-3 text-slate-700 font-medium">{sae.event}</td>
                  <td className={`px-5 py-3 font-medium ${gradeColor[sae.grade]}`}>{sae.grade}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[sae.status]}`}>{sae.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{sae.reportDate}</td>
                  <td className="px-5 py-3">
                    <span className={sae.daysLeft <= 2 ? 'text-red-600 font-medium' : 'text-slate-500'}>{sae.dueDate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AE Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F172A]">AE Summary by Preferred Term</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="AE 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                <Filter size={14} />
                필터
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                <FileText size={14} />
                내보내기
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 font-medium text-slate-600">Preferred Term</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">총 건수</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">경증</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">중등증</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">중증</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">약물 관련</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">발생률</th>
                <th className="px-5 py-3 font-medium text-slate-600">분포</th>
              </tr>
            </thead>
            <tbody>
              {aeData.filter(ae => ae.term.includes(searchTerm)).map((ae) => (
                <tr key={ae.term} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#0F172A]">{ae.term}</td>
                  <td className="px-5 py-3 text-center font-semibold text-[#0F172A]">{ae.total}</td>
                  <td className="px-5 py-3 text-center text-green-600">{ae.mild}</td>
                  <td className="px-5 py-3 text-center text-yellow-600">{ae.moderate}</td>
                  <td className="px-5 py-3 text-center text-red-600">{ae.severe}</td>
                  <td className="px-5 py-3 text-center text-[#0D9488]">{ae.related}</td>
                  <td className="px-5 py-3 text-center font-medium">{ae.rate}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 h-4">
                      <div className="bg-green-400 h-full rounded-l" style={{ width: `${(ae.mild / ae.total) * 100}px` }} />
                      <div className="bg-yellow-400 h-full" style={{ width: `${(ae.moderate / ae.total) * 100}px` }} />
                      <div className="bg-red-400 h-full rounded-r" style={{ width: `${(ae.severe / ae.total) * 100}px` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">총 {aeData.length}개 Preferred Term</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-sm" /> 경증(Mild)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm" /> 중등증(Moderate)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm" /> 중증(Severe)</span>
          </div>
        </div>
      </div>

      {/* Reporting Timeline */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">보고 타임라인 현황</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-3xl font-bold text-green-600">142</p>
            <p className="text-sm text-slate-600 mt-1">기한 내 보고</p>
            <p className="text-xs text-slate-400 mt-0.5">75.5%</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-xl">
            <p className="text-3xl font-bold text-yellow-600">38</p>
            <p className="text-sm text-slate-600 mt-1">보고 진행중</p>
            <p className="text-xs text-slate-400 mt-0.5">20.2%</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-3xl font-bold text-red-600">8</p>
            <p className="text-sm text-slate-600 mt-1">기한 초과</p>
            <p className="text-xs text-slate-400 mt-0.5">4.3%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
