'use client';

import { useState } from 'react';
import { Send, Play, Pause, StopCircle, Activity } from 'lucide-react';

export default function CampaignSendingPage() {
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: '심부전 Entresto 신약 모집',
      channel: 'SMS',
      progress: 65,
      sent: 29400,
      total: 45230,
      status: 'sending',
    },
    {
      id: 2,
      name: '폐암 임상시험 참여자 모집',
      channel: 'Email',
      progress: 38,
      sent: 14782,
      total: 38901,
      status: 'sending',
    },
    {
      id: 3,
      name: '루테인 건강식품 프로모션',
      channel: 'Push',
      progress: 92,
      sent: 48160,
      total: 52345,
      status: 'sending',
    },
  ]);

  const mockLogs = [
    { timestamp: '2026-03-28 14:23', campaign: '루테인 건강식품 프로모션', event: '발송 시작', count: 52345, status: '성공' },
    { timestamp: '2026-03-28 14:15', campaign: '폐암 임상시험 참여자 모집', event: '발송 중단됨', count: 3119, status: '중단' },
    { timestamp: '2026-03-28 14:08', campaign: '심부전 Entresto 신약 모집', event: '일시정지 해제', count: 29400, status: '계속' },
    { timestamp: '2026-03-28 13:45', campaign: '심부전 Entresto 신약 모집', event: '발송 일시정지', count: 28900, status: '정지' },
    { timestamp: '2026-03-28 13:30', campaign: '심부전 Entresto 신약 모집', event: '발송 시작', count: 0, status: '성공' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sending':
        return 'bg-blue-100 text-blue-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sending':
        return '발송중';
      case 'paused':
        return '일시정지';
      case 'completed':
        return '완료';
      default:
        return '준비중';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">캠페인 발송</h1>
        <p className="text-slate-500">실시간으로 캠페인 발송을 관리하세요</p>
      </div>

      <div className="space-y-6 mb-8">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-navy mb-2">{campaign.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                    {campaign.channel}
                  </span>
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-lg ${getStatusColor(campaign.status)}`}>
                    {getStatusLabel(campaign.status)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-3">발송 진행률</p>
                <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${campaign.progress}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-1">발송/총계</p>
                <p className="text-lg font-bold text-navy">
                  {campaign.sent.toLocaleString()} / {campaign.total.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600">{campaign.progress}% 완료</p>
              </div>
            </div>

            <div className="flex gap-3">
              {campaign.status === 'sending' ? (
                <>
                  <button className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-200 transition flex items-center justify-center gap-2">
                    <Pause className="w-4 h-4" />
                    일시정지
                  </button>
                  <button className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition flex items-center justify-center gap-2">
                    <StopCircle className="w-4 h-4" />
                    중단
                  </button>
                </>
              ) : (
                <button className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  재개
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-navy">발송 로그</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">시간</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">캠페인</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-navy">이벤트</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-navy">발송건수</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-navy">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm text-slate-700">{log.timestamp}</td>
                  <td className="px-6 py-4 text-sm font-medium text-navy">{log.campaign}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{log.event}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-700">
                    {log.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-semibold rounded-lg ${
                        log.status === '성공'
                          ? 'bg-green-100 text-green-700'
                          : log.status === '중단'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
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
    </div>
  );
}
