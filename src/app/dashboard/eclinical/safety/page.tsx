'use client';

import { useState, useEffect } from 'react';
import { Search, X, AlertCircle, Loader2, Shield, Activity, CheckCircle, XCircle } from 'lucide-react';

interface SAEReport {
  id: string;
  subjectId: string;
  event: string;
  severity: 'mild' | 'moderate' | 'severe';
  relatedness: 'related' | 'probably_related' | 'unrelated';
  reportDate: string;
  status: 'open' | 'closed' | 'pending';
}

export default function SafetyPage() {
  const [data, setData] = useState<SAEReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/eclinical/safety');
        if (!response.ok) throw new Error('Failed to fetch safety data');
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

  const filtered = data.filter(
    (item) =>
      item.subjectId.toLowerCase().includes(search.toLowerCase()) ||
      item.event.toLowerCase().includes(search.toLowerCase())
  );

  const getSeverityIcon = (severity: string) => {
    if (severity === 'severe') return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (severity === 'moderate') return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-blue-600" />;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: { [key: string]: string } = {
      mild: 'ê²½ì¦',
      moderate: 'ì¤ë±ì¦',
      severe: 'ì¤ì¦',
    };
    return labels[severity] || severity;
  };

  const getRelatednessLabel = (relatedness: string) => {
    const labels: { [key: string]: string } = {
      related: 'ê´ë ¨',
      probably_related: 'ìë§ë ê´ë ¨',
      unrelated: 'ë¬´ê´',
    };
    return labels[relatedness] || relatedness;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'closed') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'open') return <AlertCircle className="w-4 h-4 text-orange-600" />;
    return <XCircle className="w-4 h-4 text-gray-400" />;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: 'ì§íì¤',
      closed: 'ì¢ë£',
      pending: 'ëê¸°ì¤',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ìì ì± (SAE ë³´ê³ )</h1>
        <p className="text-gray-600 mt-2">ì¤ëí ì´ìë°ì ë° ìì ì± ë³´ê³  íí©</p>
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
              placeholder="í¼íìID ëë ì¬ê±´ ê²ì..."
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
            <p className="text-gray-500">ë°ì´í°ê° ììµëë¤.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    í¼íìID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ì¬ê±´
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìê°ë
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ê´ë ¨ì±
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ë³´ê³ ì¼
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìí
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      {item.subjectId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.event}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(item.severity)}
                        <span className="text-gray-700">{getSeverityLabel(item.severity)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {getRelatednessLabel(item.relatedness)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(item.reportDate).toLocaleDateString('ko-KR')}
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
  AlertCircle,
  FileText,
  Search,
  X,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { apiGet, apiPost } from 'A/lib/api'
