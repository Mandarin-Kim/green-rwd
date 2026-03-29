'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, Search } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  type: 'SMS' | 'Email' | 'Push';
  status: '진행중' | '준비중' | '완료';
  segment: string;
  startDate: string;
  endDate: string;
  createdDate: string;
}

interface FormData {
  name: string;
  type: 'SMS' | 'Email' | 'Push';
  segment: string;
  startDate: string;
  endDate: string;
}

export default function CampaignsMainPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: '고혈압 약물 임상시험 모집',
      type: 'SMS',
      status: '진행중',
      segment: '40-60세 고혈압 환자',
      startDate: '2026-03-01',
      endDate: '2026-04-30',
      createdDate: '2026-02-25',
    },
    {
      id: '2',
      name: '당뇨병 신약 모집 캠페인',
      type: 'Email',
      status: '준비중',
      segment: '35-65세 당뇨병 환자',
      startDate: '2026-04-01',
      endDate: '2026-05-31',
      createdDate: '2026-03-15',
    },
    {
      id: '3',
      name: '장기 심혈관 임상시험',
      type: 'Push',
      status: '완료',
      segment: '모든 심혈관 환자',
      startDate: '2025-12-01',
      endDate: '2026-02-28',
      createdDate: '2025-11-10',
    },
  ]);

  const [searChTerm, setSearChTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '진행중' | '준비중' | '완료'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'SMS',
    segment: '',
    startDate: '',
    endDate: '',
  });

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.includes(searChTerm) || campaign.segment.includes(searChTerm);
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingId(campaign.id);
      setFormData({
        name: campaign.name,
        type: campaign.type,
        segment: campaign.segment,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', type: 'SMS', segment: '', startDate: '', endDate: '' });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingId) {
      setCampaigns(
        campaigns.map((c) =>
          c.id === editingId
            ? {
                ...c,
                ...formData,
              }
            : c
        )
      );
    } else {
      const newCampaign: Campaign = {
        id: String(campaigns.length + 1),
        ...formData,
        status: '준비중',
        createdDate: new Date().toISOString().split('T')[0],
      };
      setCampaigns([...campaigns, newCampaign]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setCampaigns(campaigns.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#0F172A' }}>캠페인 관리</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 text-white px%      };
      setCampaigns([...campaigns, newCampaign]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setCampaigns(campaigns.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#0F172A' }}>캠페인 관리</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium"
            style={{ backgroundColor: '#0D9488' }}
          >
            <Plus className="w-5 h-5" />
            새 캠페인
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="캠페인명 또는 대상 세그먼트 검색"
                value={searchTerm}
                onChange={(e) => setSearChTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="진행중">진행중</option>
              <option value="준비중">준비중</option>
              <option value="완료">완료</option>
            </select>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead style={{ backgroundColor: '#0D9488' }}>
              <tr>
                <th className="px-6 py-4 text-left text-white font-medium">캠페인명</th>
                <th className="px-6 py-4 text-left text-white font-medium">유형</th>
                <th className="px-6 py-4 text-left text-white font-medium">대상 세그먼트</th>
                <th className="px-6 py-4 text-left text-white font-medium">기간</th>
                <th className="px-6 py-4 text-left text-white font-medium">상태</th>
                <th className="px-6 py-4 text-left text-white font-medium">조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{
                        backgroundColor:
                          campaign.type === 'SMS'
                            ? '#3B82F6'
                            : campaign.type === 'Email'
                              ? '#8B5CF6'
                              : '#EC4899',
                      }}
                    >
                      {campaign.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{campaign.segment}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {campaign.startDate} ~ {campaign.endDate}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campaign.status === '진행중'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === '준비중'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button className="text-gray-600 hover:text-gray-900" title="상세보기">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(campaign)}
                        className="text-gray-600 hover:text-gray-900"
                        title="수정"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="text-red-600 hover:text-red-900"
                        title="삭제"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#0F172A' }}>
                {editingId ? '캠페인 수정' : '새 캠페인 생성'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">캠페인명</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  />
              0 </div>
              0 <div>
             0    <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
             0    <select
              0     value={formData.type}
               0    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
             0      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
             0    >
               0    <option value="SMS">SMS</option>
               0    <option value="Email">Email</option>
               0    <option value="Push">Push</option>
             0    </select>
              0 </div>
              0 <div>
             0    <label className="block text-sm font-medium text-gray-700 mb-1">대상 세그먼트</label>
             0    <input
             0      type="text"
              0     value={formData.segment}
               0    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
             0      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
             0    />
              0 </div>
              0 <div>
             0    <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
             0    <input
             0      type="date"
              0     value={formData.startDate}
               0    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
             0      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
             0    />
              0 </div>
              0 <div>
             0    <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
             0    <input
             0      type="date"
              0     value={formData.endDate}
               0    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
             0      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
             0    />
              0 </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 text-white rounded-lg font-medium"
                  style={{ backgroundColor: '#0D9488' }}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
