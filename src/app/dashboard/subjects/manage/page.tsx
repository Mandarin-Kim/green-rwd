'use client'
import { useState } from 'react'
import { Users, Plus, Search, Filter, Edit2, Trash2, X, Save, ChevronDown, Download, Eye } from 'lucide-react'

type Subject = {
  id: string; name: string; age: number; gender: string; site: string; status: string; enrollDate: string; phone: string; diagnosis: string
}

const initialSubjects: Subject[] = [
  { id: 'SCR-0045', name: 'ê¹€ë¯¼ìˆ˜', age: 58, gender: 'ë‚¨', site: 'ì„œìš¸ëŒ€ë³‘ì›', status: 'ë“±ë¡ì™„ë£Œ', enrollDate: '2024-01-08', phone: '010-1234-5678', diagnosis: 'ë¹„ì†Œì„¸í¬íì•”' },
  { id: 'SCR-0078', name: 'ì´ì˜í¬', age: 45, gender: 'ì—¬', site: 'ì„¸ë¸Œëž€ìŠ¤ë³‘ì›', status: 'ìŠ¤í¬ë¦¬ë‹', enrollDate: '2024-01-12', phone: '010-2345-6789', diagnosis: 'ìœ ë°©ì•”' },
  { id: 'SCR-0091', name: 'ë°•ì² ìˆ˜', age: 62, gender: 'ë‚¨', site: 'ê³ ë ¤ëŒ€ë³‘ì›', status: 'ë“±ë¡ì™„ë£Œ', enrollDate: '2024-01-14', phone: '010-3456-7890', diagnosis: 'ëŒ€ìž¥ì•”' },
  { id: 'SCR-0112', name: 'ìµœìˆ˜ì§„', age: 51, gender: 'ì—¬', site: 'ì‚¼ì„±ì„œìš¸ë³‘ì›', status: 'ë™ì˜ì² íšŒ', enrollDate: '2024-01-16', phone: '010-4567-8901', diagnosis: 'ìœ„ì•”' },
  { id: 'SCR-0134', name: 'ì •í•˜ëŠ˜', age: 39, gender: 'ë‚¨', site: 'ì•„ì‚°ë³‘ì›', status: 'ìŠ¤í¬ë¦¬ë‹', enrollDate: '2024-01-18', phone: '010-5678-9012', diagnosis: 'ê°„ì•”' },
  { id: 'SCR-0156', name: 'í•œì§€ì›', age: 55, gender: 'ì—¬', site: 'ì„œìš¸ëŒ€ë³‘ì›', status: 'ë“±ë¡ì™„ë£Œ', enrollDate: '2024-01-20', phone: '010-6789-0123', diagnosis: 'ë¹„ì†Œì„¸í¬íì•”' },
  { id: 'SCR-0167', name: 'ê°•ë„ìœ¤', age: 48, gender: 'ë‚¨', site: 'ì„¸ë¸Œëœ€ìŠ¤ë³‘ì›', status: 'ë¶€ì ê²©', enrollDate: '2024-01-22', phone: '010-7890-1234', diagnosis: 'ì·Œìž¥ì•”' },
  { id: 'SCR-0189', name: 'ìœ¤ì„œì—°', age: 43, gender: 'ì—¬', site: 'ì‚¼ì„±ì„œìš¸ë³‘ì›', status: 'ë“±ë¡ì™„ë£Œ', enrollDate: '2024-01-24', phone: '010-8901-2345', diagnosis: 'ë‚œì†¬È•”' },
]

const statusColor: Record<string, string> = {
  'ë“±ë¡ì™„ë£Œ': 'bg-green-100 text-green-700',
  'ìŠ¤í¬ë¦¬ë‹': 'bg-blue-100 text-blue-700',
  'ë™ì˜ì² íšŒ': 'bg-red-100 text-red-700',
  'ë¶€ì ê²©': 'bg-slate-100 text-slate-600',
  'ì¶”ì ê´€ì°°': 'bg-yellow-100 text-yellow-700',
}

