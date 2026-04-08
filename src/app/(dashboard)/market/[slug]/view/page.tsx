'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Download, Printer, ChevronRight, FileText,
  BarChart3, Table2, Users, FlaskConical, ArrowRight,
  TrendingUp, MapPin, Calendar, X, Clock, GitBranch, Check, Edit3, AlertCircle, RefreshCw, Loader2
} from 'lucide-react'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  marketSizeRaw?: number | null
  patientPool: string
  patientPoolRaw?: number | null
  generatedAt: string
  tier: string
  priceBasic?: number
  pricePro?: number
  pricePremium?: number
  sections: Section[]
}

interface ParsedTable {
  headers: string[]
  rows: string[][]
}

interface ChartCandidate {
  title: string
  type: 'bar' | 'horizontalBar' | 'donut' | 'progress'
  data: { label: string; value: number; color: string }[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Color Palette (모던 2030 감성)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8',
  '#4f46e5', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
  '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16',
]

const GRADIENT_PAIRS = [
  ['#6366f1', '#8b5cf6'],
  ['#06b6d4', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#ec4899', '#f43f5e'],
  ['#10b981', '#22c55e'],
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Markdown Table Parser
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function parseMarkdownTables(content: string): { tables: ParsedTable[], positions: { start: number, end: number }[] } {
  const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g
  const tables: ParsedTable[] = []
  const positions: { start: number, end: number }[] = []
  let match

  while ((match = tableRegex.exec(content)) !== null) {
    const headerLine = match[1]
    const bodyLines = match[2].trim().split('\n')

    const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean)
    const rows = bodyLines.map(line =>
      line.split('|').map(c => c.trim()).filter(Boolean)
    )

    tables.push({ headers, rows })
    positions.push({ start: match.index, end: match.index + match[0].length })
  }

  return { tables, positions }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Table → Chart Candidate 변환
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function extractNumber(str: string): number | null {
  const cleaned = str.replace(/,/g, '').replace(/명|원|%|건|억|만|조|개/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function tableToChart(table: ParsedTable, index: number): ChartCandidate | null {
  if (table.rows.length < 2 || table.headers.length < 2) return null

  // 숫자 데이터가 있는 컬럼 찾기
  let numColIdx = -1
  for (let c = 1; c < table.headers.length; c++) {
    const hasNumbers = table.rows.filter(r => r[c] && extractNumber(r[c]) !== null).length
    if (hasNumbers >= table.rows.length * 0.5) {
      numColIdx = c
      break
    }
  }
  if (numColIdx === -1) return null

  const data = table.rows
    .map((row, i) => ({
      label: row[0] || '',
      value: extractNumber(row[numColIdx]) || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .filter(d => d.label && d.value > 0)

  if (data.length < 2) return null

  // 차트 타입 결정
  const total = data.reduce((s, d) => s + d.value, 0)
  const isPercentLike = data.every(d => d.value <= 100) && total > 50 && total <= 120
  const isSmallSet = data.length <= 6

  let type: ChartCandidate['type'] = 'bar'
  if (isPercentLike && isSmallSet) type = 'donut'
  else if (data.length <= 8) type = 'horizontalBar'
  else type = 'bar'

  // 제목 추정 (헤더에서)
  const title = `${table.headers[0]} - ${table.headers[numColIdx]}`

  return { title, type, data }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Chart Components (모던 2030 스타일)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ModernBarChart({ chart }: { chart: ChartCandidate }) {
  const maxVal = Math.max(...chart.data.map(d => d.value))
  return (
    <div className="my-6 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100">
      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-500" />
        {chart.title}
      </h4>
      <div className="space-y-3">
        {chart.data.map((item, idx) => (
          <div key={idx} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
              <span className="text-xs font-bold text-slate-800">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-7 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-700 ease-out group-hover:opacity-90"
                style={{
                  width: `${Math.max((item.value / maxVal) * 100, 3)}%`,
                  background: `linear-gradient(135deg, ${GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length][0]}, ${GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length][1]})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModernHorizontalBarChart({ chart }: { chart: ChartCandidate }) {
  const maxVal = Math.max(...chart.data.map(d => d.value))
  return (
    <div className="my-6 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100">
      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-500" />
        {chart.title}
      </h4>
      <div className="space-y-2.5">
        {chart.data.map((item, idx) => {
          const pct = Math.max((item.value / maxVal) * 100, 4)
          return (
            <div key={idx} className="flex items-center gap-3 group">
              <span className="text-xs text-slate-500 w-20 truncate text-right shrink-0">{item.label}</span>
              <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                  }}
                >
                  {pct > 20 && (
                    <span className="text-[10px] font-bold text-white/90">{item.value.toLocaleString()}</span>
                  )}
                </div>
              </div>
              {pct <= 20 && (
                <span className="text-[10px] font-semibold text-slate-500">{item.value.toLocaleString()}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ModernDonutChart({ chart }: { chart: ChartCandidate }) {
  const total = chart.data.reduce((s, d) => s + d.value, 0)
  let cumPct = 0
  const arcs = chart.data.map((item, idx) => {
    const pct = (item.value / total) * 100
    const start = cumPct
    cumPct += pct
    return { ...item, pct, start, end: cumPct }
  })
  const gradientStops = arcs.map(a => `${a.color} ${a.start}% ${a.end}%`).join(', ')

  return (
    <div className="my-6 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100">
      <h4 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
        {chart.title}
      </h4>
      <div className="flex items-center gap-8">
        <div className="relative shrink-0">
          <div
            className="w-36 h-36 rounded-full shadow-lg"
            style={{ background: `conic-gradient(${gradientStops})` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white shadow-inner flex items-center justify-center">
              <span className="text-lg font-bold text-slate-800">{total > 100 ? total.toLocaleString() : `${Math.round(total)}%`}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {arcs.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-600 flex-1">{item.label}</span>
              <span className="text-xs font-bold text-slate-800">{item.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChartRenderer({ chart }: { chart: ChartCandidate }) {
  switch (chart.type) {
    case 'donut': return <ModernDonutChart chart={chart} />
    case 'horizontalBar': return <ModernHorizontalBarChart chart={chart} />
    case 'bar': return <ModernBarChart chart={chart} />
    default: return <ModernBarChart chart={chart} />
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Modern Table Renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ModernTable({ table }: { table: ParsedTable }) {
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
            {table.headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 text-slate-700 ${j === 0 ? 'font-medium' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Content Renderer (테이블→차트 자동변환 포함)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SectionContent({ content }: { content: string }) {
  const { segments, tables, charts } = useMemo(() => {
    const { tables: parsedTables, positions } = parseMarkdownTables(content)
    const charts: ChartCandidate[] = []
    const tableList: ParsedTable[] = parsedTables

    parsedTables.forEach((t, i) => {
      const chart = tableToChart(t, i)
      if (chart) charts.push(chart)
    })

    // content를 테이블 기준으로 분할
    const segments: { type: 'text' | 'table', content: string, tableIdx?: number }[] = []
    let lastEnd = 0

    positions.forEach((pos, idx) => {
      if (pos.start > lastEnd) {
        segments.push({ type: 'text', content: content.slice(lastEnd, pos.start) })
      }
      segments.push({ type: 'table', content: '', tableIdx: idx })
      lastEnd = pos.end
    })

    if (lastEnd < content.length) {
      segments.push({ type: 'text', content: content.slice(lastEnd) })
    }

    if (positions.length === 0) {
      segments.push({ type: 'text', content })
    }

    return { segments, tables: tableList, charts }
  }, [content])

  const renderText = (text: string) => {
    let html = text
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-6 mb-2 text-slate-800">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-7 mb-3 text-slate-900">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-8 mb-3 text-slate-900">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-slate-700">$1</em>')
      // 마크다운 링크 [text](url) → 클릭 가능한 링크
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">$1</a>')
      // DOI 링크: DOI: 10.xxxx → 클릭 가능
      .replace(/DOI:\s*(10\.\S+)/g, '<a href="https://doi.org/$1" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 text-xs">DOI: $1</a>')
      // PMID 링크: PMID: 12345678 → 클릭 가능
      .replace(/PMID:\s*(\d+)/g, '<a href="https://pubmed.ncbi.nlm.nih.gov/$1/" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 text-xs">PMID: $1</a>')
      // 인라인 인용 [1], [2] 등 → 상첨자 스타일
      .replace(/\[(\d{1,2})\]/g, '<sup class="text-indigo-600 font-semibold cursor-default text-xs">[$1]</sup>')
      .replace(/^- (.+)$/gm, '<li class="ml-5 mb-1.5 text-slate-700 text-sm leading-relaxed list-disc">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 mb-1.5 text-slate-700 text-sm leading-relaxed list-decimal">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-3 text-slate-700 text-sm leading-relaxed">')
      .replace(/\n/g, '<br/>')

    return `<p class="mb-3 text-slate-700 text-sm leading-relaxed">${html}</p>`
  }

  // 차트와 테이블의 매핑 (tableIdx → chartIdx)
  const tableToChartMap = useMemo(() => {
    const map: Record<number, number> = {}
    let chartIdx = 0
    tables.forEach((t, tIdx) => {
      const chart = tableToChart(t, tIdx)
      if (chart) {
        map[tIdx] = chartIdx
        chartIdx++
      }
    })
    return map
  }, [tables])

  return (
    <div>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <div key={idx} dangerouslySetInnerHTML={{ __html: renderText(seg.content) }} />
        }

        const tIdx = seg.tableIdx!
        const chartIdx = tableToChartMap[tIdx]

        return (
          <div key={idx}>
            <ModernTable table={tables[tIdx]} />
            {chartIdx !== undefined && <ChartRenderer chart={charts[chartIdx]} />}
          </div>
        )
      })}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cohort / Segment Modal (중복방지 + 버저닝)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface VersionRecord {
  id: string
  version: number
  filterJson: Record<string, unknown>
  patientCount: number
  changeNote: string | null
  createdAt: string
}

interface ExistingSegment {
  id: string
  name: string
  filterJson: Record<string, unknown>
  patientCount: number
  currentVersion: number
  versions: VersionRecord[]
  duplicate: boolean
  message?: string
}

function CohortSegmentModal({
  report,
  onClose,
}: {
  report: ReportData
  onClose: () => void
}) {
  const router = useRouter()
  // 모드: 'create' (신규), 'existing' (이미 있음), 'edit' (기존 수정)
  const [mode, setMode] = useState<'loading' | 'create' | 'existing' | 'edit'>('loading')
  const [existingSegment, setExistingSegment] = useState<ExistingSegment | null>(null)
  const [filters, setFilters] = useState([
    { field: 'diagnosisCode', operator: 'in', value: report.indication || '' },
    { field: 'drugCode', operator: 'in', value: report.drugName || '' },
  ])
  const [segmentName, setSegmentName] = useState(`${report.indication || report.title} 코호트`)
  const [changeNote, setChangeNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  const addFilter = () => setFilters(prev => [...prev, { field: '', operator: 'equals', value: '' }])
  const removeFilter = (i: number) => setFilters(prev => prev.filter((_, idx) => idx !== i))

  const fieldOptions = [
    { value: 'ageGroup', label: '연령대' },
    { value: 'gender', label: '성별' },
    { value: 'region', label: '지역' },
    { value: 'diagnosisCode', label: '진단코드 (ICD-10)' },
    { value: 'drugCode', label: '약물코드 (ATC)' },
  ]

  const operatorOptions = [
    { value: 'equals', label: '=' },
    { value: 'in', label: '포함' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'between', label: '범위' },
  ]

  // 모달 열릴 때 기존 세그먼트 체크
  useEffect(() => {
    checkExisting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkExisting = async () => {
    try {
      const sourceMonth = new Date().toISOString().slice(0, 7)
      const conditions: Record<string, unknown> = {}
      filters.filter(f => f.field && f.value).forEach(f => {
        conditions[f.field] = { operator: f.operator, value: f.value }
      })

      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentName.trim(),
          conditions,
          catalogSlug: report.slug,
          sourceMonth,
        }),
      })
      const data = await res.json()
      if (data.success && data.data?.duplicate) {
        // 이미 존재
        setExistingSegment(data.data)
        setMode('existing')
        // 기존 세그먼트의 필터로 복원
        const fj = data.data.filterJson as Record<string, { operator: string; value: string }>
        const restored = Object.entries(fj).map(([field, cond]) => ({
          field,
          operator: cond.operator || 'in',
          value: cond.value || '',
        }))
        if (restored.length > 0) setFilters(restored)
        setSegmentName(data.data.name)
      } else if (data.success) {
        // 새로 생성됨
        setStatusMsg('세그먼트가 생성되었습니다!')
        setMode('create')
        // 이미 생성된 상태이므로 바로 완료 표시
        setTimeout(() => router.push('/segments'), 1200)
      } else {
        setMode('create')
      }
    } catch {
      setMode('create')
    }
  }

  // 기존 세그먼트 수정 → 새 버전 생성
  const handleUpdateSegment = async () => {
    if (!existingSegment) return
    const validFilters = filters.filter(f => f.field && f.value)
    if (validFilters.length === 0) { setStatusMsg('필터 조건을 1개 이상 입력하세요.'); return }

    setSubmitting(true)
    setStatusMsg('')
    try {
      const conditions: Record<string, unknown> = {}
      validFilters.forEach(f => {
        conditions[f.field] = { operator: f.operator, value: f.value }
      })

      const res = await fetch(`/api/segments/${existingSegment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentName.trim(),
          conditions,
          changeNote: changeNote.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStatusMsg(`v${data.data.currentVersion} 버전이 생성되었습니다!`)
        setTimeout(() => router.push('/segments'), 1200)
      } else {
        setStatusMsg(data.error || '수정에 실패했습니다.')
      }
    } catch {
      setStatusMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 새 세그먼트 생성 (중복이 아닐 때 직접 생성)
  const handleCreateNew = async () => {
    const validFilters = filters.filter(f => f.field && f.value)
    if (validFilters.length === 0) { setStatusMsg('필터 조건을 1개 이상 입력하세요.'); return }

    setSubmitting(true)
    setStatusMsg('')
    try {
      const conditions: Record<string, unknown> = {}
      validFilters.forEach(f => {
        conditions[f.field] = { operator: f.operator, value: f.value }
      })

      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentName.trim(),
          conditions,
          catalogSlug: report.slug,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStatusMsg('세그먼트가 생성되었습니다!')
        setTimeout(() => router.push('/segments'), 1200)
      } else {
        setStatusMsg(data.error || '생성에 실패했습니다.')
      }
    } catch {
      setStatusMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 로딩 상태
  if (mode === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">세그먼트 확인 중...</p>
        </div>
      </div>
    )
  }

  // 이미 생성됨 (create에서 성공 시)
  if (mode === 'create' && statusMsg) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-800">{statusMsg}</p>
          <p className="text-xs text-slate-500 mt-1">세그먼트 목록으로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === 'existing' ? '기존 세그먼트 발견' : mode === 'edit' ? '세그먼트 수정 (새 버전)' : '코호트 세그먼트 설정'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'existing'
                ? `이번 달 동일 보고서에서 이미 생성된 세그먼트 (v${existingSegment?.currentVersion})`
                : mode === 'edit'
                ? '필터를 수정하면 새로운 버전이 생성됩니다'
                : '보고서 데이터 기반 자동 설정됨'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Existing Segment Info Banner */}
        {mode === 'existing' && existingSegment && (
          <div className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">이번 달 이미 생성된 세그먼트</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  동일 보고서에 대해 월 1개만 생성 가능합니다. 필터를 수정하면 새 버전(v{existingSegment.currentVersion + 1})이 생성됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Segment Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">세그먼트 이름</label>
            <input
              type="text"
              value={segmentName}
              onChange={e => setSegmentName(e.target.value)}
              disabled={mode === 'existing'}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {/* Version Info (existing / edit mode) */}
          {(mode === 'existing' || mode === 'edit') && existingSegment && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700">v{existingSegment.currentVersion}</span>
              </div>
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                버전 이력 {showVersionHistory ? '닫기' : '보기'}
              </button>
            </div>
          )}

          {/* Version History */}
          {showVersionHistory && existingSegment?.versions && existingSegment.versions.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
              {existingSegment.versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">v{v.version}</span>
                    <span className="text-xs text-slate-600">{v.changeNote || '필터 수정'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(v.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">필터 조건</label>
              {mode !== 'existing' && (
                <button onClick={addFilter} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  + 조건 추가
                </button>
              )}
            </div>
            <div className="space-y-2">
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                  <select
                    value={f.field}
                    onChange={e => { const next = [...filters]; next[i].field = e.target.value; setFilters(next) }}
                    disabled={mode === 'existing'}
                    className="text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white min-w-[100px] disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">필드 선택</option>
                    {fieldOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={f.operator}
                    onChange={e => { const next = [...filters]; next[i].operator = e.target.value; setFilters(next) }}
                    disabled={mode === 'existing'}
                    className="text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white w-16 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {operatorOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => { const next = [...filters]; next[i].value = e.target.value; setFilters(next) }}
                    placeholder="값 입력..."
                    disabled={mode === 'existing'}
                    className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {filters.length > 1 && mode !== 'existing' && (
                    <button onClick={() => removeFilter(i)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Change Note (edit mode) */}
          {mode === 'edit' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">변경 사유 (선택)</label>
              <input
                type="text"
                value={changeNote}
                onChange={e => setChangeNote(e.target.value)}
                placeholder="예: 연령대 범위 확대, 약물코드 추가..."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
              />
            </div>
          )}

          {/* Preview summary */}
          <div className="p-4 bg-indigo-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-900">
                예상 대상자: {report.patientPoolRaw ? report.patientPoolRaw.toLocaleString() : report.patientPool}명
              </span>
            </div>
            <p className="text-xs text-indigo-600">
              {report.indication} 관련 {report.drugName} 처방 대상 환자군
            </p>
          </div>

          {/* Status message */}
          {statusMsg && (
            <p className={`text-xs font-medium text-center ${statusMsg.includes('실패') || statusMsg.includes('오류') ? 'text-red-500' : 'text-emerald-600'}`}>
              {statusMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            닫기
          </button>

          {mode === 'existing' && (
            <button
              onClick={() => setMode('edit')}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              수정하여 새 버전 생성
            </button>
          )}

          {mode === 'edit' && (
            <button
              onClick={handleUpdateSegment}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {submitting ? '저장 중...' : `v${(existingSegment?.currentVersion || 1) + 1} 버전 생성`}
            </button>
          )}

          {mode === 'create' && (
            <button
              onClick={handleCreateNew}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {submitting ? '생성 중...' : '세그먼트 생성'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Page Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function ReportViewPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>('')
  const [showCohortModal, setShowCohortModal] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenProgress, setRegenProgress] = useState('')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (params.slug) fetchReport(params.slug as string)
  }, [params.slug])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY + 140
      let current = ''
      Object.entries(sectionRefs.current).forEach(([id, el]) => {
        if (el && el.offsetTop <= scrollTop) current = id
      })
      if (current && current !== activeSection) setActiveSection(current)
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
        if (data.data.sections.length > 0) setActiveSection(data.data.sections[0].id)
      } else {
        setError('보고서 데이터를 불러올 수 없습니다')
      }
    } catch {
      setError('보고서 로딩 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 보고서 재생성 (PubMed 논문 인용 포함)
  const handleRegenerate = async (tier: 'BASIC' | 'PRO' | 'PREMIUM') => {
    if (regenerating) return
    const confirmed = window.confirm(
      `${tier} 등급으로 보고서를 새로 생성합니다.\n(PubMed 논문 인용이 포함됩니다)\n\n진행하시겠습니까?`
    )
    if (!confirmed) return

    try {
      setRegenerating(true)
      setRegenProgress('보고서 생성 요청 중...')
      const slug = params.slug as string
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, tier, forceRegenerate: true }),
      })

      // 서버 타임아웃 등으로 JSON이 아닌 응답이 올 수 있음
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
      }

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error('서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.')
      }
      if (!response.ok) throw new Error(data.error || '보고서 생성 실패')

      if (data.success && data.data?.orderId) {
        if (data.data.status === 'COMPLETED') {
          setRegenProgress('생성 완료! 페이지를 새로고침합니다...')
          window.location.href = `/market/${slug}/view?orderId=${data.data.orderId}`
          return
        }
        // 폴링
        setRegenProgress('AI가 보고서를 생성하고 있습니다...')
        const maxAttempts = 30
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, 2000))
          try {
            const res = await fetch(`/api/reports/generate?orderId=${data.data.orderId}`)
            const pollContentType = res.headers.get('content-type') || ''
            if (!pollContentType.includes('application/json')) continue
            let pollData
            try { pollData = await res.json() } catch { continue }
            if (pollData.data?.status === 'COMPLETED') {
              setRegenProgress('생성 완료! 페이지를 새로고침합니다...')
              window.location.href = `/market/${slug}/view?orderId=${pollData.data.orderId}`
              return
            }
            if (pollData.data?.status === 'FAILED') {
              throw new Error(pollData.data.errorMessage || '보고서 생성 실패')
            }
            setRegenProgress(`AI가 보고서를 생성하고 있습니다... (${i + 1}/${maxAttempts})`)
          } catch (pollErr) {
            if (pollErr instanceof Error && pollErr.message.includes('실패')) throw pollErr
          }
        }
        throw new Error('보고서 생성 시간 초과. 잠시 후 다시 시도해주세요.')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '보고서 생성 중 오류 발생')
    } finally {
      setRegenerating(false)
      setRegenProgress('')
    }
  }

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
    }
  }

  // 코호트 수 계산 (patientPool 기반)
  const cohortSize = useMemo(() => {
    if (!report) return 0
    if (report.patientPoolRaw) return report.patientPoolRaw
    const match = report.patientPool?.match(/([\d,.]+)/)
    return match ? parseInt(match[1].replace(/,/g, '')) : 0
  }, [report])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-slate-500">보고서를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border max-w-sm">
          <p className="text-red-500 mb-4 text-sm">{error || '보고서를 찾을 수 없습니다'}</p>
          <button onClick={() => router.back()} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  const tierLabel: Record<string, string> = { BASIC: 'Basic', PRO: 'Professional', PREMIUM: 'Premium' }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 print:static">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl print:hidden transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 line-clamp-1">{report.title}</h1>
              <p className="text-xs text-slate-400">
                {tierLabel[report.tier] || report.tier} Report
                {report.generatedAt && ` | ${new Date(report.generatedAt).toLocaleDateString('ko-KR')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {/* Regenerate Button */}
            <button
              onClick={() => handleRegenerate(report.tier as 'BASIC' | 'PRO' | 'PREMIUM' || 'BASIC')}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-50"
              title="PubMed 논문 인용이 포함된 새 보고서를 생성합니다"
            >
              {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {regenerating ? '생성 중...' : '새로 생성'}
            </button>
            {/* Cohort Button (상단 고정) */}
            <button
              onClick={() => setShowCohortModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md shadow-indigo-200"
            >
              <FlaskConical className="w-4 h-4" />
              코호트 {cohortSize > 0 ? cohortSize.toLocaleString() + '명' : '설정'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const slug = report.slug || params?.slug;
                if (slug) {
                  window.open(`/api/reports/export-csv?slug=${slug}&type=all`, '_blank');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors"
              title="Raw 데이터 CSV 다운로드 (HIRA + ClinicalTrials + PubMed)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Regenerating Overlay */}
      {regenerating && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-100" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">보고서 재생성 중</h3>
            <p className="text-sm text-slate-500">{regenProgress}</p>
            <p className="text-xs text-slate-400 mt-3">PubMed 논문 검색 및 AI 분석이 진행됩니다.<br/>약 1~2분 소요됩니다.</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 hidden lg:block print:hidden">
          <div className="sticky top-20">
            {/* Cohort Card */}
            <button
              onClick={() => setShowCohortModal(true)}
              className="w-full p-4 mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white text-left hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 group"
            >
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="w-4 h-4 text-indigo-200" />
                <span className="text-xs text-indigo-200 font-medium">필요 코호트 수</span>
              </div>
              <p className="text-2xl font-bold">{cohortSize > 0 ? cohortSize.toLocaleString() : '-'}
                <span className="text-sm font-normal text-indigo-200 ml-1">명</span>
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-indigo-200 group-hover:text-white transition-colors">
                클릭하여 세그먼트 설정
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* TOC */}
            <h3 className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider mb-2 px-1">목차</h3>
            <nav className="space-y-0.5">
              {report.sections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-400">
                    {idx + 1}
                  </span>
                  <span className="line-clamp-2">{section.title}</span>
                </button>
              ))}
            </nav>

            {/* Pricing */}
            <div className="mt-4 p-3.5 bg-white rounded-xl border border-slate-100">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">보고서 가격</h4>
              <div className="space-y-1.5">
                {[
                  { tier: 'Basic', price: report.priceBasic || 500000, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50', current: report.tier === 'BASIC' },
                  { tier: 'Pro', price: report.pricePro || 1500000, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50', current: report.tier === 'PRO' },
                  { tier: 'Premium', price: report.pricePremium || 3000000, color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50', current: report.tier === 'PREMIUM' },
                ].map(({ tier, price, color, textColor, bgLight, current }) => (
                  <div key={tier} className={`flex items-center justify-between px-2.5 py-2 rounded-lg ${current ? bgLight + ' ring-1 ring-inset ring-slate-200' : 'hover:bg-slate-50'} transition-colors`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      <span className={`text-xs font-semibold ${current ? textColor : 'text-slate-600'}`}>{tier}</span>
                      {current && <span className="text-[9px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded-full">현재</span>}
                    </div>
                    <span className={`text-xs font-bold ${current ? textColor : 'text-slate-500'}`}>₩{(price / 10000).toFixed(0)}만</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Info */}
            <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-100">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">보고서 정보</h4>
              <dl className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-slate-400">시장 규모</dt>
                    <dd className="font-semibold text-slate-700">{report.marketSize}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-slate-400">환자 수</dt>
                    <dd className="font-semibold text-slate-700">{report.patientPool}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-slate-400">치료 영역</dt>
                    <dd className="font-semibold text-slate-700">{report.therapeuticArea}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-slate-400">섹션</dt>
                    <dd className="font-semibold text-slate-700">{report.sections.length}개</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Cover */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white rounded-2xl p-8 mb-6 print:rounded-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs mb-4">
                <span>{report.therapeuticArea}</span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span>{tierLabel[report.tier] || report.tier}</span>
              </div>
              <h1 className="text-2xl font-bold mb-3 leading-tight">{report.title}</h1>
              <p className="text-indigo-200 text-sm mb-6 max-w-xl leading-relaxed">{report.description}</p>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white/10 backdrop-blur rounded-xl">
                  <span className="text-[10px] text-indigo-300 uppercase tracking-wider">시장 규모</span>
                  <p className="text-lg font-bold mt-0.5">{report.marketSize}</p>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur rounded-xl">
                  <span className="text-[10px] text-indigo-300 uppercase tracking-wider">대상 환자</span>
                  <p className="text-lg font-bold mt-0.5">{report.patientPool}</p>
                </div>
                <button
                  onClick={() => setShowCohortModal(true)}
                  className="p-3 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 backdrop-blur rounded-xl text-left hover:from-emerald-500/40 hover:to-teal-500/40 transition-all border border-emerald-400/30 group"
                >
                  <span className="text-[10px] text-emerald-300 uppercase tracking-wider">필요 코호트</span>
                  <p className="text-lg font-bold mt-0.5 flex items-center gap-1">
                    {cohortSize > 0 ? cohortSize.toLocaleString() + '명' : '-'}
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </button>
                <div className="p-3 bg-white/10 backdrop-blur rounded-xl">
                  <span className="text-[10px] text-indigo-300 uppercase tracking-wider">생성일</span>
                  <p className="text-lg font-bold mt-0.5">
                    {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('ko-KR') : '-'}
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
              className="bg-white rounded-2xl border border-slate-100 p-7 mb-4 shadow-sm print:border-none print:shadow-none print:break-before-page"
            >
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-500 font-bold flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                <span>{report.therapeuticArea}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">
                {section.title}
              </h2>
              <SectionContent content={section.content} />
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-300">
                <span>{section.wordCount.toLocaleString()}자</span>
                <span>Green-RWD AI Report Engine</span>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="text-center py-8 text-xs text-slate-400 print:mt-8">
            <p>본 보고서는 AI 기반으로 생성되었습니다. 투자 의사결정 시 추가 검증이 권장됩니다.</p>
            <p className="mt-1">Generated by Green-RWD Platform | {new Date().getFullYear()}</p>
          </div>
        </main>
      </div>

      {/* Cohort Modal */}
      {showCohortModal && (
        <CohortSegmentModal report={report} onClose={() => setShowCohortModal(false)} />
      )}
    </div>
  )
}
