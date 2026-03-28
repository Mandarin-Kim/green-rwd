'use client';

import { useState } from 'react';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function SendingApprovePage() {
  const [activeStatus, setActiveStatus] = useState('pending');

  const mockApprovals = [
    {
      id: 1,
      campaignName: '심부전 Entresto 신약 모집',
      segment: '심부전 HFrEF',
      scheduledDate: '2026-03-29 10:00',
      requestedBy: '김마케팅',
      estimatedCost: 4523000,
      targetCount: 45230,
      status: 'pending',
    },
    {
      id: 2,
      campaignName: '폐암 임상시험 참여자 모집',
      segment: 'NSCLC Stage III-IV',
      scheduledDate: '2026-03-30 14:30',
      requestedBy: '이임상',
      estimatedCost: 3890000,
      targetCount: 38901,
      status: 'pending',
    },
    {
      id: 3,
      campaignName: '루테인 건강식품 프로모션',
      segment: '40대 이상 안경 사용자',
      scheduledDate: '2026-04-01 09:00',
      requestedBy: '박상품',
      estimatedCost: 5234000,
      targetCount: 52345,
      status: 'pending',
    },
    {
      id: 4,
      campaignName: 'SGLT2i 당뇨 환자 대상',
      segment: 'SGLT2i 당뇨 환자',
      scheduledDate: '2026-04-02 11:00',
      requestedBy: '최약사',
      estimatedCost: 4123000,
      targetCount: 41230,
      status: 'pending',
    },
  ];

  const mockApproved = [
    {
      id: 5,
      campaignName: '건강검진 프로모션',
      segment: '30-60대 일반인',
      scheduledDate: '2026-03-28 08:00',
      requestedBy: '정건강',
      estimatedCost: 5893000,
      targetCount: 58932,
      status: 'approved',
    },
  ];

  const mockRejected = [
    {
      id: 6,
      campaignName: 'GLP-1 비만치료제 과도한 프로모션',
      segment: 'BMI 30 이상',
      scheduledDate: '2026-03-27 10:00',
      requestedBy: '이마케팅',
      estimatedCost: 3345000,
      targetCount: 33456,
      status: 'rejected',
    },
  ];

  const getStatusData = () => {
    switch (activeStatus) {
      case 'approved':
        return mockApproved;
      case 'rejected':
        return mockRejected;
      default:
        return mockApprovals;
    }
  };

  const statusTabs = [
    { value: 'pending', label: '대기중', icon: Clock, count: mockApprovals.length },
    { value: 'approved', label: '승인됨', icon: CheckCircle, count: mockApproved.length },
    { value: 'rejected', label: '반려됨', icon: XCircle, count: mockRejected.length },
  ];

  const data = getStatusData();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">발송 승인</h1>
        <p className="text-slate-500">캠페인 발송을 검토하고 승인하세요</p>
      </div>

      <div className="flex gap-4 mb-8">
        {statusTabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeStatus === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-primary'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {data.map((approval) => (
          <div key={approval.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-xs text-slate-600 mb-1">캠페인명</p>
                <p className="font-semibold text-navy">{approval.campaignName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">타겟 세그먼트</p>
                <p className="font-semibold text-navy">{approval.segment}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">예정 발송일</p>
                <p className="font-semibold text-navy">{approval.scheduledDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">요청자</p>
                <p className="font-semibold text-navy">{approval.requestedBy}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">예상 비용</p>
                  <p className="font-bold text-navy">₩{approval.estimatedCost.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">타겟 인원</p>
                  <p className="font-bold text-navy">{approval.targetCount.toLocaleString()}명</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-lg p-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">1인당 비용</p>
                  <p className="font-bold text-navy">₩{Math.round(approval.estimatedCost / approval.targetCount).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {activeStatus === 'pending' && (
              <div className="flex gap-3">
                <button className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  승인
                </button>
                <button className="flex-1 px-6 py-3 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  반려
                </button>
                <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  상세보기
                </button>
              </div>
            )}

            {activeStatus === 'approved' && (
              <div className="flex gap-3">
                <div className="flex-1 px-6 py-3 bg-green-100 rounded-lg text-center">
                  <p className="font-semibold text-green-700">승인됨</p>
                </div>
                <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  상세보기
                </button>
              </div>
            )}

            {activeStatus === 'rejected' && (
              <div className="flex gap-3">
                <div className="flex-1 px-6 py-3 bg-red-100 rounded-lg text-center">
                  <p className="font-semibold text-red-700">반려됨</p>
                </div>
                <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                  상세보기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