const emptySubject: Subject = { id: '', name: '', age: 0, gender: 'ë‚¨', site: '', status: 'ìŠ¤í¬ë¦¬ë‹', enrollDate: '', phone: '', diagnosis: '' }

export default function SubjectsManagePage() {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ì „ì²´')
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentSubject, setCurrentSubject] = useState<Subject>(emptySubject)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState<Subject | null>(null)

  const filtered = subjects.filter(s => {
    const matchSearch = s.name.includes(searchTerm) || s.id.includes(searchTerm) || s.site.includes(searchTerm)
    const matchStatus = filterStatus === 'ì „ì²´' || s.status === filterStatus
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
    enrolled: subjects.filter(s => s.status === 'ë“±ë¡ì™„ë£Œ').length,
    screening: subjects.filter(s => s.status === 'ìŠ¤í¬ë¦¬ë‹').length,
    withdrawn: subjects.filter(s => s.status === 'ë™ì˜ì² íšŒ' || s.status === 'ë¶€ì ê²©').length,
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">ëŒ€ìƒìž ê´€ë¦¬</h1>
          <p className="text-sm text-slate-500 mt-1">ìž„ìƒì‹œí—˜ ëŒ€ìƒìž ë“±ë¡, ìˆ˜ì •, ì‚­ì œ ë° í˜„í™© ê´€ë¦¬</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 bg-[#0D9488] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0B7C72] transition-colors">
          <Plus size={16} /> ëŒ€ìƒìž ë“±ë¡
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'ì „ì²´ ëŒ€ìƒìž', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'ë“±ë¡ ì™„ë£Œ', value: stats.enrolled, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'ìŠ¤í¬ë¦¬ë‹ ì¤‘', value: stats.screening, color: 'text-[#0D9488]', bg: 'bg-teal-50' },
          { label: 'ì² íšŒ/ë¶€ì ê²©', value: stats.withdrawn, color: 'text-red-600', bg: 'bg-red-50' },
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
              <input type="text" placeholder="ì´ë¦„, ID, ê¸°ê´€ ê²€ìƒ‰..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488] w-64" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm">
                <option value="ì „ì²´">ì „ì²´ ìƒíƒœ</option>
                <option value="ë“±ë¡ì™„ë£Œ">ë“±ë¡ì™„ë£Œ</option>
                <option value="ìŠ¤í¬ë¦¬ë‹">ìŠ¤í¬ë¦¬ë‹</option>
                <option value="ë™ì˜ì² íšŒ">ë™ì˜ì² íšŒ</option>
                <option value="ë¶€ì ê²©">ë¶€ì ê²©</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <button className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"><Download size={14} /> ë‚´ë³´ë‚´ê¸°</button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 font-medium text-slate-600">ëŒ€ìƒìž ID</th>
                <th className="px-5 py-3 font-medium text-slate-600">ì´ë¦„</th>
                <th className="px-5 py-3 font-medium text-slate-600">ë‚˜ì´/ì„±ë³„</th>
                <th className="px-5 py-3 font-medium text-slate-600">ê¸°ê´€</th>
                <th className="px-5 py-3 font-medium text-slate-600">ì§„ë‹¨ëª…</th>
                <th className="px-5 py-3 font-medium text-slate-600">ìƒíƒœ</th>
                <th className="px-5 py-3 font-medium text-slate-600">ë“±ë¡ì¼</th>
                <th className="px-5 py-3 font-medium text-slate-600 text-center">ìž‘ì—…</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#0D9488]">{s.id}</td>
                  <td className="px-5 py-3 text-[#0F172A] font-medium">{s.name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.age}ì„¸ / {s.gender}</td>
                  <td className="px-5 py-3 text-slate-700">{s.site}</td>
                  <td className="px-5 py-3 text-slate-700">{s.diagnosis}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[s.status] || ''}`}>{s.status}</span></td>
                  <td className="px-5 py-3 text-slate-500">{s.enrollDate}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setShowDetail(s)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="ìƒì„¸ë³´ê¸°"><Eye size={14} className="text-slate-500" /></button>
                      <button onClick={() => handleEdit(s)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="ìˆ˜ì •"><Edit2 size={14} className="text-blue-500" /></button>
                      <button onClick={() => setShowDeleteConfirm(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="ì‚­ì œ"><Trash2 size={14} className="text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-500">Ü„ {filtered.length}ëª… (ì „ì²´ {subjects.length}ëª…)</div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-[#0F172A]">{editMode ? 'ëŒ€ìƒìž ìˆ˜ì •' : 'ëŒ€ìƒìž ë“±ë¡'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ëŒ€ìƒìž ID</label>
                  <input value={currentSubject.id} readOnly className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ì´ë¦„ *</label>
                  <input value={currentSubject.name} onChange={e => setCurrentSubject(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" placeholder="í™ê¸¸ë™" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ë‚˜ì´</label>
                  <input type="number" value={currentSubject.age || ''} onChange={e => setCurrentSubject(p => ({ ...p, age: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ì„±ë³„</label>
                  <select value={currentSubject.gender} onChange={e => setCurrentSubject(p => ({ ...p, gender: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="ë‚¨">ë‚¨</option>
                    <option value="ì—¬">ì—¬</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ê¸°ê´€ *</label>
                  <select value={currentSubject.site} onChange={e => setCurrentSubject(p => ({ ...p, site: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">ì„ íƒ</option>
                    <option>ì„œìš¸ëŒ€ë³‘ì›</option><option>ì„¸ë¸Œëœ€ìŠ¤ë³‘ì›</option><option>ì‚¼ì„±ì„œìš¸ë³‘ì›</option><option>ì•„ì‚°ë³‘ì›</option><option>ê³ ë ¤ëŒ€ë³‘ì›</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ì§„ë‹¨ëª…</label>
                  <input value={currentSubject.diagnosis} onChange={e => setCurrentSubject(p => ({ ...p, diagnosis: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ì—°ë½ì²˜</label>
                  <input value={currentSubject.phone} onChange={e => setCurrentSubject(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D9488] focus:outline-none" placeholder="010-0000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ìƒíƒœ</label>
                  <select value={currentSubject.status} onChange={e => setCurrentSubject(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option>ìŠ¤í¬ë¦¬ë‹</option><option>ë“±ë¡ì™„ë£Œ</option><option>ì¶”ì ê´€ì°°</option><option>ë™ì˜ì² íšŒ</option><option>ë¶€ì ê²©</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Ü·¨ì†Œ</button>
              <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 text-sm bg-[#0D9488] text-white rounded-lg hover:bg-[#0B7C72]"><Save size={14} /> ì €ìž¥</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[480px]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-[#0F172A]">ëŒ€ìƒìž ìƒì„¸ì •ë³´</h3>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[['ëŒ€ìƒìž ID', showDetail.id], ['ì´ë¦„', showDetail.name], ['ë‚˜ì´/ì„±ë³„', `${showDetail.age}ì„¸ / ${showDetail.gender}`], ['ê¸°ê´€', showDetail.site], ['ì§„ë‹¨ëª…', showDetail.diagnosis], ['ì—°ë½ì²˜', showDetail.phone], ['ìƒíƒœ', showDetail.status], ['ë“±ë¡ì¼', showDetail.enrollDate]].map(([l, v]) => (
                <div key={l} className="flex"><span className="w-24 text-xs text-slate-500 shrink-0">{l}</span><span className="text-sm font-medium text-[#0F172A]">{v}</span></div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button onClick={() => { handleEdit(showDetail); setShowDetail(null) }} className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Edit2 size={14} /> ìˆ˜ì •</button>
              <button onClick={() => setShowDetail(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">ë‹«ê¸°</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[360px] p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">ëŒ€ìƒìž ì‚­ì œ</h3>
            <p className="text-sm text-slate-500 mb-5">ëŒ€ìƒìž {showDeleteConfirm}ì„(ë¥¼) ì‚­ì œí•˜ì‹œê² ìŠµë‹ˆê¹Œ?<br />ì´ ìž‘ì—…ì€ ë˜ëŒë¦´ ìˆ˜ ì—†ìŠµë‹ˆë‹¤.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">ì·¨ì†Œ</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">ì‚­ì œ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
