'use client';

import { useState } from 'react';
import { FilePen, FileCheck, AlertCircle, Database } from 'lucide-react';

export default function EDCPage() {
  const [selectedStudy, setSelectedStudy] = useState('entresto-phase3');

  const studies = [
    { id: 'entresto-phase3', name: 'Entresto Phase III' },
    { id: 'nsclc-study', name: 'NSCLC Study' },
    { id: 'hf-trial', name: 'Heart Failure Trial' },
  ];

  const crfForms = [
    {
      id: 1,
      name: '인구통계',
      version: '2.1',
      status: 'Active',
      lastModified: '2026-03-15',
      completionRate: 95,
    },
    {
      id: 2,
      name: '병력',
      version: '1.5',
      status: 'Active',
      lastModified: '2026-03-10',
      completionRate: 87,
    },
    {
      id: 3,
      name: '신체검사',
      version: '2.0',
      status: 'Active',
      lastModified: '2026-03-12',
      completionRate: 92,
    },
    {
      id: 4,
      name: '실험실검사',
      version: '1.8',
      status: 'Active',
      lastModified: '2026-03-14',
      completionRate: 88,
    },
    {
      id: 5,
      name: '이상반응',
      version: '2.2',
      status: 'Draft',
      lastModified: '2026-03-16',
      completionRate: 65,
    },
    {
      id: 6,
      name: '병용약물',
      version: '1.6',
      status: 'Active',
      lastModified: '2026-03-11',
      completionRate: 90,
    },
    {
      id: 7,
      name: '종료보고',
      version: '2.0',
      status: 'Locked',
      lastModified: '2026-02-28',
      completionRate: 100,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'Draft':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Locked':
        return 'bg-slate-50 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">
            EDC (Electronic Data Capture)
          </h1>
          <p className="text-slate-500">전자 데이터 수집 시스템</p>
        </div>

        {/* Study Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-semibold text-navy">임상시험 선택:</label>
          <select
            value={selectedStudy}
            onChange={(e) => setSelectedStudy(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {studies.map((study) => (
              <option key={study.id} value={study.id}>
                {study.name}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">전체 CRF</p>
                <p className="text-2xl font-bold text-navy mt-1">{crfForms.length}</p>
              </div>
              <Database className="text-primary" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">완료됨</p>
                <p className="text-2xl font-bold text-navy mt-1">
                  {crfForms.filter((f) => f.status === 'Locked').length}
                </p>
              </div>
              <FileCheck className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">쿼리</p>
                <p className="text-2xl font-bold text-navy mt-1">12</p>
              </div>
              <AlertCircle className="text-orange-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">기한 초과</p>
                <p className="text-2xl font-bold text-navy mt-1">3</p>
              </div>
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        {/* CRF Forms List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-navy to-primary">
            <h2 className="text-lg font-bold text-white">CRF (Case Report Form) 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    CRF 이름
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    버전
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    완료율
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    마지막 수정
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {crfForms.map((form, idx) => (
                  <tr
                    key={form.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-navy">
                      {form.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      v{form.version}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(form.status)}`}>
                        {form.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${form.completionRate}%` }}
                          />
                        </div>
                        <span className="text-slate-600">{form.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {form.lastModified}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-opacity-90 transition text-xs font-medium">
                          <FilePen size={16} />
                          편집
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-navy rounded-lg hover:bg-slate-200 transition text-xs font-medium">
                          <FileCheck size={16} />
                          미리보기
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
    </div>
  );
}
