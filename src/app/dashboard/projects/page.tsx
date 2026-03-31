'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface Project {
  id: string
  name: string
  sponsor: string
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4'
  status: 'ì§íì¤' | 'ì¤ë¹ì¤' | 'ìë£' | 'ì¤ë¨'
  startDate: string
  endDate?: string
  description?: string
  principalInvestigator?: string
  sites?: number
  subjects?: number
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/projects')
        setProjects(data || [])
        setFilteredProjects(data || [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
        setError('íë¡ì í¸ ë°ì´í°ë¥¼ ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.')
        // Fallback data
        const fallbackData: Project[] = [
          {
            id: '1',
            name: 'ë¹ë¨ë³ ì ì½ ìììí',
            sponsor: 'Pharma Corp',
            phase: 'Phase 3',
            status: 'ì§íì¤',
            startDate: '2026-01-15',
            endDate: '2026-12-31',
            sites: 15,
            subjects: 300,
          },
          {
            id: '2',
            name: 'ê³ íì ì¹ë£ì  ì°êµ¬',
            sponsor: 'MediLab Inc',
            phase: 'Phase 2',
            status: 'ì§íì¤',
            startDate: '2026-02-01',
            sites: 8,
            subjects: 150,
          },
        ]
        setProjects(fallbackData)
        setFilteredProjects(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  useEffect(() => {
    const filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.sponsor.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredProjects(filtered)
  }, [searchTerm, projects])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ì§íì¤':
        return 'bg-blue-100 text-blue-800'
      case 'ì¤ë¹ì¤':
        return 'bg-yellow-100 text-yellow-800'
      case 'ìë£':
        return 'bg-green-100 text-green-800'
      case 'ì¤ë¨':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Phase 1':
        return 'bg-purple-100 text-purple-800'
      case 'Phase 2':
        return 'bg-indigo-100 text-indigo-800'
      case 'Phase 3':
        return 'bg-blue-100 text-blue-800'
      case 'Phase 4':
        return 'bg-cyan-100 text-cyan-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ìììí íë¡ì í¸</h1>
        <p className="text-gray-600 mt-2">ì§íì¤ì¸ ìììí íë¡ì í¸ ëª©ë¡</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">ì¤ë¥</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="íë¡ì í¸ëª, ì¤í°ìë¡ ê²ì..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">íë¡ì í¸ê° ììµëë¤.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">íë¡ì í¸ëª</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ì¤í°ì</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ìì¡ë¨ê³</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ìí</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ììì¼</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ë±ë¡ì</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{project.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{project.sponsor}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPhaseColor(project.phase)}`}>
                        {project.phase}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{project.startDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{project.subjects || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredProjects.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            ì ì²´ {filteredProjects.length}ê±´
          </div>
        )}
      </div>
    </div>
  )
}
