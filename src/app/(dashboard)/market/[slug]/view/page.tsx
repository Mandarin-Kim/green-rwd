'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Printer, ChevronRight, FileText, BarChart3, Table2 } from 'lucide-react'

interface Section {
  id: string
  title: string
  content: string
  wordCount: number
  hasCharts: boolean
  hasTables: boolean
  order: number
}

interface ReportData {
  title: string
  slug: string
  description: string
  therapeuticArea: string
  drugName: string
  indication: string
  marketSize: string
  patientPool: string
  generatedAt: string
  tier: string
  sections: Section[]
}

export default function ReportViewPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>('')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (params.slug) {
      fetchReport(params.slug as string)
    }
  }, [params.slug])

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY + 120
      let current = ''
      Object.entries(sectionRefs.current).forEach(([id, el]) => {
        if (el && el.offsetTop <= scrollTop) {
          current = id
        }
      })
      if (current && current !== activeSection) {
        setActiveSection(current)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeSection])

  const fetchReport = async (slug: string) => {
    try {
      const res = await fetch(`/api/reports/${slug}`)
      const data = await res.json()
      if (data.success && data.data?.sections) {
        setReport(data.data)
        if (data.data.sections.length > 0) {
          setActiveSection(data.data.sections[0].id)
        }
      } else {
        setError('보고서 데이터를 불러올 수 없습니다')
      }
    } catch (err) {
      setError('보고서 로딩 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Render markdown-like content to HTML
  const renderContent = (content: string) => {
    let html = content
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-3 text-gray-900">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-4 text-gray-900 border-b pb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-gray-900">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // List items
      .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1 text-gray-700 list-disc list-inside">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1 text-gray-700 list-decimal list-inside">$1</li>')
      // Tables (basic)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim())
        if (cells.some(c => /^[-:\s]+$/.test(c))) return ''
        const isHeader = cells.every(c => c.trim().length > 0)
        const cellTag = isHeader ? 'td' : 'td'
        return `<tr>${cells.map(c => `<${cellTag} class="border px-3 py-2 text-sm">${c.trim()}</${cellTag}>`).join('')}</tr>`
      })
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 leading-relaxed">')
      // Line breaks
      .replace(/\n/g, '<br/>')

    return `<div class="prose max-w-none"><p class="mb-4 text-gray-700 leading-relaxed">${html}</p></div>`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">보고서를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '보고서를 찾을 수 없습니다'}</p>
          <button onClick={() => router.back()} className="text-blue-600 hover:underline">
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  const tierLabel: Record<string, string> = { BASIC: 'Basic', PRO: 'Professional', PREMIUM: 'Premium' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 print:static">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg print:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 line-clamp-1">{report.title}</h1>
              <p className="text-sm text-gray-500">
                {tierLabel[report.tier] || report.tier} Report
                {report.generatedAt && ` | 생성일: ${new Date(report.generatedAt).toLocaleDateString('ko-KR')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
            >
              <Download className="w-4 h-4" />
              PDF 다운로드
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Left sidebar - TOC */}
        <aside className="w-64 shrink-0 hidden lg:block print:hidden">
          <div className="sticky top-20">
            <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">목차</h3>
            <nav className="space-y-1">
              {report.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="line-clamp-2">{section.title}</span>
                  {section.hasCharts && <BarChart3 className="w-3 h-3 text-green-500 shrink-0" />}
                  {section.hasTables && <Table2 className="w-3 h-3 text-orange-500 shrink-0" />}
                </button>
              ))}
            </nav>

            {/* Report info */}
            <div className="mt-6 p-4 bg-white rounded-lg border">
              <h4 className="font-semibold text-sm mb-2">보고서 정보</h4>
              <dl className="space-y-2 text-xs text-gray-600">
                <div>
                  <dt className="font-medium">치료 영역</dt>
                  <dd>{report.therapeuticArea}</dd>
                </div>
                <div>
                  <dt className="font-medium">약물/치료제</dt>
                  <dd>{report.drugName}</dd>
                </div>
                <div>
                  <dt className="font-medium">적응증</dt>
                  <dd>{report.indication}</dd>
                </div>
                <div>
                  <dt className="font-medium">시장 규모</dt>
                  <dd>{report.marketSize}</dd>
                </div>
                <div>
                  <dt className="font-medium">환자 수</dt>
                  <dd>{report.patientPool}</dd>
                </div>
                <div>
                  <dt className="font-medium">섹션 수</dt>
                  <dd>{report.sections.length}개</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Cover page */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-xl p-8 mb-8 print:rounded-none print:mb-16">
            <div className="max-w-2xl">
              <div className="inline-block px-3 py-1 bg-blue-500/30 rounded-full text-sm mb-4">
                {report.therapeuticArea} | {tierLabel[report.tier] || report.tier}
              </div>
              <h1 className="text-3xl font-bold mb-4">{report.title}</h1>
              <p className="text-blue-200 mb-6">{report.description}</p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-blue-300">시장 규모</span>
                  <p className="text-xl font-bold">{report.marketSize}</p>
                </div>
                <div>
                  <span className="text-blue-300">대상 환자</span>
                  <p className="text-xl font-bold">{report.patientPool}</p>
                </div>
                <div>
                  <span className="text-blue-300">생성일</span>
                  <p className="text-xl font-bold">
                    {report.generatedAt
                      ? new Date(report.generatedAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          {report.sections.map((section, index) => (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el }}
              className="bg-white rounded-xl border p-8 mb-6 print:border-none print:shadow-none print:break-before-page"
            >
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <span>Section {index + 1}</span>
                <ChevronRight className="w-3 h-3" />
                <span>{report.therapeuticArea}</span>
                {section.hasCharts && (
                  <span className="ml-auto flex items-center gap-1 text-green-600">
                    <BarChart3 className="w-3.5 h-3.5" /> 차트 포함
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b">
                {section.title}
              </h2>
              <div
                className="report-content"
                dangerouslySetInnerHTML={{ __html: renderContent(section.content) }}
              />
              <div className="mt-6 pt-4 border-t text-xs text-gray-400">
                {section.wordCount.toLocaleString()}자 | Green-RWD AI Report Engine
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="text-center py-8 text-sm text-gray-400 print:mt-8">
            <p>본 보고서는 AI 기반으로 생성되었습니다. 투자 의사결정 시 추가 검증이 권장됩니다.</p>
            <p className="mt-1">Generated by Green-RWD Platform | {new Date().getFullYear()}</p>
          </div>
        </main>
      </div>
    </div>
  )
}
