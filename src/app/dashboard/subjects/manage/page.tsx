'use client'
import { useState } from 'react'
import { Users, Plus, Search, Filter, Edit2, Trash2, X, Save, ChevronDown, Download, Eye } from 'lucide-react'

type Subject = {
  id: string; name: string; age: number; gender: string; site: string; status: string; enrollDate: string; phone: string; diagnosis: string
}

const initialSubjects: Subject[] = [
  { id: 'SCR-0045', name: '김민수', age: 58, gender: '남', site: '서울대병원', status: '등록완료', enrollDate: '2024-01-08', phone: '010-1234-5678', diagnosis: '비소세포폐암' },
  { id: 'SCR-0078', name: '이영희', age: 45, gender: '여', site: '세브란스병원', status: '스크리닝', enrollDate: '2024-01-12', phone: '010-2345-6789', diagnosis: '유방암' },
  { id: 'SCR-0091', name: '박철수', age: 62, gender: '남', site: '고려대병원', status: '등록완료', enrollDate: '2024-01-14', phone: '010-3456-7890', diagnosis: '대장암' },
  { id: 'SCR-0112', name: '최수진', age: 51, gender: '여', site: '삼성서울병원', status: '동의철회', enrollDate: '2024-01-16', phone: '010-4567-8901', diagnosis: '위암' },
  { id: 'SCR-0134', name: '정하늘', age: 39, gender: '남', site: '아산병원', status: '스크리닝', enrollDate: '2024-01-18', phone: '010-5678-9012', diagnosis: '간암' },
  { id: 'SCR-0156', name: '한지원', age: 55, gender: '여', site: '서울대병원', status: '등록완료', enrollDate: '2024-01-20', phone: '010-6789-0123', diagnosis: '비소세포폐암' },
  { id: 'SCR-0167', name: '강도윤', age: 48, gender: '남', site: '세브란스병원', status: '부적격', enrollDate: '2024-01-22', phone: '010-7890-1234', diagnosis: '췌장암' },
  { id: 'SCR-0189', name: '윤서연', age: 43, gender: '여', site: '삼성서울병원', status: '등록완료', enrollDate: '2024-01-24', phone: '010-8901-2345', diagnosis: '난소암' },
]

const statusColor: Record<string, string> = {
  '등록완료': 'bg-green-100 text-green-700',
  '스크리닝': 'bg-blue-100 text-blue-700',
  '동의철회': 'bg-red-100 text-red-700',
  '부적격': 'bg-slate-100 text-slate-600',
  '추적관찰': 'bg-yellow-100 text-yellow-700',
}

const emptySubject: Subject = { id: '', name: '', age: 0, gender: '남', site: '', status: '스크리닝', enrollDate: '', phone: '', diagnosis: '' }

