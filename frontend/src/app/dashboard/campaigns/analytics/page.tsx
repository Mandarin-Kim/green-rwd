'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, MousePointer, Eye, ArrowUpDown } from 'lucide-react';

export default function CampaignAnalyticsPage() {
  const [dateRange, setDateRange] = useState('7');
  const [sortColumn, setSortColumn] = useState('campaign');
  const [sortDirection, setSortDirection] = useState('asc');

  const dateRanges = [
    { value: '7', label: '최근 7일' },
    { value: '30', label: '최근 30일' },
    { value: '90', label: '최근 90일' },
  ];

  const mockCampaigns = [
    {
      id: 1,
      name: '심부전 Entresto',
      sent: 45230,
      openRate: 32.5,
      clickRate: 8.2,
      conversionRate: 2.1,
      cost: 4523000,
      roi: 3.8,
      status: '활성',
    },
    {
      id: 2,
      name: '폐암 키트루다',
      sent: 38901,
      openRate: 28.3,
      clickRate: 6.5,
      conversionRate: 1.8,
      cost: 3890000,
      roi: 2.9,
      status: '활성',
    },
    {
      id: 3,
      name: '루테인 건기식',
      sent: 52345,
      openRate: 35.1,
      clickRate: 10.2,
      conversionRate: 3.5,
      cost: 5234000,
      roi: 4.2,
      status: '완료',
    },
    {
      id: 4,
      name: 'SGLT2i 당뇨',
      sent: 41230,
      openRate: 29.8,
      clickRate: 7.3,
      conversionRate: 2.3,
      cost: 4123000,
      roi: 3.1,
      status: '활성',
    },
    {
      id: 5,
      name: '건강검진 프로모션',
      sent: 58932,
      openRate: 38.2,
      clickRate: 11.5,
      conversionRate: 4.2,
      cost: 5893000,
      roi: 4.8,
      status: '완료',
    },
    {
      id: 6,
      name: 'GLP-1 비만치료제',
      sent: 33456,
      openRate: 26.7,
      clickRate: 5.8,
      conversionRate: 1.5,
      cost: 3345000,
      roi: 2.4,
      status: '일시정지',
    },
  ];

  const totalSent = mockCampaigns.reduce((acc, c) => acc + c.sent, 0);
  const avgOpenRate = (mockCampaigns.reduce((acc, c) => acc + c.openRate, 0) / mockCampaigns.length).toFixed(1);
  const avgClickRate = (mockCampaigns.reduce((acc, c) => acc + c.clickRate, 0) / mockCampaigns.length).toFixed(1);
  const avgConversionRate = (mockCampaigns.reduce((acc, c) => acc + c.conversionRate, 0) / mockCampaigns.length).toFixed(1);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedCampaigns = [...mockCampaigns].sort((a, b) => {
    const aVal = a[sortColumn as keyof typeof a];
    const bVal = b[sortColumn as keyof typeof b];

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(String(bVal)) : String(bVal).localeCompare(aVal);
    }

    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const kpiCards = [
    { label: '총 발송', value: totalSent.toLocaleString(), icon: TrendingUp, color: 'text-blue-600' },
    { label: '오픈율', value: `${avgOpenRate}%`, icon: Eye, color: 'text-green-600' },
    { label: '클릭율', value: `${avgClickRate}%`, icon: MousePointer, color: 'text-orange-600' },
    { label: '전환율', value: `${avgConversionRate}%`, icon: TrendingUp, color: 'text-purple-600' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case '활성':
        return 'bg-green-100 text-green-800';
      case '완료':
        return 'bg-blue-100 text-blue-800';
      case '일시정지':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">캠페인 분석</h1>
        <p className="text-slate-500">마케팅 캠페인 성과를 분석하고 모니터링하세요</p>
      </div>

      <div className="mb-8 flex gap-2">
        {dateRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => setDateRange(range.value)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              dateRange === range.value
                ? 'bg-primary text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-primary'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi, idx) => {
          const IconComponent = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">{kpi.label}</h3>
                <IconComponent className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold text-navy">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 font-semibold text-navy hover:text-primary"
                  >
                    캠페인명
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleSort('sent')}
                    className="flex items-center gap-2 font-semibold text-navy hover:text-primary ml-auto"
                  >
                    발송수
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleSort('openRate')}
                    className="flex items-center gap-2 font-semibold text-navy hover:text-primary ml-auto"
                  >
                    오픈율
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleSort('clickRate')}
                    className="flex items-center gap-2 font-semibold text-navy hover:text-primary ml-auto"
                  >
                    클릭율
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleSort('conversionRate')}
                    className="flex items-center gap-2 font-semibold text-navy hover:text-primary ml-auto"
                  >
                    전환율
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleSort('cost')}
                    className="flex items-center gap-2 font-semibold text-navy hover:text-primary ml-auto"
                  >
                    비용
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleSort('roi')}
                    className="flex items-center gap-2 font-semibold text-navy hover:text-primary ml-auto"
                  >
                    ROI
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-navy">{campaign.name}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{campaign.sent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{campaign.openRate.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-right text-slate-700">{campaign.clickRate.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-right text-slate-700">{campaign.conversionRate.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-right text-slate-700">₩{campaign.cost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-semibold text-primary">{campaign.roi.toFixed(1)}x</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
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
