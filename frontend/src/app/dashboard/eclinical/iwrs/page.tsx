'use client';

import { useState } from 'react';
import { Shuffle, Package, PieChart, ListOrdered } from 'lucide-react';

export default function IWRSPage() {
  const [selectedStudy, setSelectedStudy] = useState('entresto-phase3');

  const studies = [
    { id: 'entresto-phase3', name: 'Entresto Phase III' },
    { id: 'nsclc-study', name: 'NSCLC Study' },
    { id: 'hf-trial', name: 'Heart Failure Trial' },
  ];

  const randomizationSummary = {
    totalRandomized: 1234,
    armA: 412,
    armB: 410,
    placebo: 412,
  };

  const drugSupply = {
    depotInventory: [
      { arm: 'Treatment A', available: 450, assigned: 412, expired: 5 },
      { arm: 'Treatment B', available: 440, assigned: 410, expired: 3 },
      { arm: 'Placebo', available: 460, assigned: 412, expired: 2 },
    ],
    siteInventory: [
      { site: '서울병원', available: 38, assigned: 45, expiring: 2 },
      { site: '삼성서울병원', available: 52, assigned: 67, expiring: 4 },
      { site: '脸브란스병원', available: 41, assigned: 52, expiring: 3 },
      { site: '아산병원', available: 28, assigned: 38, expiring: 2 },
    ],
  };

  const recentRandomizations = [
    {
      id: 1,
      subjectId: 'ENT-001-0012',
      site: '서울대병원',
      date: '2026-03-27',
      arm: 'Treatment A',
      kitNumber: 'KIT-A-0445',
    },
    {
      id: 2,
      subjectId: 'ENT-001-0011',
      site: '삼성서울병원',
      date: '2026-03-27',
      arm: 'Placebo',
      kitNumber: 'KIT-P-0412',
    },
    {
      id: 3,
      subjectId: 'ENT-002-0008',
      site: '脸브란스병원',
      date: '2026-03-26',
      arm: 'Treatment B',
      kitNumber: 'KIT-B-0410',
    },
    {
      id: 4,
      subjectId: 'ENT-001-0010',
      site: '아산병원',
      date: '2026-03-26',
      arm: 'Treatment A',
      kitNumber: 'KIT-A-0444',
    },
    {      id: 5,
      subjectId: 'ENT-003-0005',
      site: '서울대병원',
      date: '2026-03-25',
      arm: 'Treatment B',
      kitNumber: 'KIT-B-0409',
    },
    {
      id: 6,
      subjectId: 'ENT-002-0007',
      site: '삼성서울병원',
      date: '2026-03-25',
      arm: 'Placebo',
      kitNumber: 'KIT-P-0411',
    },
    {
      id: 7,
      subjectId: 'ENT-001-0009',
      site: '脸브란스병원',
      date: '2026-03-24',
      arm: 'Treatment A',
      kitNumber: 'KIT-A-0443',
    },
    {
      id: 8,
      subjectId: 'ENT-003-0004',
      site: '아산병원',
      date: '2026-03-24',
      arm: 'Treatment B',
      kitNumber: 'KIT-B-0408',
    },
  ];

  const getArmColor = (arm: string) => {
    switch (arm) {
      case 'Treatment A':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Treatment B':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Placebo':
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
            IWRS (Interactive Web Response)
          </h1>
          <p className="text-slate-500">대화형 웹 응답 시스템</p>
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

        {/* Randomization Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">총 무작위배정</p>
                <p className="text-2xl font-bold text-navy mt-1">
                  {randomizationSummary.totalRandomized}
                </p>
              </div>
              <Shuffle className="text-primary" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Treatment A</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {randomizationSummary.armA}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Treatment B</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {randomizationSummary.armB}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Placebo</p>
                <p className="text-2xl font-bold text-slate-600 mt-1">
                  {randomizationSummary.placebo}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Arm Distribution Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
            <PieChart size={20} />
            군별 무작위배정 분포
          </h2>
          <div className="flex items-center gap-8">
            <div className="w-48 h-48 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-slate-400 relative">
              <div className="absolute inset-4 rounded-full bg-slate-50 flex items-center justify-center">
                <span className="text-sm font-semibold text-navy">
                  {randomizationSummary.totalRandomized}명
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                <span className="text-navy font-medium">Treatment A: {randomizationSummary.armA}명 (33.3%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-purple-400"></div>
                <span className="text-navy font-medium">Treatment B: {randomizationSummary.armB}명 (33.2%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-400"></div>
                <span className="text-navy font-medium">Placebo: {randomizationSummary.placebo}명 (33.3%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Depot Inventory */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
            <Package size={20} />
            중암H보관 약물 재고
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {drugSupply.depotInventory.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <p className="font-semibold text-navy mb-3">{item.arm}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">사용 가능:</span>
                    <span className="font-semibold text-green-600">{item.available}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">배정됨:</span>
                    <span className="font-semibold text-blue-600">{item.assigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">만료됨:</span>
                    <span className="font-semibold text-red-600">{item.expired}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Site Inventory */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4">센터별 약물 재고</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drugSupply.siteInventory.map((site, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <p className="font-semibold text-navy mb-3">{site.site}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">사용 가능:</span>
                    <span className="font-semibold text-green-600">{site.available}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">배정됨:</span>
                    <span className="font-semibold text-blue-600">{site.assigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">곧 만료:</span>
                    <span className={`font-semibold ${site.expiring > 0 ? 'text-orange-600' : 'text-slate-600'}`}>
                      {site.expiring}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Randomizations */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-navy to-primary">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ListOrdered size={20} />
              최근 무작위배정 기록
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    피험자 ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    센터
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    배정 군
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    키트 번호
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentRandomizations.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-navy">
                      {item.subjectId}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.site}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getArmColor(item.arm)}`}>
                        {item.arm}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-navy">
                      {item.kitNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  +Kreate
}
