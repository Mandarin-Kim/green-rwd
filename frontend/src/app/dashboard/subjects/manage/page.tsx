'use client';

import { useState } from 'react';
import { Users, UserPlus, Search, Filter, ChevronRight } from 'lucide-react';

interface Subject {
  id: string;
  initial: string;
  age: number;
  gender: string;
  project: string;
  status: 'screening' | 'qualified' | 'disqualified' | 'consent_withdrawn' | 'in_progress';
  registeredDate: string;
  cra: string;
}

const mockSubjects: Subject[] = [
  { id: 'S001', initial: 'K.M', age: 52, gender: '남', project: 'Entresto', status: 'in_progress', registeredDate: '2024-03-15', cra: '이순신' },
  { id: 'S002', initial: 'J.I', age: 48, gender: '여', project: 'Keytruda', status: 'qualified', registeredDate: '2024-03-14', cra: '김효주' },
  { id: 'S003', initial: 'P.S', age: 61, gender: '남', project: 'Entresto', status: 'screening', registeredDate: '2024-03-13', cra: '이순신' },
  { id: 'S004', initial: 'L.Y', age: 55, gender: '여', project: 'SGLT2i', status: 'disqualified', registeredDate: '2024-03-12', cra: '박영석' },
  { id: 'S005', initial: 'C.H', age: 59, gender: '남', project: 'Keytruda', status: 'in_progress', registeredDate: '2024-03-11', cra: '김효주' },
  { id: 'S006', initial: 'R.K', age: 51, gender: '여', project: 'Entresto', status: 'qualified', registeredDate: '2024-03-10', cra: '이순신' },
  { id: 'S007', initial: 'M.J', age: 57, gender: '남', project: 'SGLT2i', status: 'screening', registeredDate: '2024-03-09', cra: '박영석' },
  { id: 'S008', initial: 'O.K', age: 54, gender: '여', project: 'Entresto', status: 'consent_withdrawn', registeredDate: '2024-03-08', cra: '이순신' },
  { id: 'S009', initial: 'D.L', age: 60, gender: '남', project: 'Keytruda', status: 'in_progress', registeredDate: '2024-03-07', cra: '김효주' },
  { id: 'S010', initial: 'E.P', age: 50, gender: '여', project: 'SGLT2i', status: 'qualified', registeredDate: '2024-03-06', cra: '박영석' },
];

const statusLabels: Record<string, string> = {
  screening: '스크리닝',
  qualified: '적격',
  disqualified: '부적격',
  consent_withdrawn: '동의철회',
  in_progress: '진행중',
};

const statusColors: Record<string, string> = {
  screening: 'bg-blue-100 text-blue-800',
  qualified: 'bg-green-100 text-green-800',
  disqualified: 'bg-red-100 text-red-800',
  consent_withdrawn: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-purple-100 text-purple-800',
};

export default function SubjectManagePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');

  const filteredSubjects = mockSubjects.filter((subject) => {
    const matchSearch = subject.id.includes(searchTerm.toUpperCase()) || subject.initial.includes(searchTerm.toUpperCase());
    const matchStatus = statusFilter === '' || subject.status === statusFilter;
    const matchProject = projectFilter === '' || subject.project === projectFilter;
    return matchSearch && matchStatus && matchProject;
  });

  const stats = {
    total: mockSubjects.length,
    qualified: mockSubjects.filter((s) => s.status === 'qualified').length,
    screening: mockSubjects.filter((s) => s.status === 'screening').length,
    disqualified: mockSubjects.filter((s) => s.status === 'disqualified').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">대상자 관리</h1>
          <p className="text-slate-500">임상시험 대상자 등록 및 관리</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-600 text-sm mb-2">전체 등록자</p>
            <p className="text-3xl font-bold text-navy">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-600 text-sm mb-2">적격 판정</p>
            <p className="text-3xl font-bold text-green-600">{stats.qualified}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-600 text-sm mb-2">스크리닝 중</p>
            <p className="text-3xl font-bold text-blue-600">{stats.screening}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-600 text-sm mb-2">턨락</p>
            <p className="text-3xl font-bold text-red-600">{stats.disqualified}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex gap-4 items-end">
            {/* Search Bar */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-navy mb-2">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="대상자ID 또는 이니셜 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-navy mb-2">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">전체</option>
                <option value="screening">스크리닝</option>
                <option value="qualified">적격</option>
                <option value="disqualified">부적격</option>
                <option value="in_progress">진행중</option>
              </select>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-navy mb-2">프로젝트</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">전체</option>
                <option value="Entresto">Entresto</option>
                <option value="Keytruda">Keytruda</option>
                <option value="SGLT2i">SGLT2i</option>
              </select>
            </div>

            {/* Filter Icon */}
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-8 flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all">
            <UserPlus className="w-5 h-5" />
            대상자 등록
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">대상자ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">이니셜</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">나이/성별</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">프로젝트</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">상태</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">등록일</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">담당CRA</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-navy font-medium">{subject.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{subject.initial}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {subject.age}/{subject.gender}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{subject.project}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[subject.status]}`}>
                      {statusLabels[subject.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{subject.registeredDate}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{subject.cra}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary hover:text-opacity-80 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
