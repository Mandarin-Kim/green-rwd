'use client';

import { useState } from 'react';
import { AlertTriangle, HeartPulse, FileWarning, Clock, Shield } from 'lucide-react';

export default function SafetyPage() {
  const [selectedStudy, setSelectedStudy] = useState('entresto-phase3');

  const studies = [
    { id: 'entresto-phase3', name: 'Entresto Phase III' },
    { id: 'nsclc-study', name: 'NSCLC Study' },
    { id: 'hf-trial', name: 'Heart Failure Trial' },
  ];

  const safetyKPIs = {
    totalAE: 234,
    totalSAE: 18,
    totalSUSAR: 5,
    deaths: 0,
  };

  const adverseEvents = [
    {
      id: 1,
      subjectId: 'ENT-001-0045',
      aeTerm: '두통',
      severity: 'Mild',
      seriousness: 'N',
      causality: 'Possible',
      outcome: 'Recovered',
      reportDate: '2026-03-26',
    },
    {
      id: 2,
      subjectId: 'ENT-002-0032',
      aeTerm: '구역질',
      severity: 'Moderate',
      seriousness: 'N',
      causality: 'Probable',
      outcome: 'Recovering',
      reportDate: '2026-03-26',
    },
    {
      id: 3,
      subjectId: 'ENT-001-0052',
      aeTerm: '말초부종',
      severity: 'Moderate',
      seriousness: 'N',
      causality: 'Possible',
      outcome: 'Recovered',
      reportDate: '2026-03-25',
    },
    {
      id: 4,
      subjectId: 'ENT-003-0018',
      aeTerm: '기침',
      severity: 'Mild',
      seriousness: 'N',
      causality: 'Unlikely',
      outcome: 'Recovered',
      reportDate: '2026-03-25',
    },
    {
      id: 5,
      subjectId: 'ENT-001-0061',
      aeTerm: '현기증',
      severity: 'Severe',
      seriousness: 'Y',
      causality: 'Probable',
      outcome: 'Recovering',
      reportDate: '2026-03-24',
    },
    {
      id: 6,
      subjectId: 'ENT-002-0028',
      aeTerm: '고혈압',
      severity: 'Moderate',
      seriousness: 'Y',
      causality: 'Possible',
      outcome: 'Ongoing',
      reportDate: '2026-03-24',
    },
    {
      id: 7,
      subjectId: 'ENT-003-0022',
      aeTerm: '저혈닛증',
      severity: 'Moderate',
      seriousness: 'Y',
      causality: 'Probable',
      outcome: 'Recovered',
      reportDate: '2026-03-23',
    },
    {
      id: 8,
      subjectId: 'ENT-001-0038',
      aeTerm: '피부발진',
      severity: 'Mild',
      seriousness: 'N',
      causality: 'Possible',
      outcome: 'Recovered',
      reportDate: '2026-03-23',
    },
    {
      id: 9,
      subjectId: 'ENT-002-0041',
      aeTerm: '가슴통증',
      severity: 'Severe',
      seriousness: 'Y',
      causality: 'Possible',
      outcome: 'Ongoing',
      reportDate: '2026-03-22',
    },
    {
      id: 10,
      subjectId: 'ENT-001-0055',
      aeTerm: '설사',
      severity: 'Moderate',
      seriousness: 'N',
      causality: 'Possible',
      outcome: 'Recovering',
      reportDate: '2026-03-22',
    },
  ];

  const saeAlerts = [
    {
      id: 1,
      subjectId: 'ENT-002-0041',
      aeTerm: '가슴통증',
      severity: 'Severe',
      reportDate: '2026-03-22',
      urgency: 'High',
    },
    {
      id: 2,
      subjectId: 'ENT-001-0061',
      aeTerm: '현기증',
      severity: 'Severe',
      reportDate: '2026-03-24',
      urgency: 'High',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Moderate':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Severe':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getCausalityColor = (causality: string) => {
    switch (causality) {
      case 'Probable':
        return 'text-red-600 font-semibold';
      case 'Possible':
        return 'text-orange-600 font-semibold';
      case 'Unlikely':
        return 'text-green-600 font-semibold';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">
            Safety Reporting
          </h1>
          <p className="text-slate-500">안전성 보고 관리</p>
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

        {/* Safety KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">총 이상반응</p>
                <p className="text-2xl font-bold text-navy mt-1">
                  {safetyKPIs.totalAE}
                </p>
              </div>
              <AlertTriangle className="text-orange-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">심각한 이상반응</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {safetyKPIs.totalSAE}
                </p>
              </div>
              <HeartPulse className="text-red-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">예색치 못한 심각 이상반응</p>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {safetyKPIs.totalSUSAR}
                </p>
              </div>
              <FileWarning className="text-red-700" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">사망</p>
                <p className="text-2xl font-bold text-navy mt-1">
                  {safetyKPIs.deaths}
                </p>
              </div>
              <Shield className="text-green-600" size={32} />
            </div>
          </div>
        </div>

        {/* SAE Alerts */}
        {saeAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} />
              긴급 심각한 이상반응
            </h2>
            <div className="space-y-3">
              {saeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white border-l-4 border-red-600 p-4 rounded"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-navy">
                        {alert.subjectId} - {alert.aeTerm}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        보고 날짜: {alert.reportDate}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      심각
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reporting Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
            <Clock size={20} />
            보고 시간 요구 사항
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <p className="font-semibold text-red-700">치명적 또는 생명을 위협하는 경우</p>
              <p className="text-2xl font-bold text-red-600 mt-2">24시간</p>
              <p className="text-sm text-red-600 mt-2">즉시 구두 보고 후 서면 보고</p>
            </div>
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <p className="font-semibold text-orange-700">기타 심각한 이상반응</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">15일</p>
              <p className="text-sm text-orange-600 mt-2">초기 보고 후 추적 정보 제출</p>
            </div>
          </div>
        </div>

        {/* AE Listing Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-navy to-primary">
            <h2 className="text-lg font-bold text-white">이상반응 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    피험자 ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    이상반응
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    심각도
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    심각성
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    인과관계
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    결과
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    보고 날짜
                  </th>
                </tr>
              </thead>
              <tbody>
                {adverseEvents.map((event, idx) => (
                  <tr
                    key={event.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-navy">
                      {event.subjectId}
                    </td>
                    <td className="px-6 py-4 text-sm text-navy">
                      {event.aeTerm}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(
                          event.severity
                        )}`}
                      >
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span
                        className={`px-2 py-1 rounded font-semibold text-xs ${
                          event.seriousness === 'Y'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {event.seriousness}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${getCausalityColor(event.causality)}`}>
                      {event.causality}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {event.outcome}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {event.reportDate}
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
