'use client';

import { TrendingUp, BarChart3, Target, Zap } from 'lucide-react';

export default function SendingPerformancePage() {
  const performanceKPIs = [
    { label: '발송 성공률', value: '98.5%', icon: TrendingUp, color: 'text-green-600' },
    { label: '평균 오픈율', value: '32.1%', icon: BarChart3, color: 'text-blue-600' },
    { label: '평균 클릭률', value: '8.4%', icon: Target, color: 'text-orange-600' },
    { label: '수신거부율', value: '0.8%', icon: Zap, color: 'text-red-600' },
  ];

  const channelMetrics = [
    {
      channel: 'SMS',
      successRate: 99.2,
      openRate: 45.3,
      clickRate: 12.1,
      conversionRate: 3.2,
      unsubscribeRate: 0.3,
    },
    {
      channel: 'Email',
      successRate: 98.8,
      openRate: 28.5,
      clickRate: 7.2,
      conversionRate: 2.1,
      unsubscribeRate: 0.9,
    },
    {
      channel: 'Push',
      successRate: 97.5,
      openRate: 32.1,
      clickRate: 8.5,
      conversionRate: 2.8,
      unsubscribeRate: 1.2,
    },
    {
      channel: 'KakaoTalk',
      successRate: 99.1,
      openRate: 52.8,
      clickRate: 14.3,
      conversionRate: 4.2,
      unsubscribeRate: 0.4,
    },
  ];

  const recentSendings = [
    {
      campaign: '심부전 Entresto 신약 모집',
      channel: 'SMS',
      sentDate: '2026-03-28 14:30',
      sentCount: 45230,
      successRate: 99.1,
      openRate: 38.2,
      clickRate: 9.5,
      conversions: 862,
    },
    {
      campaign: '폐암 임상시험 참여자 모집',
      channel: 'Email',
      sentDate: '2026-03-28 13:00',
      sentCount: 38901,
      successRate: 98.5,
      openRate: 28.3,
      clickRate: 6.8,
      conversions: 627,
    },
    {
      campaign: '루테인 건강식품 프로모션',
      channel: 'Push',
      sentDate: '2026-03-28 10:15',
      sentCount: 52345,
      successRate: 97.2,
      openRate: 35.1,
      clickRate: 10.2,
      conversions: 1058,
    },
    {
      campaign: 'SGLT2i 당뇨 환자 대상',
      channel: 'SMS',
      sentDate: '2026-03-27 16:45',
      sentCount: 41230,
      successRate: 99.3,
      openRate: 42.1,
      clickRate: 11.3,
      conversions: 875,
    },
    {
      campaign: '건강검진 프로모션',
      channel: 'KakaoTalk',
      sentDate: '2026-03-27 09:30',
      sentCount: 58932,
      successRate: 99.4,
      openRate: 56.2,
      clickRate: 15.8,
      conversions: 1512,
    },
    {
      campaign: 'GLP-1 비만치료제',
      channel: 'Email',
      sentDate: '2026-03-26 14:00',
      sentCount: 33456,
      successRate: 98.2,
      openRate: 25.1,
      clickRate: 5.2,
      conversions: 348,
    },
    {
      campaign: '스타틴 콜레스테롤 약',
      channel: 'Push',
      sentDate: '2026-03-26 11:20',
      sentCount: 47892,
      successRate: 96.8,
      openRate: 30.2,
      clickRate: 8.1,
      conversions: 745,
    },
    {
      campaign: '비타민 D 건강식품',
      channel: 'SMS',
      sentDate: '2026-03-25 15:00',
      sentCount: 39521,
      successRate: 99.0,
      openRate: 40.5,
      clickRate: 10.8,
      conversions: 721,
    },
    {
      campaign: '혈앩약 신제품 안내',
      channel: 'KakaoTalk',
      sentDate: '2026-03-25 10:30',
      sentCount: 44678,
      successRate: 98.9,
      openRate: 51.2,
      clickRate: 13.5,
      conversions: 892,
    },
    {
      campaign: '당뇨 관리 앱 홍보',
      channel: 'Email',
      sentDate: '2026-03-24 09:00',
      sentCount: 36234,
      successRate: 97.8,
      openRate: 26.8,
      clickRate: 6.4,
      conversions: 489,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">발송 성과</h1>
        <p className="text-slate-500">캠페인 발송 성과를 분석하고 최적화하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {performanceKPIs.map((kpi, idx) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-navy mb-6">채널별 성과</h3>
          <div className="space-y-4">
            {channelMetrics.map((metric) => (
              <div key={metric.channel} className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-navy mb-3">{metric.channel}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600 text-xs mb-1">성공률</p>
                    <p className="font-bold text-navy">{metric.successRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs mb-1">오픈율</p>
                    <p className="font-bold text-navy">{metric.openRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs mb-1">클릭율</p>
                    <p className="font-bold text-navy">{metric.clickRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs mb-1">전환율</p>
                    <p className="font-bold text-navy">{metric.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-navy mb-6">채널 비교</h3>
          <div className="space-y-4">
            {['오픈율', '클릭율', '전환율'].map((metric) => {
              const getMetricValue = (m: (typeof channelMetrics)[0], key: string) => {
                if (key === '오픈율') return m.openRate;
                if (key === '클릭율') return m.clickRate;
                return m.conversionRate;
              };
              const maxValue = Math.max(
                ...channelMetrics.map((m) => getMetricValue(m, metric))
              );
              return (
                <div key={metric}>
                  <p className="text-sm font-semibold text-navy mb-2">{metric}</p>
                  <div className="space-y-2">
                    {channelMetrics.map((m) => (
                      <div key={m.channel} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-16 text-slate-600">{m.channel}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(getMetricValue(m, metric) / maxValue) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-navy w-10 text-right">
                          {getMetricValue(m, metric).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-navy">최근 10개 발송</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">캠페인</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">채널</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">발송일</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy">발송수</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy">성공률</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy">오픈율</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy">클릭률</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy">전환수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentSendings.map((sending, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-navy">{sending.campaign}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                      {sending.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{sending.sentDate}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-700">{sending.sentCount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-700">
                    {sending.successRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-700">
                    {sending.openRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-700">
                    {sending.clickRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-primary">
                    {sending.conversions.toLocaleString()}
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
