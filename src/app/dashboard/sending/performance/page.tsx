'use client';

import React, { useState } from 'react';
import { Download, TrendingUp, Zap } from 'lucide-react';

interface PerformanceData {
  id: string;
  campaignName: string;
  totalSent: number;
  successCount: number;
  openCount: number;
  clickCount: number;
  cost: number;
  date: string;
}

export default function SendingPerformancePage() {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([
    {
      id: '1',
      campaignName: '고혈압 약물 임상시험 모집',
      totalSent: 15420,
      successCount: 15200,
      openCount: 6468,
      clickCount: 4342,
      cost: 154200,
      date: '2026-03-28',
    },
    {
      id: '2',
      campaignName: '당뇨병 신약 모집 캠페인',
      totalSent: 8950,
      successCount: 8750,
      openCount: 3342,
      clickCount: 1865,
      cost: 89500,
      date: '2026-03-27',
    },
    {
      id: '3',
      campaignName: '장기 심혈관 임상시험',
      totalSent: 22340,
      successCount: 22100,
      openCount: 10120,
      clickCount: 6976,
      cost: 223400,
      date: '2026-03-26',
    },
  ]);

  const [dateRangeStart, setDateRangeStart] = useState('2026-03-01');
  const [dateRangeEnd, setDateRangeEnd] = useState('2026-03-31');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const filteredData = selectedCampaign
    ? performanceData.filter((d) => d.id === selectedCampaign)
    : performanceData;

  const totals = filteredData.reduce(
    (acc, d) => ({
      totalSent: acc.totalSent + d.totalSent,
      successCount: acc.successCount + d.successCount,
      openCount: acc.openCount + d.openCount,
      clickCount: acc.clickCount + d.clickCount,
      cost: acc.cost + d.cost,
    }),
    { totalSent: 0, successCount: 0, openCount: 0, clickCount: 0, cost: 0 }
  );

  const successRate = ((totals.successCount / totals.totalSent) * 100).toFixed(1);
  const openRate = ((totals.openCount / totals.successCount) * 100).toFixed(1);
  const costPerSend = (totals.cost / totals.totalSent).toFixed(0);

  const kpiData = [
    { label: '총 발송건', value: totals.totalSent.toLocaleString(), color: 'bg-blue-100', textColor: 'text-blue-700' },
    { label: '성공률', value: `${successRate}%`, color: 'bg-green-100', textColor: 'text-green-700' },
    { label: '오픈률', value: `${openRate}%`, color: 'bg-purple-100', textColor: 'text-purple-700' },
    { label: '총 비용', value: `₩${(totals.cost / 1000000).toFixed(1)}M`, color: 'bg-orange-100', textColor: 'text-orange-700' },
  ];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#0F172A' }}>발송 성과</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className={`p-6 rounded-lg ${kpi.color}`}>
              <p className="text-sm font-medium text-gray-700 mb-2">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-end">
            <dic>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">캠페인</label>
              <select
                value={selectedCampaign || 'all'}
                onChange={(e) => setSelectedCampaign(e.target.value === 'all' ? null : e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="all">전체 캠페인</option>
                {performanceData.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.campaignName}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="px-4 py-2 text-white rounded-lg font-medium flex items-center gap-2"
              style={{ backgroundColor: '#0D9488' }}
            >
              <Download className="w-4 h-4" />
              내보내기
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#0D9488' }}
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">성공 현황</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">발송건</span>
                <span className="font-bold">{totals.totalSent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">성공</span>
                <span className="font-bold">{totals.successCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">성공률</span>
                <span className="font-bold text-green-600">{successRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#F59E0B' }}
              >
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">참여 현황</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">오픈</span>
                <span className="font-bold">{totals.openCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">클릭</span>
                <span className="font-bold">{totals.clickCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">오픈률</span>
                <span className="font-bold text-blue-600">{openRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead style={{ backgroundColor: '#0D9488' }}>
              <tr>
                <th className="px-6 py-4 text-left text-white font-medium">캠페인명</th>
                <th className="px-6 py-4 text-left text-white font-medium">발송건</th>
                <th className="px-6 py-4 text-left text-white font-medium">성공</th>
                <th className="px-6 py-4 text-left text-white font-medium">오픈</th>
                <th className="px-6 py-4 text-left text-white font-medium">클릭</th>
                <th className="px-6 py-4 text-left text-white font-medium">성공률</th>
                <th className="px-6 py-4 text-left text-white font-medium">오픈률</th>
                <th className="px-6 py-4 text-left text-white font-medium">비용(원)</th>
                <th className="px-6 py-4 text-left text-white font-medium">건당비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((data) => {
                const dataSuccessRate = ((data.successCount / data.totalSent) * 100).toFixed(1);
                const dataOpenRate = ((data.openCount / data.successCount) * 100).toFixed(1);
                const dataCostPerSend = (data.cost / data.totalSent).toFixed(0);
                return (
                  <tr key={data.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{data.campaignName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.totalSend.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.successCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.openCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.clickCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">{dataSuccessRate}%</td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">{dataOpenRate}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900">₩{data.cost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">₩{dataCostPerSend}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
