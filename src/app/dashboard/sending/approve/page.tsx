'use client';

import { useState, useEffect } from 'react';
import { Search, X, AlertCircle, CheckCircle, Loader2, XCircle, Calendar } from 'lucide-react';

interface SendingApproval {
  id: string;
  campaignId: string;
  totalCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string;
}

export default function SendingApprovePage() {
  const [data, setData] = useState<SendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/sending');
        if (!response.ok) throw new Error('Failed to fetch sending data');
        const result = await response.json();
        setData(result.filter((item: SendingApproval) => item.status === 'pending'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = data.filter(
    (item) =>
      item.campaignId.toLowerCase().includes(search.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'ì¹ì¸ ëê¸°ì¤',
      approved: 'ì¹ì¸ë¨',
      rejected: 'ê±°ì ë¨',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ë°ì¡ ì¹ì¸ ê´ë¦¬</h1>
        <p className="text-gray-600 mt-2">ì¹ì¸ ëê¸° ì¤ì¸ ë°ì¡ ìº íì¸</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">ì¤ë¥ ë°ì</p>
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
              placeholder="ìº íì¸ID ëë ìì±ì ê²ì..."
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
            <p className="text-gray-500">ì¹ì¸ ëê¸°ì¤ì¸ ë°ì¡ì´ ììµëë¤.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìº íì¸ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ì´ ë°ì¡ê±´ì
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìì±ì
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìì±ì¼
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìí
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.campaignId}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {item.totalCount}ê±´
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.createdBy}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-gray-700">{getStatusLabel(item.status)}</span>
                      </div>
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
    }'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  List,
  CheckCircle,
  Ban,
  AlertCircle,
  FileText,
  Search,
  X,
  CheckCircle2
} from 'lucide-react'
import { apiGet, apiPut } from 'A/lib/api'
