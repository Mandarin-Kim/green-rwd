'use client';

import { useState, useEffect } from 'react';
import { Search, X, AlertCircle, CheckCircle, Loader2, Play, Calendar } from 'lucide-react';

interface SendingExecution {
  id: string;
  campaignId: string;
  totalCount: number;
  executedCount: number;
  status: 'ready' | 'executing' | 'completed';
  approvedAt: string;
  approvedBy: string;
}

export default function SendingExecutePage() {
  const [data, setData] = useState<SendingExecution[]>([]);
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
        setData(
          result.filter(
            (item: SendingExecution) =>
              item.status === 'ready' || item.status === 'executing'
          )
        );
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
      item.approvedBy.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'executing') return <Play className="w-4 h-4 text-blue-600" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      ready: 'ì¤í ì¤ë¹',
      executing: 'ì¤íì¤',
      completed: 'ìë£',
    };
    return labels[status] || status;
  };

  const getProgressColor = (executed: number, total: number) => {
    const percentage = (executed / total) * 100;
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage > 0) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ë°ì¡ ì¤í ê´ë¦¬</h1>
        <p className="text-gray-600 mt-2">ì¹ì¸ë ë°ì¡ ìº íì¸ ì¤í</p>
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
              placeholder="ìº íì¸ID ëë ì¹ì¸ì ê²ì..."
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
            <p className="text-gray-500">ì¤í ì¤ë¹ë ë°ì¡ì´ ììµëë¤.</p>
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
                    ì§íìí©
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ì§íë
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ì¹ì¸ì
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ì¹ì¸ì¼
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìí
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const progressPercentage = Math.round(
                    (item.executedCount / item.totalCount) * 100
                  );
                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.campaignId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {item.executedCount} / {item.totalCount}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="w-24">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(
                                item.executedCount,
                                item.totalCount
                              )}`}
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{progressPercentage}%</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.approvedBy}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(item.approvedAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className="text-gray-700">{getStatusLabel(item.status)}</span>
                        </div>
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
}
