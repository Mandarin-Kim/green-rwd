'use client';

import { useState } from 'react';
import { Settings, Bell, Key, Users, Building2, Shield, Copy, RefreshCw } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedDate: string;
}

const mockTeamMembers: TeamMember[] = [
  { id: 'TM001', name: '박지ᛈ', email: 'jihun.park@greenribbon.co.kr', role: '관리자', joinedDate: '2024-01-01' },
  { id: 'TM002', name: '김효주', email: 'hyoju.kim@greenribbon.co.kr', role: 'CRA', joinedDate: '2024-01-15' },
  { id: 'TM003', name: '이순신', email: 'sunsin.lee@greenribbon.co.kr', role: 'CRA', joinedDate: '2024-02-01' },
  { id: 'TM004', name: '박영석', email: 'young.park@greenribbon.co.kr', role: 'CRA', joinedDate: '2024-02-15' },
];

type TabType = 'general' | 'notifications' | 'api' | 'team';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const handleCopyApiKey = () => {
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">설정</h1>
          <p className="text-slate-500">플랫폼 설정 및 관리</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 mb-8">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'text-navy border-primary'
                  : 'text-slate-600 border-transparent hover:text-navy'
              }`}
            >
              <Settings className="w-4 h-4" />
              일반
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'notifications'
                  ? 'text-navy border-primary'
                  : 'text-slate-600 border-transparent hover:text-navy'
              }`}
            >
              <Bell className="w-4 h-4" />
              알림
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'api'
                  ? 'text-navy border-primary'
                  : 'text-slate-600 border-transparent hover:text-navy'
              }`}
            >
              <Key className="w-4 h-4" />
              API
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'team'
                  ? 'text-navy border-primary'
                  : 'text-slate-600 border-transparent hover:text-navy'
              }`}
            >
              <Users className="w-4 h-4" />
              팀관리
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-8">
                {/* Organization Info */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-navy" />
                    <h3 className="text-lg font-semibold text-navy">조직 정보</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pl-7">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">조직명</label>
                      <input
                        type="text"
                        defaultValue="그린리본"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">사업자번호</label>
                      <input
                        type="text"
                        defaultValue="XXX-XX-XXXXX"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">대표자명</label>
                      <input
                        type="text"
                        defaultValue="김영수"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">대표 연락처</label>
                      <input
                        type="tel"
                        defaultValue="02-1234-5678"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Settings */}
                <div className="pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-navy" />
                    <h3 className="text-lg font-semibold text-navy">플랫폼 설정</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pl-7">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">기본 언어</label>
                      <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>한국어</option>
                        <option>English</option>
                        <option>日本語</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">표준시간대</label>
                      <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>Asia/Seoul (UTC+9)</option>
                        <option>Asia/Tokyo (UTC+9)</option>
                        <option>UTC</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Billing Info */}
                <div className="pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-navy" />
                    <h3 className="text-lg font-semibold text-navy">요금 정보</h3>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-6 pl-7">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-slate-600 mb-1">현재 요금제</p>
                        <p className="text-lg font-bold text-navy">프리미엄</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">월별 발송량</p>
                        <p className="text-lg font-bold text-navy">1,250 / 5,000</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">다음 청굠일</p>
                        <p className="text-lg font-bold text-navy">2026-04-28</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-navy mb-4">알림 수신 방식</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-primary" />
                      <span className="text-sm text-slate-700">이메일 알림</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-primary" />
                      <span className="text-sm text-slate-700">SMS 알림</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary" />
                      <span className="text-sm text-slate-700">푸시 알림</span>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-navy mb-4">알림 임계값</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">예산 초과 알림 (%)</label>
                      <input
                        type="number"
                        defaultValue="80"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">캠페인 완료 지연 알림 (시간)</label>
                      <input
                        type="number"
                        defaultValue="24"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API Tab */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-navy mb-4">API 키</h3>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg border border-slate-200">
                      <span className="text-sm font-mono text-slate-600">sk_live_••••••••••••••••••••</span>
                    </div>
                    <button
                      onClick={handleCopyApiKey}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        apiKeyCopied
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">API 키는 안전하게 보관하세요. 외부와 공유하지 마세요.</p>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <button className="flex items-center gap-2 px-4 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                    <RefreshCw className="w-4 h-4" />
                    API 키 재생성
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-navy mb-4">Webhook URL</h3>
                  <input
                    type="text"
                    placeholder="https://your-domain.com/webhook"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  />
                  <p className="text-xs text-slate-500">Webhook 이벤트를 수신할 URL을 입력하세요.</p>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-navy mb-4">API 제한</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-2">분당 요청 제핚: <span className="font-semibold text-navy">1,000 요청/분</span></p>
                    <p className="text-sm text-slate-600">일별 요청 제핚: <span className="font-semibold text-navy">무제한</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-navy">팀 멤버</h3>
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all text-sm">
                    초대
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy">이름</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy">이메일</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy">역할</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy">초대일</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mockTeamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-navy font-medium">{member.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{member.email}</td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{member.joinedDate}</td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                              ⋮
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button className="px-6 py-2 border border-slate-200 text-navy rounded-lg hover:bg-slate-50 transition-all">
            취소
          </button>
          <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
