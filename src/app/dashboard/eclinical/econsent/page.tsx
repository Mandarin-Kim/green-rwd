'use client';

import { useState, useEffect } from 'react';
import { Search, X, AlertCircle, CheckCircle, Loader2, XCircle, FileText } from 'lucide-react';

interface EConsentForm {
  id: string;
  title: string;
  version: string;
  status: 'draft' | 'approved' | 'active' | 'archived';
  subjectConsentCount: number;
  totalSubjects: number;
  createdAt: string;
}

export default function EConsentPage() {
  const [data, setData] = useState<EConsentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/eclinical/econsent');
        if (!response.ok) throw new Error('Failed to fetch eConsent data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = data.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-blue-600" />;
    if (status === 'draft') return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-gray-400" />;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: '작성중',
      approved: '승인됨',
      active: '활성',
      archived: '보관됨',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">eConsent (전자동의)</h1>
        <p className="text-gray-600 mt-2">문서 및 피험자 동의 현황</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">오류 발생</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 w-full max-w-md">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="문서명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent flex-1 outline-none text-gray-900"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    문서명
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    버전
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    피험자 동의
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    작성일
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {item.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">v{item.version}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.subjectConsentCount} / {item.totalSubjects}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-gray-700">{getStatusLabel(item.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