export default function SubjectsManagePage() {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentSubject, setCurrentSubject] = useState<Subject>(emptySubject)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState<Subject | null>(null)

  const filtered = subjects.filter(s => {
    const matchSearch = s.name.includes(searchTerm) || s.id.includes(searchTerm) || s.site.includes(searchTerm)
    const matchStatus = filterStatus === '전체' || s.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleCreate = () => {
    const newId = `SCR-${String(subjects.length * 11 + 200).padStart(4, '0')}`
    setCurrentSubject({ ...emptySubject, id: newId, enrollDate: new Date().toISOString().split('T')[0] })
    setEditMode(false)
    setShowModal(true)
  }

  const handleEdit = (s: Subject) => {
    setCurrentSubject({ ...s })
    setEditMode(true)
    setShowModal(true)
  }

  const handleSave = () => {
    if (!currentSubject.name || !currentSubject.site) return
    if (editMode) {
      setSubjects(prev => prev.map(s => s.id === currentSubject.id ? currentSubject : s))
    } else {
      setSubjects(prev => [...prev, currentSubject])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id))
    setShowDeleteConfirm(null)
  }

  const stats = {
    total: subjects.length,
    enrolled: subjects.filter(s => s.status === '등록완료').length,
    screening: subjects.filter(s => s.status === '스크리닝').length,
    withdrawn: subjects.filter(s => s.status === '동의철회' || s.status === '부적격').length,
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">대상자 관리</h1>
          <p className="text-sm text-slate-500 mt-1">임상시험 대상자 등록, 수정, 삭제 및 현황 관리</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 bg-[#0D9488] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0B7C72] transition-colors">
          <Plus size={16} /> 대상자 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체 대상자', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '등록 완료', value: stats.enrolled, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '스크리닝 중', value: stats.screening, color: 'text-[#0D9488]', bg: 'bg-teal-50' },
          { label: '철회/부적격', value: stats.withdrawn, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="이름, ID, 기관 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488] w-64" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm">
                <option value="전체">전체 상태</option>
                <option value="등록완료">등록완료</option>
                <option value="스크리닝">스크리닝</option>
                <option value="동의철회">동의철회</option>
                <option value="부적격">부적격</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <button className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"><Download size={14} /> 내보내기</button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 font-medium text-slate-600">대상자 ID</th>
                <th className="px-5 py-3 font-medium text-slate-600">이름</th>
                <th className="px-5 py-3 font-medium text-slate-600">나이/성별</th>
                <th className="px-5 py-3 font-medium text-slate-600">기관</th>
                <th className="px-5 py-3 font-medium text-slate-600">진단명</th>
                <th className="px-5 py-3 font-medium text-slate-600">상태</th>
                <th className="px-5 py-3 font-medium text-slate-600">등록일</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#0D9488]">{s.id}</td>
                  <td className="px-5 py-3 text-[#0F172A] font-medium">{s.name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.age}세 / {s.gender}</td>
                  <td className="px-5 py-3 text-slate-700">{s.site}</td>
                  <td className="px-5 py-3 text-slate-700">{s.diagnosis}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[s.status] || ''}`}>{s.status}</span></td>
                  <td className="px-5 py-3 text-slate-500">{s.enrollDate}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setShowDetail(s)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="상세보기"><Eye size={14} className="text-slate-500" /></button>
                      <button onClick={() => handleEdit(s)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="수정"><Edit2 size={14} className="text-blue-500" /></button>
                      <button onClick={() => setShowDeleteConfirm(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="삭제"><Trash2 size={14} className="text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-500">총 {filtered.length}명 (전체 {subjects.length}명)</div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-[#0F172A]">{editMode ? '대상자 수정' : '대상자 등록'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">대상자 ID</label>
                  <input value={currentSubject.id} readOnly className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">이름 *</label>
                  <input value={currentSubject.name} onChange={e => setCurrentSubject(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" placeholder="홍기동" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">나이</label>
                  <input type="number" value={currentSubject.age || ''} onChange={e => setCurrentSubject(p => ({ ...p, age: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">성별</label>
                  <select value={currentSubject.gender} onChange={e => setCurrentSubject(p => ({ ...p, gender: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">기관 *</label>
                  <select value={currentSubject.site} onChange={e => setCurrentSubject(p => ({ ...p, site: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">선택</option>
                    <option>서울대병원</option><option>세브란스병원</option><option>삼성서울병원</option><option>아산병원</option><option>고려대병원</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">진단명</label>
                  <input value={currentSubject.diagnosis} onChange={e => setCurrentSubject(p => ({ ...p, diagnosis: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">연락처</label>
                  <input value={currentSubject.phone} onChange={e => setCurrentSubject(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" placeholder="010-0000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">상태</label>
                  <select value={currentSubject.status} onChange={e => setCurrentSubject(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option>스크리닝</option><option>등록완료</option><option>추적관찰</option><option>동의철회</option><option>부적격</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 text-sm bg-[#0D9488] text-white rounded-lg hover:bg-[#0B7C72]"><Save size={14} /> 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[480px]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-[#0F172A]">대상자 상세정보</h3>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[['대상자 ID', showDetail.id], ['이름', showDetail.name], ['나이/성별', `${showDetail.age}세 / ${showDetail.gender}`], ['기관', showDetail.site], ['진단명', showDetail.diagnosis], ['연락처', showDetail.phone], ['상태', showDetail.status], ['등록일', showDetail.enrollDate]].map(([l, v]) => (
                <div key={l} className="flex"><span className="w-24 text-xs text-slate-500 shrink-0">{l}</span><span className="text-sm font-medium text-[#0F172A]">{v}</span></div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button onClick={() => { handleEdit(showDetail); setShowDetail(null) }} className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Edit2 size={14} /> 수정</button>
              <button onClick={() => setShowDetail(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[360px] p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">대상자 삭제</h3>
            <p className="text-sm text-slate-500 mb-5">대상자 {showDeleteConfirm}을(를) 삭제하시겠습니까?<br />이 작업���	���κkBȉ��xnȫ^�����B�����F�b6�74��S�&f�W��W7F�g��6V�FW"v�"#��'WGF����6Ɩ6�ײ����6WE6��tFV�WFT6��f�&҆�V��6�74��S�'��B��"FW�B�6�&�&FW"&�&FW"�6�FR�#&�V�FVB��r��fW#�&r�6�FR�S#��z��h���'WGF����'WGF����6Ɩ6�ײ������F�TFV�WFR�6��tFV�WFT6��f�&җ�6�74��S�'��B��"FW�B�6�&r�&VB�SFW�B�v��FR&�V�FVB��r��fW#�&r�&VB�c#��*��	���'WGF�����F�c���F�c���F�c��Т��F�c����