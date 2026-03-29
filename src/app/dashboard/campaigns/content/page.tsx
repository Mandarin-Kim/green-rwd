'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, Archive } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  type: 'SMS' | 'Email' | 'Push';
  content: string;
  status: 'draft' | 'active' | 'archived';
  createdDate: string;
  updatedDate: string;
}

interface FormData {
  title: string;
  type: 'SMS' | 'Email' | 'Push';
  content: string;
}

export default function CampaignsContentPage() {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      title: '기본 임상시험 모집 SMS',
      type: 'SMS',
      content: '[의료기관] 고혈압 신약 임상시험 참여자 모집중입니다. 자세한 내용은 클릭하세요.',
      status: 'active',
      createdDate: '2026-03-01',
      updatedDate: '2026-03-15',
    },
    {
      id: '2',
      title: '이메일 초대장',
      type: 'Email',
      content: '안녕하세요.\n\n저희 임상시험에 참여하실 의향이 있으신 분들을 초대합니다.\n자세한 정보는 첨부 파일을 참조하시기 바랍니다.',
      status: 'active',
      createdDate: '2026-02-28',
      updatedDate: '2026-03-10',
    },
    {
      id: '3',
      title: '푸시 알림 - 당뇨병',
      type: 'Push',
      content: '당뇨병 신약 임상시험 모집 중입니다. 더 알아보기를 클릭해주세요.',
      status: 'draft',
      createdDate: '2026-03-20',
      updatedDate: '2026-03-22',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'archived'>('all');
  const [showModal, setShowModal] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    type: 'SMS',
    content: '',
  });

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.title.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingId(template.id);
      setFormData({
        title: template.title,
        type: template.type,
        content: template.content,
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', type: 'SMS', content: '' });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingId) {
      setTemplates(
        templates.map((t) =>
          t.id === editingId
            ? {
                ...t,
                ...formData,
                updatedDate: new Date().toISOString().split('T')[0],
              }
            : t
        )
      );
    } else {
      const newTemplate: Template = {
        id: String(templates.length + 1),
        ...formData,
        status: 'draft',
        createdDate: new Date().toISOString().split('T')[0],
        updatedDate: new Date().toISOString().split('T')[0],
      };
      setTemplates([...templates, newTemplate]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setTemplates(templates.filter((t) => t.id !== id));
    }
  };

  const handleStatusChange = (id: string, newStatus: 'draft' | 'active' | 'archived') => {
    setTemplates(
      templates.map((t) =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
              updatedDate: new Date().toISOString().split('T')[0],
            }
          : t
      )
    );
  };

  const previewTemplate = templates.find((t) => t.id === previewId);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#0F172A' }}>콘텐츠 생성</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium"
            style={{ backgroundColor: '#0D9488' }}
          >
            <Plus className="w-5 h-5" />
            새 템플릿
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="템플릿명 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="draft">작성중</option>
              <option value="active">활성</option>
              <option value="archived">보관됨</option>
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">{template.title}</h3>
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-semibold text-white mb-3"
                      style={{
                        backgroundColor:
                          template.type === 'SMS'
                            ? '#3B82F6'
                            : template.type === 'Email'
                              ? '#8B5CF6'
                              : '#EC4899',
                      }}
                    >
                      {template.type}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      template.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : template.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {template.status === 'active' ? '활성' : template.status === 'draft' ? '작성중' : '보관됨'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{template.content}</p>

                <div className="flex gap-2 flex-wrap text-xs text-gray-500 mb-4">
                  <span>생성: {template.createdDate}</span>
                  <span>•</span>
                  <span>수정: {template.updatedDate}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewId(template.id)}
                    className="flex-1 px-3 py-2 rounded text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    보기
                  </button>
                  <button
                    onClick={() => handleOpenModal(template)}
                    className="px-3 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="px-3 py-2 rounded text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#0F172A' }}>
                {editingId ? '템플릿 수정' : '새 템플릿 생성'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">템플릿명</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                  >
                    <option value="SMS">SMS</option>
                    <option value="Email">Email</option>
                    <option value="Push">Push</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">콘텐츠</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>
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

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#0F172A' }}>
                {previewTemplate.title}
              </h2>
              <div className="mb-6">
                <span
                  className="inline-block px-3 py-1 rounded text-sm font-semibold text-white mb-4"
                  style={{
                    backgroundColor:
                      previewTemplate.type === 'SMS'
                        ? '#3B82F6'
                        : previewTemplate.type === 'Email'
                          ? '#8B5CF6'
                          : '#EC4899',
                  }}
                >
                  {previewTemplate.type}
                </span>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 min-h-32">
                <p className="text-gray-900 whitespace-pre-wrap">{previewTemplate.content}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  onClick={() =>
                    handleStatusChange(previewTemplate.id, previewTemplate.status === 'active' ? 'draft' : 'active')
                  }
                  className="flex-1 px-4 py-2 text-white rounded-lg font-medium"
                  style={{ backgroundColor: '#0D9488' }}
                >
                  {previewTemplate.status === 'active' ? '비활성화' : '활성화'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
