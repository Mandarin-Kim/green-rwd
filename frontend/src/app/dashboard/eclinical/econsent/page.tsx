'use client';

import { useState } from 'react';
import { PenTool, FileCheck, ClipboardCheck, UserCheck, Eye } from 'lucide-react';

export default function eConsentPage() {
  const [selectedStudy, setSelectedStudy] = useState('entresto-phase3');

  const studies = [
    { id: 'entresto-phase3', name: 'Entresto Phase III'},
    { id: 'nsclc-study', name: 'NSCLC Study' },
    { id: 'hf-trial', name: 'Heart Failure Trial' },
  ];

  const consentTemplates = [
    {
      id: 1,
      studyName: 'Entresto Phase III',
      version: '2.1',
      language: 'Korean',
      status: 'Active',
      lastUpdated: '2026-03-10',
    },
    {
      id: 2,
      studyName: 'Entresto Phase III',
      version: '2.0',
      language: 'English',
      status: 'Active',
      lastUpdated: '2026-03-10',
    },
    {
      id: 3,
      studyName: 'NSCLC Study',
      version: '1.5',
      language: 'Korean',
      status: 'Active',
      lastUpdated: '2025-11-20',
    },
    {
      id: 4,
      studyName: 'NSCLC Study',
      version: '1.4',
      language: 'Korean',
      status: 'Archived',
      lastUpdated: '2025-08-15',
    },
  ];

  const consentTracking = {
    totalConsented: 1234,
    pending: 56,
    withdrawn: 8,
  };

  const subjectConsentLog = [
    {
      id: 1,
      subjectId: 'ENT-001-0012',
      consentDate: '2026-03-26',
      versionSigned: '2.1',
      method: 'Tablet',
      witness: 'ê°í¸ì¬ ë°ìì² ',
      status: 'Signed',
    },
    {
      id: 2,
      subjectId: 'ENT-001-0011',
      consentDate: '2026-03-26',
      versionSigned: '2.1',
      method: 'Web',
      witness: 'ììì¡°ì ì ê¹ë¯¼ì§',
      status: 'Signed',
    },
    {
      id: 3,
      subjectId: 'ENT-002-0008',
      consentDate: '2026-03-25',
      versionSigned: '2.1',
      method: 'Tablet',
      witness: 'ê°í¸ì¬ ë°ìì² ',
      status: 'Signed'
,
    },
    {
      id: 4,
      subjectId: 'ENT-001-0010',
      consentDate: '2026-03-25',
      versionSigned: '2.1',
      method: 'Web',
      witness: 'ììì¡°ì ì ì´íì ',
      status: 'Signed',
    },
    {
      id: 5,
      subjectId: 'ENT-003-0005',
      consentDate: '2026-03-24',
      versionSigned: '2.0',
      method: 'Tablet',
      witness: 'ê°í¸ì¬ ë°ìì² ',
      status: 'Signed',
    },
    {
      id: 6,
      subjectId: 'ENT-002-0007',
      consentDate: '2026-03-24',
      versionSigned: '2.1',
      method: 'Web',
      witness: 'ììì¡°ì ì ê¹ë¯¼ì§',
      status: 'Signed',
    },
    {
      id: 7,
      subjectId: 'ENT-001-0009',
      consentDate: '2026-03-23',
      versionSigned: '2.1',
      method: 'Tablet',
      witness: 'ê°í¸ì¬ ì´ìì°',
      status: 'Signed',
    },
    {
      id: 8,
      subjectId: 'ENT-003-0004',
      consentDate: '2026-03-23',
      versionSigned: '2.1',
      method: 'Web',
      witness: 'ììì¡°ì ì ì´íì ',
      status: 'Signed',
    },
    {
      id: 9,
      subjectId: 'ENT-002-0006',
      consentDate: '2026-03-22',
      versionSigned: '2.0',
      method: 'Tablet',
      witness: 'ê°í¸ì¬ ì´ìì°',
      status: 'Signed',
    },
    {
      id: 10,
      subjectId: 'ENT-001-0013',
      consentDate: null,
      versionSigned: '2.1',
      method: '-',
      witness: '-',
      status: 'Pending',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Signed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Withdrawn':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getTemplateStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Archived':
        return 'bg-slate-50 text-slate-700 border-slate-200';
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
            eConsent (Electronic Consent)
          </h1>
          <p className="text-slate-500">ì ì ëìì ê´ë¦¬</p>
        </div>

        {/* Study Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-semibold text-navy">ìììí ì í:</label>
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

        {/* Consent Tracking Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">ëìí¨</p>
                <p className="text-2xl font-bold text-navy mt-1">
                  {consentTracking.totalConsented}
                </p>
              </div>
              <FileCheck className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">ëê¸° ì¤</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {consentTracking.pending}
                </p>
              </div>
              <ClipboardCheck className="text-yellow-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">ëì ì² í</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {consentTracking.withdrawn}
                </p>
              </div>
              <UserCheck className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        {/* Consent Form Templates */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
            <PenTool size={20} />
            ëìì ìì ííë¦¿
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consentTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-navy">{template.studyName}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {template.language} | v{template.version}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTemplateStatusColor(
                      template.status
                    )}`}
                  >
                    {template.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  ìµì¢ ìì : {template.lastUpdated}
                </p>
                <button className="mt-3 w-full px-3 py-2 bg-slate-100 text-navy rounded-lg hover:bg-slate-200 transition text-sm font-medium flex items-center justify-center gap-2">
                  <Eye size={16} />
                  ë¯¸ë¦¬ë³´ê¸°
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Consent Log */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-navy to-primary">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardCheck size={20} />
              í¼íì ëì ê¸°ë¡
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    í¼íì ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    ëì ë ì§
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    ìëª ë²ì 
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    ë°©ì
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    ì¦ì¸
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    ìí
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjectConsentLog.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-navy">
                      {log.subjectId}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.consentDate || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.versionSigned}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.method}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.witness}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Consent Completion Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mt-8">
          <h2 className="text-lg font-bold text-navy mb-4">ëì ìë£ì¨</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-navy">íì¬ ì§íë¥ </span>
                <span className="text-sm font-bold text-primary">
                  {Math.round(
                    (consentTracking.totalConsented /
                      (consentTracking.totalConsented +
                        consentTracking.pending +
                        consentTracking.withdrawn)) *
                      100
                  )}
                  %
                </span>
              </div>
              <div className="bg-slate-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.round(
                      (consentTracking.totalConsented /
                        (consentTracking.totalConsented +
                          consentTracking.pending +
                          consentTracking.withdrawn)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {consentTracking.totalConsented} /{' '}
              {consentTracking.totalConsented +
                consentTracking.pending +
                consentTracking.withdrawn}{' '}
              í¼íì
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
