'use client';

import React, { useState } from 'react';
import { Search, Check, X, Clock } from 'lucide-react';

interface QualificationRecord {
  id: string;
  subjectId: string;
  name: string;
  age: number;
  criteria: {
    inclusion1: boolean;
    inclusion2: boolean;
    exclusion1: boolean;
    exclusion2: boolean;
  };
  status: '적격' | '부적격' | '대기';
  appliedDate: string;
}

export default function SubjectsQualifyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '적격' | '부적격' | '대기'>('all');
  const [records, setRecords] = useState<QualificationRecord[]>([
    {
      id: '1',
      subjectId: 'SUB001',
      name: '김철수',
      age: 45,
      criteria: { inclusion1: true, inclusion2: true, exclusion1: false, exclusion2: false },
      status: '적격',
      appliedDate: '2026-03-20',
    },
    {
      id: '2',
      subjectId: 'SUB002',
      name: '이영희',
      age: 52,
      criteria: { inclusion1: true, inclusion2: false, exclusion1: false, exclusion2: true },
      status: '부적격',
      appliedDate: '2026-03-21',
    },
    {
      id: '3',
      subjectId: 'SUB003',
      name: '박민준',
      age: 38,
      criteria: { inclusion1: true, inclusion2: true, exclusion1: false, exclusion2: false },
      status: '대기',
      appliedDate: '2026-03-22',
    },
  ]);

  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.name.includes(searchTerm) || record.subjectId.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const kpiData = [
    { label: '총 심사', value: records.length, color: 'bg-blue-100', textColor: 'text-blue-700' },
    { label: '적격', value: records.filter((r) => r.status === '적격').length, color: 'bg-green-100', textColor: 'text-green-700' },
    { label: '부적격', value: records.filter((r) => r.status === '부적격').length, color: 'bg-red-100', textColor: 'text-red-700' },
    { label: '대기', value: records.filter((r) => r.status === '대기').length, color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  ];

  const handleApprove = (id: string) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, status: '적격' } : r)));
  };

  const handleReject = (id: string) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, status: '부적격' } : r)));
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#0F172A' }}>대상자 적격성 심사</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className={`p-6 rounded-lg ${kpi.color}`}>
              <p className="text-sm font-medium text-gray-700 mb-2">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="대상자명 또는 ID 검샙"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="적격">적격</option>
              <option value="부적격">부적격</option>
              <option value="대기">대기</option>
            </select>
          </div>
        </div>

        {/* Qualification Criteria */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#0F172A' }}>심사 기준</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-900">포함 기준</p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• 만 18세 이상 65세 이하</li>
                <li>• 동의서 서명</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-900">제외 기준</p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• 심각한 장기 질환</li>
                <li>• 임신/수유 중</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead style={{ backgroundColor: '#0D9488' }}>
              <tr>
                <th className="px-6 py-4 text-left text-white font-medium">대상자명</th>
                <th className="px-6 py-4 text-left text-white font-medium">ID</th>
                <th className="px-6 py-4 text-left text-white font-medium">나이</th>
                <th className="px-6 py-4 text-left text-white font-medium">포함 1</th>
                <th className="px-6 py-4 text-left text-white font-medium">포함 2</th>
                <th className="px-6 py-4 text-left text-white font-medium">제외 1</th>
                <th className="px-6 py-4 text-left text-white font-medium">제외 2</th>
                <th className="px-6 py-4 text-left text-white font-medium">상태</th>
                <th className="px-6 py-4 text-left text-white font-medium">조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{record.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{record.subjectId}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{record.age}</td>
                  <td className="px-6 py-4">
                    {record.criteria.inclusion1 ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {record.criteria.inclusion2 ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!record.criteria.exclusion1 ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!record.criteria.exclusion2 ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.status === '적격'
                          ? 'bg-green-100 text-green-800'
                          : record.status === '부적격'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {record.status === '대기' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(record.id)}
                          className="text-white px-3 py-1 rounded text-sm font-medium"
                          style={{ backgroundColor: '#0D9488' }}
                        >
                          승인
                        </button>
                        <button onClick={() => handleReject(record.id)} className="text-white px-3 py-1 rounded text-sm font-medium bg-red-600">
                          반려
                        </button>
                      </div>
                    )}
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
