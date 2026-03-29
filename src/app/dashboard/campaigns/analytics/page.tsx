'use client';

import React, { useState } from 'react';
import { BarChart3, Search } from 'lucide-react';

interface CampaignAnalytics {
  id: string;
  name: string;
  sent: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  startDate: string;
  endDate: string;
}

export default function CampaignsAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([
    {
      id: '1',
      name: '고혈압 약물 임상시험 모집',
      sent: 15420,
      openRate: 42.5,
      clickRate: 28.3,
      conversionRate: 12.7,
      startDate: '2026-03-01',
      endDate: '2026-03-28',
    },
    {
      id: '2',
      name: '당뇨병 신약 모집 캠페인',
      sent: 8950,
      openRate: 38.2,
      clickRate: 22.1,
      conversionRate: 9.3,
      startDate: '2026-02-15',
      endDate: '2026-03-15',
    },
    {
      id: '3',
      name: '장기 심혈관 임상시험',
      sent: 22340,
      openRate: 45.8,
      clickRate: 31.2,
      conversionRate: 15.4,
      startDate: '2025-12-01',
      endDate: '2026-02-28',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('2026-01-01');
  const [dateRangeEnd, setDateRangeEnd] = useState('2026-03-31');

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.includes(searchTerm)
  );

  const totalStats = filteredCampaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent,
      avgOpenRate: acc.avgOpenRate + c.openRate,
      avgClickRate: acc.avgClickRate + c.clickRate,
      avgConversionRate: acc.avgConversionRate + c.conversionRate,
    }),
    { sent: 0, avgOpenRate: 0, avgClickRate : 0, avgConversionRate : 0 }
  );

  const count = filteredCampaigns.length || 1;
  const kpiData = [
    { label: '총 발송건', value: totalStats.sent.toLocaleString(), color: 'bg-blue-100', textColor: 'text-blue-700' },
    { label: '평균 오픈율', value: `${(totalStats.avgOpenRate / count).toFixed(1)}%`, color: 'bg-green-100', textColor: 'text-green-700' },
    { label: '평균 클릭률', value: `${(totalStats.argClickRate / count).toFixed(1)}%`, color: 'bg-purple-100', textColor: 'text-purple-700' },
    { label: '평균 전환율', value: `${(totalStats.argConversionRate / count).toFixed(1)}%`, color: 'bg-orange-100', textColor: 'text-orange-700' },
  ];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#0F172A' }}>캠페인 분석</h1>

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
                placeholder="캠페인명 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Analytics Chart Placeholder */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">캠페인 성과 차트</p>
              <p className="text-xs text-gray-400 mt-1">실시간 분석 데이터가 표시됩니다</p>
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
                <th className="px-6 py-4 text-left text-white font-medium">오픈율</th>
                <th className="px-6 py-4 text-left text-white font-medium">클릭률</th>
                <th className="px-6 py-4 text-left text-white font-medium">전환율</th>
                <th className="px-6 py-4 text-left text-white font-medium">기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{campaign.sent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${campaign.openRate}%`,
                            backgroundColor: '#0D9488',
                          }}
                        ></div>
                      </div>
                      <span className="font-semibold">{campaign.openRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${campaign.clickRate}%`,
                            backgroundColor: '#F59E0B',
                          }}
                        ></div>
                      </div>
                      <span className="font-semibold">{campaign.clickRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${campaign.conversionRate}%`,
                            backgroundColor: '#10B981',
                          }}
                        ></div>
                      </div>
                      <span className="font-semibold">{campaign.conversionRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {campaign.startDate} ~ {campaign.endDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button
            className="px-6 py-2 text-white rounded-lg font-medium"
            style={{ backgroundColor: '#0D9438' }}
          >
            결과 내보내기
          </button>
        </div>
      </div>
    </div>
  );
}
