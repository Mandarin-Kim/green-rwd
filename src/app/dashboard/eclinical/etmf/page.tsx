'use client'

import { useEffect, useState } from 'react'
import {
  Files,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'

interface ETMFDocument {
  id: string
  name: string
  zone: string
  uploader: string
  date: string
  size: string
}

export default function ETMFPage() {
  const [documents, setDocuments] = useState<ETMFDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetch('/api/eclinical/etmf')
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data.documents || [])
        setLoading(false)
      })
      .catch(() => {
        setDocuments([
          { id: '1', name: 'Protocol v2.0', zone: 'Zone 01', uploader: 'Admin', date: '2026-01-15', size: '2.4MB' },
          { id: '2', name: 'IB v3.1', zone: 'Zone 02', uploader: 'Admin', date: '2026-02-01', size: '5.1MB' },
        ])
        setLoading(false)
      })
  }, [])

  const filtered = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">eTMF Documents</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploader</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.zone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.uploader}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.size}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-green-600 hover:text-green-800">
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">No documents found.</div>
        )}
      </div>
    </div>
  )
}
