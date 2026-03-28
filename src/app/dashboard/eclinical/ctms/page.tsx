'use client';

import { useState } from 'react';
import { Calendar, Building2, MapPin, Users, Flag } from 'lucide-react';

export default function CTMSPage() {
  const [selectedStudy, setSelectedStudy] = useState('entresto-phase3');

  const studyData = {
    'entresto-phase3': {
      name: 'Entresto Phase III Clinical Trial',
      phase: 'Phase III',
      status: 'Ongoing',
      startDate: '2024-06-15',
      endDate: '2027-06-14',
      sites: 42,
      enrolled: 1234,
      target: 1500,
    },
  };

  const study = studyData['entresto-phase3'];

  const milestones = [
    {
      id: 1,
      name: 'Protocol Approval',
      date: '2024-03-20',
      status: 'Completed',
    },
    {
      id: 2,
      name: 'IRB Approval',
      date: '2024-04-10',
      status: 'Completed',
    },
    {
      id: 3,
      name: 'First Patient In',
      date: '2024-06-15',
      status: 'Completed',
    },
    {
      id: 4,
      name: '50% Enrollment',
      date: '2025-11-30',
      status: 'Completed',
    },
    {
      id: 5,
      name: 'Last Patient Out',
      date: '2026-12-15',
      status: 'Ongoing',
    },
    {
      id: 6,
      name: 'Database Lock',
      date: '2027-04-30',
      status: 'Upcoming',
    },
  ];

  const sites = [
    {
      id: 1,
      name: '서울대병원',
      pi: '김철수',
      enrolled: 45,
      screened: 52,
      screenFailRate: 13.5,
      status: 'Active',
    },
    {
      id: 2,
      name: '삼성서울병원',
      pi: '이영희',
      enrolled: 67,
      screened: 78,
      screenFailRate: 14.1,
      status: 'Active',
    },
    {
      id: 3,
      name: '세브란스병원',
      pi: '박준호',
      enrolled: 52,
      screened: 61,
      screenFailRate: 14.8,
      status: 'Active',
    },
    {
      id: 4,
      name: '아산병원',
      pi: '정미영',
      enrolled: 38,
      screened: 44,
      screenFailRate: 13.6,
      status: 'Active',
    },
  ];

  const getMilestoneColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 border-green-300 text-green-700';
      case 'Ongoing':
        return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'Upcoming':
        return 'bg-slate-100 border-slate-300 text-slate-700';
      default:
        return 'bg-slate-100 border-slate-300 text-slate-700';
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">
            CTMS (Clinical Trial Management)
          </h1>
          <p className="text-slate-500">임상시험 관리 시스템</p>
        </div>

        {/* Study Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">임상시험명</p>
            <p className="text-lg font-bold text-navy mt-2">{study.name}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">상태</p>
            <p className="text-lg font-bold text-navy mt-2">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                {study.status}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">시험기간</p>
            <p className="text-sm font-bold text-navy mt-2">
              {study.startDate} ~ {study.endDate}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-500 text-sm">임상센터 수</p>
            <p className="text-2xl font-bold text-navy mt-2">{study.sites}</p>
          </div>
        </div>

        {/* Enrollment Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4">모집 현황</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-navy">
                  등록: {study.enrolled} / {study.target}명
                </span>
                <span className="text-sm font-bold text-primary">
                  {Math.round((study.enrolled / study.target) * 100)}%
                </span>
              </div>
              <div className="bg-slate-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${(study.enrolled / study.target) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Milestones Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-6">주요 마이스턄</h2>
          <div className="space-y-3">
            {milestones.map((milestone, idx) => (
              <div key={milestone.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getMilestoneColor(milestone.status)}`}>
                    <Flag size={18} />
                  </div>
                  {idx < milestones.length - 1 && (
                    <div className="w-0.5 h-12 bg-slate-300 my-2" />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <p className="font-semibold text-navy">{milestone.name}</p>
                  <p className="text-sm text-slate-600 mt-1">{milestone.date}</p>
                </div>
                <div className="flex items-start">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMilestoneColor(milestone.status)}`}>
                    {milestone.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Site Management Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-navy to-primary">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin size={20} />
              임상센터 관리
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    센터명
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    시험책임의사
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    등록
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    스크리닝
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    스크리닝 실패율
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site, idx) => (
                  <tr
                    key={site.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-navy">
                      {site.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {site.pi}
                    </td>
                    <td className="px-6 py-4 text-sm text-navy font-semibold">
                      {site.enrolled}명
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {site.screened}명
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {site.screenFailRate}%
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        {site.status}
                      </span>
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
