'use client'
import { useState } from 'react'
import { FolderOpen, FileText, CheckCircle, Clock, AlertCircle, Search, Filter, Download, ChevronDown, Upload, Eye } from 'lucide-react'

const tmfSections = [
  { zone: 'Zone 01', name: 'Trial Management', total: 45, approved: 42, pending: 2, missing: 1, rate: 93 },
  { zone: 'Zone 02', name: 'Central Trial Docs', total: 38, approved: 35, pending: 2, missing: 1, rate: 92 },
  { zone: 'Zone 03', name: 'Regulatory', total: 52, approved: 50, pending: 1, missing: 1, rate: 96 },
  { zone: 'Zone 04', name: 'IRB/IEC', total: 30, approved: 28, pending: 1, missing: 1, rate: 93 },
  { zone: 'Zone 05', name: 'Site Management', total: 65, approved: 58, pending: 4, missing: 3, rate: 89 },
  { zone: 'Zone 06', name: 'IP & Trial Supplies', total: 28, approved: 25, pending: 2, missing: 1, rate: 89 },
  { zone: 'Zone 07', name: 'Safety Reporting', total: 35, approved: 33, pending: 1, missing: 1, rate: 94 },
  { zone: 'Zone 08', name: 'Monitoring', total: 48, approved: 40, pending: 5, missing: 3, rate: 83 },
  { zone: 'Zone 09', name: 'Statistics', total: 22, approved: 20, pending: 1, missing: 1, rate: 91 },
  { zone: 'Zone 10', name: 'Data Management', total: 18, approved: 16, pending: 1, missing: 1, rate: 89 },
]

const recentDocs = [
  { name: 'Protocol Amendment v3.0', zone: 'Zone 01', uploadedBy: '김연구', date: '2024-01-22', status: 'approved', size: '2.4 MB' },
  { name: 'IRB Approval Letter - Samsung', zone: 'Zone 04', uploadedBy: '이임상', date: '2024-01-21', status: 'pending', size: '1.1 MB' },
  { name: 'Monitoring Visit Report #12', zone: 'Zone 08', uploadedBy: '박모니터', date: '2024-01-20', status: 'approved', size: '3.8 MB' },
  { name: 'DSMB Meeting Minutes', zone: 'Zone 01', uploadedBy: '최안전', date: '2024-01-19', status: 'review', size: '0.9 MB' },
  { name: 'IP Accountability Log', zone: 'Zone 06', uploadedBy: '정약사', date: '2024-01-18', status: 'approved', size: '1.5 MB' },
  { name: 'SAE Narrative - SCR-0045', zone: 'Zone 07', uploadedBy: '한의사', date: '2024-01-17', status: 'pending', size: '0.7 MB' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  approved: { label: '승인됨', color: 'bg-green-100 text-green-700' },
  pending: { label: '검토대기', color: 'bg-yellow-100 text-yellow-700' },
  review: { label: '검토중', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
}

export default function ETMFPage() {
  const [selectedStudy, setSelectedStudy] = useState('GR-ONC-2024-001')
  const [searchTerm, setSearchTerm] = useState('')

  const totalDocs = tmfSections.reduce((s, t) => s + t.total, 0)
  const totalApproved = tmfSections.reduce((s, t) => s + t.approved, 0)
  const totalPending = tmfSections.reduce((s, t) => s + t.pending, 0)
  const totalMissing = tmfSections.reduce((s, t) => s + t.missing, 0)

  const kpis = [
    { label: '총 문서 수', value: totalDocs.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '승인 완료', value: totalApproved.toString(), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '검토 대기', value: totalPending.toString(), icon: Clock, color: 'text-[#F59E0B]', bg: 'bg-amber-50' },
    { label: '누락 문서', value: totalMissing.toString(), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">eTMF Management</h1>
          <p className="text-sm text-slate-500 mt-1">전자 시험 마스터 파일 관리 시스템</p>
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
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 bg-[#0D9488] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0B7C72] transition-colors">
            <Upload size={16} />
            문섞 업로드
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
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* TMF Zone Completeness */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-[#0D9488]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">TMF Zone 완성도</h2>
            </div>
            <span className="text-sm text-slate-500">전체 완성률: <strong className="text-[#0D9488]">{Math.round((totalApproved / totalDocs) * 100)}%</strong></span>
          </div>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {tmfSections.map((section) => (
              <div key={section.zone} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-20 text-xs font-mono font-medium text-[#0D9488]">{section.zone}</div>
                <div className="w-44 text-sm font-medium text-[#0F172A]">{section.name}</div>
                <div className="flex-1">
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${section.rate >= 95 ? 'bg-green-500' : section.rate >= 90 ? 'bg-[#0D9488]' : section.rate >= 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${section.rate}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-semibold text-[#0F172A]">{section.rate}%</div>
                <div className="flex items-center gap-3 text-xs text-slate-500 w-48">
                  <span className="text-green-600">{section.approved} 승인</span>
                  <span className="text-yellow-600">{section.pending} 대기</span>
                  <span className="text-red-600">{section.missing} 누락</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F172A]">최근 업로드 문서</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="문섞 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                <Filter size={14} />
                필터
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 font-medium text-slate-600">문서명</th>
                <th className="px-5 py-3 font-medium text-slate-600">Zone</th>
                <th className="px-5 py-3 font-medium text-slate-600">업로드자</th>
                <th className="px-5 py-3 font-medium text-slate-600">날짜</th>
                <th className="px-5 py-3 font-medium text-slate-600">크기</th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 font-medium text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                <tr key={doc.name} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      <span className="font-medium text-[#0F172A]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-[#0D9488]">{doc.zone}</td>
                  <td className="px-5 py-3 text-slate-700">{doc.uploadedBy}</td>
                  <td className="px-5 py-3 text-slate-500">{doc.date}</td>
                  <td className="px-5 py-3 text-slate-500">{doc.size}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[doc.status].color}`}>{statusConfig[doc.status].label}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="보기">
                        <Eye size={14} className="text-slate-500" />
                      </button>
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="다운로드">
                        <Download size={14} className="text-slate-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
