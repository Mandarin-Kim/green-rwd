'use client'
import { useState } from 'react'
import { FileSignature, Users, CheckCircle, Clock, XCircle, ChevronDown, Search, Filter, Eye, Send, BarChart3, Globe } from 'lucide-react'

const consentForms = [
  { id: 'ICF-001', version: 'v3.2', title: '주 동의서 (Main ICF)', language: '한국어', status: 'active', lastUpdated: '2024-01-15', subjects: 156 },
  { id: 'ICF-002', version: 'v2.1', title: '유전체 분석 동의서', language: '한국어', status: 'active', lastUpdated: '2024-01-10', subjects: 142 },
  { id: 'ICF-003', version: 'v1.0', title: '바이오뱅크 동의서', language: '한국어', status: 'active', lastUpdated: '2023-12-20', subjects: 138 },
  { id: 'ICF-004', version: 'v3.2', title: 'Main ICF (English)', language: 'English', status: 'active', lastUpdated: '2024-01-15', subjects: 44 },
  { id: 'ICF-005', version: 'v2.0', title: '소아 동의서/승낙서', language: '한국어', status: 'draft', lastUpdated: '2024-01-20', subjects: 0 },
]

const subjectConsents = [
  { subject: 'SCR-0045', name: '김**', site: '서울대병원', mainICF: 'signed', genomic: 'signed', biobank: 'signed', signDate: '2024-01-08', method: 'tablet' },
  { subject: 'SCR-0078', name: '이**', site: '세브란스병원', mainICF: 'signed', genomic: 'signed', biobank: 'declined', signDate: '2024-01-12', method: 'tablet' },
  { subject: 'SCR-0091', name: '박**', site: '고려대병원', mainICF: 'signed', genomic: 'pending', biobank: 'pending', signDate: '2024-01-14', method: 'remote' },
  { subject: 'SCR-0112', name: '최**', site: '삼성서울병원', mainICF: 'signed', genomic: 'signed', biobank: 'signed', signDate: '2024-01-16', method: 'tablet' },
  { subject: 'SCR-0134', name: '정**', site: '아산병원', mainICF: 'pending', genomic: 'pending', biobank: 'pending', signDate: '-', method: '-' },
  { subject: 'SCR-0156', name: '한**', site: '서울대병원', mainICF: 'signed', genomic: 'signed', biobank: 'signed', signDate: '2024-01-18', method: 'remote' },
  { subject: 'SCR-0167', name: '강**', site: '세브란스병원', mainICF: 'signed', genomic: 'declined', biobank: 'signed', signDate: '2024-01-19', method: 'tablet' },
]

const consentIcon: Record<string, { icon: React.ReactNode; color: string }> = {
  signed: { icon: <CheckCircle size={14} />, color: 'text-green-600' },
  pending: { icon: <Clock size={14} />, color: 'text-yellow-600' },
  declined: { icon: <XCircle size={14} />, color: 'text-red-500' },
}

