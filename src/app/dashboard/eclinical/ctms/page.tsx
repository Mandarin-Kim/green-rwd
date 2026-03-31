'use client';

import { useState, useEffect } from 'react';
import { Search, X, AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';

interface CTMSSite {
  id: string;
  siteName: string;
  piName: string;
  enrolled: number;
  target: number;
  status: 'active' | 'inactive' | 'completed';
}

export default function CTMSPage() {
  const [data, setData] = useState<CTMSSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/eclinical/ctms');
        if (!response.ok) throw new Error('Failed to fetch CTMS data');
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
      item.siteName.toLowerCase().includes(search.toLowerCase()) ||
      item.piName.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'inactive') return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">CTMS (ìììíê´ë¦¬ìì¤í)</h1>
        <p className="text-gray-600 mt-2">ìììí ì¬ì´í¸ íí©</p>
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
              placeholder="ì¬ì´í¸ëª ëë PI ê²ì..."
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
                    ì¬ì´í¸ëª
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    PIëª
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ë±ë¡ì/ëª©í
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    ìí
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.siteName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.piName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.enrolled} / {item.target}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-gray-700 capitalize">{item.status}</span>
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
}
