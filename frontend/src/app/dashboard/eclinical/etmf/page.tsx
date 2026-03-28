'use client';

import { useState } from 'react';
import { Archive, FileText, FolderOpen, Upload, CheckCircle } from 'lucide-react';

export default function eTMFPage() {
  const [expandedZone, setExpandedZone] = useState('zone1');
  const [selectedStudy, setSelectedStudy] = useState('entresto-phase3');

  const studies = [
    { id: 'entresto-phase3', name: 'Entresto Phase III'},
    { id: 'nsclc-study', name: 'NSCLC Study },
    { id: 'hf-trial', name: 'Heart Failure Trial' },
  ];

  const zones = [
    {
      id: 'zone1',
      name: 'Zone 1: 샜울대병원',
      description: '프로토콜, 연구계획서 수정, IRB 통신',
      completeness: 95,
      documents: [
        {
          id: 1,
          name: '임상시험 프로토콜 v2.0',
          version: '2.0',
          uploadDate: '2024-05-10',
          status: 'Final',
        },
        {
          id: 2,
          name: '프로토콜 수정 1 (Amendment)',
          version: '1.0',
          uploadDate: '2024-11-15',
          status: 'Final',
        },
        {
          id: 3,
          name: 'IRB 통신서 - 정기 갱신',
          version: '1.0',
          uploadDate: '2025-03-01',
          status: 'Final',
        },
      ],
    },
    {
      id: 'zone5',
      name: 'Zone 5: 규제',
      description: 'IRB 승인서, IND 승인서, 규제 문서',
      completeness: 100,
      documents: [
        {
          id: 4,
          name: 'IRB 승인서',
          version: '1.0',
          uploadDate: '2024-04-10',
          status: 'Final',
        },
        {
          id: 5,
          name: 'IND 승인서',
          version: '1.0',
          uploadDate: '2024-03-20',
          status: 'Final',
        },
        {
          id: 6,
          name: '안전성 관련 통신',
          version: '1.0',
          uploadDate: '2026-03-15',
          status: 'Final',
        },
      ],
    },
    {
      id: 'zone6',
      name: 'Zone 6: 사이트 문서',
      description: '기관별 계약서, 연구자 이력서',
      completeness: 85,
      documents: [
        {
          id: 7,
          name: '서울대병원 임상시험 계약서',
          version: '1.0',
          uploadDate: '2024-05-15',
          status: 'Final',
        },
        {
          id: 8,
          name: '삼성서울병원 임상시험 계약서',
          version: '1.0',
          uploadDate: '2024-05-18',
          status: 'Final',
        },
        {
          id: 9,
          name: '연구책임자 이력서 - 김철수',
          version: '1.0',
          uploadDate: '2024-06-01',
          status: 'Final',
        },
        {
          id: 10,
          name: '협력연구자 이력서 - 이영희',
          version: '1.0',
          uploadDate: '2024-06-05',
          status: 'Draft',
        },
      ],
    },
    {
      id: 'zone8',
      name: 'Zone 8: 의약품 정보',
      description: '의약품 관리 기록, CMC 문서',
      completeness: 90,
      documents: [
        {
          id: 11,
          name: '의약품 심사 보고서',
          version: '2.0',
          uploadDate: '2024-04-05',
          status: 'Final',
        },
        {
          id: 12,
          name: '분석법 밸리데이션',
          version: '1.5',
          uploadDate: '2024-07-20',
          status: 'Final',
        },
        {
          id: 13,
          name: '약물 안정성 데이터',
          version: '1.0',
          uploadDate: '2024-08-10',
          status: 'Under review',
        },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Final':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Draft':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Under review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">
            eTMF (Electronic Trial Master File)
          </h1>
          <p className="text-slate-500">전자 시험 마스터 파일</p>
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

        {/* Upload Document Button */}
        <div className="mb-8">
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-medium">
            <Upload size={20} />
            문서 업로드
          </button>
        </div>

        {/* Zone Completeness Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-white rounded-xl border border-slate-200 p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => setExpandedZone(expandedZone === zone.id ? '' : zone.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="font-semibold text-navy text-sm">{zone.name}</p>
                <CheckCircle className="text-primary" size={20} />
              </div>
              <div className="bg-slate-100 rounded-full h-2 mb-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${zone.completeness}%` }}
                />
              </div>
              <p className="text-sm text-slate-600">{zone.completeness%= 완료</p>
            </div>
          )}
        </div>

        {/* Document Tree */}
        <div className="space-y-4">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div
                className="px-6 py-4 bg-gradient-to-r from-navy to-primary cursor-pointer hover:opacity-90 transition flex items-center justify-between"
                onClick={() =>
                  setExpandedZone(expandedZone === zone.id ? '' : zone.id)
                }
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="text-white" size={20} />
                  <div>
                    <h3 className="font-bold text-white">{zone.name}</h3>
                    <p className="text-sm text-blue-100">{zone.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {zone.completeness%�
                  </span>
                  <span className="text-white">
                     {expandedZone === zone.id ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedZone === zone.id && (
                <div className="p-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-0 text-sm font-semibold text-navy">
                          문서명
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-navy">
                          버전
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-navy">
                          업로드 날짜
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-navy">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {zone.documents.map((doc, idx) => (
                        <tr
                          key={doc.id}
                          className={
                            idx % 2 === 0
                              ? 'bg-slate-50'
                              : 'bg-white'
                          }
                        >
                          <td className="py-3 px-0 text-sm font-medium text-navy flex items-center gap-2">
                            <FileText size={16} className="text-slate-400" />
                            {doc.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            v{doc.version}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {doc.uploadDate}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                                doc.status
                              )}`}
                            >
                              {doc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Overall eTMF Completeness */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mt-8">
          <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
            <Archive size={20} />
            전체 eTMF 완료도
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-slate-600 mb-3">
                Zone 별 완료도의 평균: <span className="text-2xl font-bold text-primary">92.5%</span>
              </p>
              <div className="bg-slate-200 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all"
                  style={{ width: '92.5%' }}
                />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                ✓ 총 문서 수: 13개
              </p>
              <p className="text-slate-600">
                ✓ 최종본: 11개
              </p>
              <p className="text-slate-600">
                ✓ 검토 중: 1개
              </p>
              <p className="text-slate-600">
                ✓ 초안: 1개
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
