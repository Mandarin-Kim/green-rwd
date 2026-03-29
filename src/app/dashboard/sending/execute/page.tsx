'use client';

import React, { useState } from 'react';
import { Send, Pause, Play, AlertCircle, Check, Clock } from 'lucide-react';

interface SendingJob {
  id: string;
  campaignName: string;
  sendCount: number;
  type: 'SMS' | 'Email' | 'Push';
  status: '대기' | '발송중' | '완료' | '실패';
  progress: number;
  startTime?: string;
  endTime?: string;
  createdDate: string;
}

export default function SendingExecutePage() {
  const [jobs, setJobs] = useState<SendingJob[]>([
    {
      id: '1',
      campaignName: '고혈압 약물 임상시험 모집',
      sendCount: 15420,
      type: 'SMS',
      status: '발송중',
      progress: 65,
      startTime: '2026-03-28 15:00',
      createdDate: '2026-03-28',
    },
    {
      id: '2',
      campaignName: '당뇨병 신약 모집 캠페인',
      sendCount: 8950,
      type: 'Email',
      status: '완료',
      progress: 100,
      startTime: '2026-03-27 09:00',
      endTime: '2026-03-27 10:30',
      createdDate: '2026-03-27',
    },
    {
      id: '3',
      campaignName: '장기 심혈관 임상시험',
      sendCount: 2340,
      type: 'Push',
      status: '대기',
      progress: 0,
      createdDate: '2026-03-28',
    },
  ]);

  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<SendingJob | null>(null);

  const waitingJobs = jobs.filter((j) => j.status === '대기');
  const sendingJobs = jobs.filter((j) => j.status === '발송중');
  const completedJobs = jobs.filter((j) => j.status === '완료');
  const failedJobs = jobs.filter((j) => j.status === '실패');

  const kpiData = [
    { label: '대기', value: waitingJobs.length, color: 'bg-gray-100', textColor: 'text-gray-700' },
    { label: '발송중', value: sendingJobs.length, color: 'bg-blue-100', textColor: 'text-blue-700' },
    { label: '완료', value: completedJobs.length, color: 'bg-green-100', textColor: 'text-green-700' },
    { label: '실패', value: failedJobs.length, color: 'bg-red-100', textColor: 'text-red-700' },
  ];

  const handleSendConfirm = (id: string) => {
    setJobs(
      jobs.map((j) =>
        j.id === id
          ? {
              ...j,
              status: '발송중',
              startTime: new Date().toLocaleString(),
            }
          : j
      )
    );
    setShowConfirmModal(null);
  };

  const handlePause = (id: string) => {
    setJobs(
      jobs.map((j) =>
        j.id === id
          ? {
              ...j,
              status: '대기',
            }
          : j
      )
    );
  };

  const handleResume = (id: string) => {
    setJobs(
      jobs.map((j) =>
        j.id === id
          ? {
              ...j,
              status: '발송중',
            }
          : j
      )
    );
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#0F172A' }}>발송 실행</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className={`p-6 rounded-lg ${kpi.color}`}>
              <p className="text-sm font-medium text-gray-700 mb-2">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Waiting Jobs */}
        {waitingJobs.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>
                발송 대기 중 ({waitingJobs.length})
              </h2>
            </div>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">캠페인명</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">유형</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">발송건</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">조치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {waitingJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{job.campaignName}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              job.type === 'SMS'
                                ? '#3B82F6'
                                : job.type === 'Email'
                                  ? '#8B5CF6'
                                  : '#EC4899',
                          }}
                        >
                          {job.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{job.sendCount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setShowConfirmModal(job.id)}
                          className="text-white px-4 py-1 rounded text-sm font-medium flex items-center gap-2"
                          style={{ backgroundColor: '#0D9488' }}
                        >
                          <Send className="w-4 h-4" />
                          발송
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sending Jobs */}
        {sendingJobs.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>
                발송 중 ({sendingJobs.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {sendingJobs.map((job) => (
                <div key={job.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{job.campaignName}</h3>
                      <p className="text-sm text-gray-600 mt-1">총 {job.sendCount.toLocaleString()}건</p>
                    </div>
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                      style={{
                        backgroundColor:
                          job.type === 'SMS'
                            ? '#3B82F6'
                            : job.type === 'Email'
                              ? '#8B5CF6'
                              : '#EC4899',
                      }}
                    >
                      {job.type}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">진행률</span>
                      <span className="text-sm font-semibold text-gray-900">{job.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${job.progress}%`,
                          backgroundColor: '#0D9488',
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p>시작: {job.startTime}</p>
                    <p>예상 완료: 약 30분</p>
                  </div>

                  <button
                    onClick={() => handlePause(job.id)}
                    className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    일시정지
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-0">
                <Check className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>
                  발송 완료 ({completedJobs.length})
                </h2>
              </div>
            </div>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">캠페인명</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">유형</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">발송건</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">완료시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{job.campaignName}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              job.type === 'SMS'
                                ? '#3B82F6'
                                : job.type === 'Email'
                                  ? '#8B5CF6'
                                  : '#EC4899',
                          }}
                        >
                          {job.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{job.sendCount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{job.endTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && selectedJob === null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              {(() => {
                const job = jobs.find((j) => j.id === showConfirmModal);
                return (
                  <>
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                          발송 확인
                        </h2>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-6">
                      <strong>{job?.campaignName}</strong>
                      <br />
                      {job?.sendCount.toLocaleString()}건을 발송하시겠습니까?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirmModal(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleSendConfirm(showConfirmModal)}
                        className="flex-1 px-4 py-2 text-white rounded-lg font-medium"
                        style={{ backgroundColor: '#0D9488' }}
                      >
                        발송
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