export default function EConsentPage() {
  const [selectedStudy, setSelectedStudy] = useState('GR-ONC-2024-001')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'forms' | 'subjects'>('forms')

  const totalSubjects = 200
  const signedCount = 156
  const pendingCount = 32
  const declinedCount = 12

  const kpis = [
    { label: '동의 완료', value: signedCount.toString(), sub: `${((signedCount / totalSubjects) * 100).toFixed(1)}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '동의 대기', value: pendingCount.toString(), sub: `${((pendingCount / totalSubjects) * 100).toFixed(1)}%`, icon: Clock, color: 'text-[#F59E0B]', bg: 'bg-amber-50' },
    { label: '동의 거부', value: declinedCount.toString(), sub: `${((declinedCount / totalSubjects) * 100).toFixed(1)}%`, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '활성 동의서', value: consentForms.filter(f => f.status === 'active').length.toString(), sub: `총 ${consentForms.length}개 양식`, icon: FileSignature, color: 'text-[#0D9488]', bg: 'bg-teal-50' },
  ]

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">eConsent Management</h1>
          <p className="text-sm text-slate-500 mt-1">전자동의서 관리 및 서명 현황</p>
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
            <Send size={16} />
            동의서 발송
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
            <p className="text-xs text-slate-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Consent Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#0F172A]">전체 동의 진행률</h2>
          <span className="text-sm text-[#0D9488] font-semibold">{signedCount}/{totalSubjects}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 flex overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: `${(signedCount / totalSubjects) * 100}%` }} />
          <div className="bg-yellow-400 h-full" style={{ width: `${(pendingCount / totalSubjects) * 100}%` }} />
          <div className="bg-red-400 h-full" style={{ width: `${(declinedCount / totalSubjects) * 100}%` }} />
        </div>
        <div className="flex items-center gap-6 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> 동의 완료 {signedCount}명</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-yellow-400 rounded-full" /> 대기 {pendingCount}명</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-400 rounded-full" /> 거부 {declinedCount}명</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-lg p-1 shadow-sm border border-slate-100 w-fit">
        <button
          onClick={() => setActiveTab('forms')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'forms' ? 'bg-[#0D9488] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <span className="flex items-center gap-2"><FileSignature size={14} /> 동의서 양식</span>
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'subjects' ? 'bg-[#0D9488] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <span className="flex items-center gap-2"><Users size={14} /> 대상자별 현황</span>
        </button>
      </div>

      {/* Consent Forms Tab */}
      {activeTab === 'forms' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">동의서 양식 관리</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="양식 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 font-medium text-slate-600">양식 ID</th>
                  <th className="px-5 py-3 font-medium text-slate-600">버전</th>
                  <th className="px-5 py-3 font-medium text-slate-600">동의서명</th>
                  <th className="px-5 py-3 font-medium text-slate-600">언어</th>
                  <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                  <th className="px-5 py-3 font-medium text-slate-600">최종 수정일</th>
                  <th className="px-5 py-3 font-medium text-slate-600 text-center">서명 수</th>
                  <th className="px-5 py-3 font-medium text-slate-600">작업</th>
                </tr>
              </thead>
              <tbody>
                {consentForms.filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase())).map((form) => (
                  <tr key={form.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#0D9488]">{form.id}</td>
                    <td className="px-5 py-3 text-slate-700 font-mono text-xs">{form.version}</td>
                    <td className="px-5 py-3 font-medium text-[#0F172A]">{form.title}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-slate-600"><Globe size={12} /> {form.language}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${form.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{form.status === 'active' ? '활성' : '초쥈'}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{form.lastUpdated}</td>
                    <td className="px-5 py-3 text-center font-semibold text-[#0F172A]">{form.subjects}</td>
                    <td className="px-5 py-3">
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="미리보기">
                        <Eye size={14} className="text-slate-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">대상자별 동의 현황</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="대상자 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
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
                  <th className="px-5 py-3 font-medium text-slate-600">대상자 ID</th>
                  <th className="px-5 py-3 font-medium text-slate-600">이름</th>
                  <th className="px-5 py-3 font-medium text-slate-600">기관</th>
                  <th className="px-5 py-3 font-medium text-slate-600 text-center">주 동의서</th>
                  <th className="px-5 py-3 font-medium text-slate-600 text-center">유전체</th>
                  <th className="px-5 py-3 font-medium text-slate-600 text-center">바이오뱅크</th>
                  <th className="px-5 py-3 font-medium text-slate-600">서명일</th>
                  <th className="px-5 py-3 font-medium text-slate-600">방식</th>
                </tr>
              </thead>
              <tbody>
                {subjectConsents.filter(s => s.subject.includes(searchTerm) || s.site.includes(searchTerm)).map((s) => (
                  <tr key={s.subject} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#0D9488]">{s.subject}</td>
                    <td className="px-5 py-3 text-slate-700">{s.name}</td>
                    <td className="px-5 py-3 text-slate-700">{s.site}</td>
                    <td className="px-5 py-3 text-center"><span className={consentIcon[s.mainICF].color}>{consentIcon[s.mainICF].icon}</span></td>
                    <td className="px-5 py-3 text-center"><span className={consentIcon[s.genomic].color}>{consentIcon[s.genomic].icon}</span></td>
                    <td className="px-5 py-3 text-center"><span className={consentIcon[s.biobank].color}>{consentIcon[s.biobank].icon}</span></td>
                    <td className="px-5 py-3 text-slate-500">{s.signDate}</td>
                    <td className="px-5 py-3">
                      {s.method !== '-' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.method === 'tablet' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {s.method === 'tablet' ? '태블릿' : '원격'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
