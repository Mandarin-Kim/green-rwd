'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  X,
  AlertCircle,
  Loader2,
  BarChart3,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  campaignId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  executedAt: string;
}

export default function SendingPerformancePage() {
  const [data, setData] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/sending/performance');
        if (!response.ok) throw new Error('Failed to fetch performance data');
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
    item.campaignId.toLowerCase().includes(search.toLowerCase())
  );

  const calculateRate = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const getRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600';
    if (rate >= 40) return 'text-blue-600';
    if (rate >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ë°ì¡ ì±ê³¼</h1>
        <p className="text-gray-600 mt-2">ìº íì¸ë³ ë°ì¡ ì±ê³¼ ì§í</p>
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
              placeholder="ìº íì¸ID ê²ì..."
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
                    ìº íì¸ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ë°ì¡
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ë°°ë¬ì¨
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ê°ë´ì¨
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    í´ë¦­ì¨
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ë°ì¡
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ì¤íì¼
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const deliveryRate = calculateRate(item.delivered, item.sent);
                  const openRate = calculateRate(item.opened, item.delivered);
                  const clickRate = calculateRate(item.clicked, item.opened);
                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                        {item.campaignId}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">{item.sent}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className={`font-semibold ${getRateColor(deliveryRate)}`}>
                            {deliveryRate}%
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.delivered}/{item.sent}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className={`font-semibold ${getRateColor(openRate)}`}>
                            {openRate}%
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.opened}/{item.delivered}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className={`font-semibold ${getRateColor(clickRate)}`}>
                            {clickRate}%
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.clicked}/{item.opened}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                          {item.bounced}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(item.executedAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  );
                })}
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
  BarChart3,
  Calendar,
  Download,
  Period,
  Search,
  X,
  TrendingUp,
  Line,
} from 'lucide-react'
import { apiGet } from '@/lib/api'
