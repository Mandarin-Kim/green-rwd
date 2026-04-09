'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Search, Star, ShoppingCart, Eye, Loader2, TrendingUp, FileText, Plus, X, Sparkles, Tag } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface Report {
  id: string
  slug: string
  title: string
  description: string
  categories: string[]
  therapeuticArea: string
  marketSize: string
  patientPool: string
  tier: string
  priceBasic: number
  pricePro: number
  pricePremium: number
  isGenerated: boolean
}

const categories = ['전체', '종양/항암', '대사질환', '자가면역', '신경질환', '바이오의약품', '디지털헬스', '건기식', '심혈관']

const categoryColors: Record<string, string> = {
  '종양/항암': 'bg-red-50 text-red-700 border border-red-200',
  '대사질환': 'bg-orange-50 text-orange-700 border border-orange-200',
  '자가면역': 'bg-blue-50 text-blue-700 border border-blue-200',
  '신경질환': 'bg-purple-50 text-purple-700 border border-purple-200',
  '바이오의약품': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  '디지털헬스': 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  '건기식': 'bg-green-50 text-green-700 border border-green-200',
  '심혈관': 'bg-rose-50 text-rose-700 border border-rose-200',
}

export default function MarketPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('전체')
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [selectedTier, setSelectedTier] = useState<'BASIC' | 'PRO' | 'PREMIUM'>('BASIC')
  const [customGenerating, setCustomGenerating] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [customProgress, setCustomProgress] = useState(0)
  const [customProgressText, setCustomProgressText] = useState('')
  const router = useRouter()

  const apiParams: Record<string, string | undefined> = {
    search: search || undefined,
    category: category !== '전체' ? category : undefined,
  }

  const { data: reports, loading, error } = useApi<Report[]>('/api/reports', apiParams)

  const items = reports || []

  // 키워드 추가
  const addKeyword = () => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 10) {
      setKeywords([...keywords, trimmed])
      setKeywordInput('')
    }
  }

  const removeKeyword = (idx: number) => {
    setKeywords(keywords.filter((_, i) => i !== idx))
  }

  // 커스텀 보고서 4단계 상태
  interface CustomStepStatus {
    completed: boolean
    loading: boolean
    summary: string | null
    error: string | null
  }
  const [customSteps, setCustomSteps] = useState<Record<number, CustomStepStatus>>({
    1: { completed: false, loading: false, summary: null, error: null },
    2: { completed: false, loading: false, summary: null, error: null },
    3: { completed: false, loading: false, summary: null, error: null },
    4: { completed: false, loading: false, summary: null, error: null },
  })
  const [customSlug, setCustomSlug] = useState<string | null>(null)

  // 커스텀 보고서: 카탈로그+주문 생성 (Step 0)
  const handleCustomCreate = async () => {
    if (keywords.length === 0) {
      setCustomError('최소 1개 이상의 키워드를 입력해주세요')
      return
    }
    setCustomGenerating(true)
    setCustomError(null)
    setCustomProgressText('카탈로그 생성 중...')
    setCustomSteps({
      1: { completed: false, loading: false, summary: null, error: null },
      2: { completed: false, loading: false, summary: null, error: null },
      3: { completed: false, loading: false, summary: null, error: null },
      4: { completed: false, loading: false, summary: null, error: null },
    })

    try {
      const createRes = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, tier: selectedTier }),
      })
      let createData
      try { createData = await createRes.json() } catch {
        throw new Error('서버 응답 오류. 잠시 후 다시 시도해주세요.')
      }
      if (!createRes.ok) throw new Error(createData.error || '카탈로그 생성 실패')

      setCustomSlug(createData.data.catalogSlug)
      setCustomProgressText('카탈로그가 생성되었습니다. 아래 단계를 실행하세요.')
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : '카탈로그 생성 오류')
      setCustomGenerating(false)
    }
  }

  // 커스텀 보고서: 개별 단계 실행
  const handleCustomStep = async (stepNum: number) => {
    if (!customSlug) return
    setCustomError(null)
    setCustomSteps(prev => ({
      ...prev,
      [stepNum]: { ...prev[stepNum], loading: true, error: null },
    }))

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 55000)

      const response = await fetch('/api/reports/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: customSlug, step: stepNum, tier: selectedTier }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      let data
      try { data = await response.json() } catch {
        throw new Error('서버 응답 오류')
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Step ${stepNum} 실패`)
      }

      if (stepNum === 4 && data.data?.status === 'COMPLETED' && data.data?.orderId) {
        setCustomSteps(prev => ({
          ...prev,
          4: { completed: true, loading: false, summary: '보고서 생성 완료!', error: null },
        }))
        setTimeout(() => {
          router.push(`/market/${customSlug}/view?orderId=${data.data.orderId}`)
        }, 1000)
        return
      }

      setCustomSteps(prev => ({
        ...prev,
        [stepNum]: { completed: true, loading: false, summary: data.data?.summary || '완료', error: null },
      }))
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? '시간 초과. 다시 시도해주세요.' : err.message)
        : '알 수 없는 오류'
      setCustomSteps(prev => ({
        ...prev,
        [stepNum]: { ...prev[stepNum], loading: false, error: msg },
      }))
      setCustomError(`Step ${stepNum}: ${msg}`)
    }
  }

  // 커스텀 보고서: 전체 자동 실행
  const handleCustomRunAll = async () => {
    if (!customSlug) {
      await handleCustomCreate()
    }
    // customSlug 갱신을 기다림
    // (state가 비동기라 직접 참조 불가 → useEffect 대신 직접 처리)
  }

  // customSlug가 생기면 자동 실행 시작
  const handleCustomAutoRun = async (theSlug: string) => {
    for (const stepNum of [1, 2, 3, 4]) {
      setCustomSteps(prev => ({
        ...prev,
        [stepNum]: { ...prev[stepNum], loading: true, error: null },
      }))
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 55000)
        const response = await fetch('/api/reports/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: theSlug, step: stepNum, tier: selectedTier }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        let data
        try { data = await response.json() } catch { throw new Error('서버 응답 오류') }
        if (!response.ok || !data.success) throw new Error(data.error || `Step ${stepNum} 실패`)

        if (stepNum === 4 && data.data?.status === 'COMPLETED' && data.data?.orderId) {
          setCustomSteps(prev => ({ ...prev, 4: { completed: true, loading: false, summary: '완료!', error: null } }))
          setTimeout(() => router.push(`/market/${theSlug}/view?orderId=${data.data.orderId}`), 1000)
          return
        }
        setCustomSteps(prev => ({
          ...prev,
          [stepNum]: { completed: true, loading: false, summary: data.data?.summary || '완료', error: null },
        }))
      } catch (err) {
        const msg = err instanceof Error ? (err.name === 'AbortError' ? '시간 초과' : err.message) : '오류'
        setCustomSteps(prev => ({ ...prev, [stepNum]: { ...prev[stepNum], loading: false, error: msg } }))
        setCustomError(`Step ${stepNum}: ${msg}`)
        break
      }
    }
  }

  // 커스텀 보고서: 카탈로그 생성 + 전체 자동 실행
  const handleCustomGenerateAll = async () => {
    if (keywords.length === 0) {
      setCustomError('최소 1개 이상의 키워드를 입력해주세요')
      return
    }
    setCustomGenerating(true)
    setCustomError(null)
    setCustomProgressText('카탈로그 생성 중...')
    setCustomSteps({
      1: { completed: false, loading: false, summary: null, error: null },
      2: { completed: false, loading: false, summary: null, error: null },
      3: { completed: false, loading: false, summary: null, error: null },
      4: { completed: false, loading: false, summary: null, error: null },
    })

    try {
      const createRes = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, tier: selectedTier }),
      })
      let createData
      try { createData = await createRes.json() } catch {
        throw new Error('서버 응답 오류')
      }
      if (!createRes.ok) throw new Error(createData.error || '카탈로그 생성 실패')

      const theSlug = createData.data.catalogSlug
      setCustomSlug(theSlug)
      setCustomProgressText('데이터 수집을 시작합니다...')

      // 자동 4단계 실행
      await handleCustomAutoRun(theSlug)
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : '오류 발생')
      setCustomGenerating(false)
    }
  }

  // Category counts
  const categoryCounts: Record<string, number> = {}
  items.forEach(r => {
    (r.categories || []).forEach(c => {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1
    })
  })

  return (
    <div className="p-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <span className="text-blue-200 text-sm font-medium">AI-Powered Market Intelligence</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">AI 시장보고서</h1>
        <p className="text-blue-200 mb-6">
          RWD 기반 의약품/건강식품 시장 분석 보고서를 검색하고, AI로 실시간 생성하세요
        </p>
        <div className="flex items-center justify-between">
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-300" />
              <span>{items.length}개 보고서</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-300" />
              <span>글로벌 수준 AI 분석 퀄리티</span>
            </div>
          </div>
          <button
            onClick={() => { setShowCustomModal(true); setCustomError(null); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-900 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            <Plus size={18} />
            새 보고서 만들기
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1">
          <Input placeholder="보고서 제목, 의약품명, 질환 검색..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
        </div>
        <Button>검색</Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
              category === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
            {cat !== '전체' && categoryCounts[cat] ? ` (${categoryCounts[cat]})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(report => (
              <div key={report.id || report.slug} className="h-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <Link href={`/market/${report.slug}`}>
                  <div className="p-5 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(report.categories || []).map((cat: string) => (
                          <span key={cat} className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${categoryColors[cat] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                      {report.isGenerated && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 border border-green-200 text-xs text-green-700">
                          생성완료
                        </span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-2">{report.title}</h3>
                    {report.description && (
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">{report.description}</p>
                    )}
                  </div>
                  <div className="p-5 cursor-pointer">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">시장규모</p>
                        <p className="text-[16px] font-bold text-blue-600">{report.marketSize || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">환자풀</p>
                        <p className="text-[16px] font-bold text-gray-900">{report.patientPool || '-'}</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
                  {/* 가격 정보 */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Basic</span>
                      <span className="text-xs font-bold text-slate-700">₩{((report.priceBasic || 500000) / 10000).toFixed(0)}만</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200" />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-blue-400 uppercase">Pro</span>
                      <span className="text-xs font-bold text-blue-600">₩{((report.pricePro || 1500000) / 10000).toFixed(0)}만</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200" />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-purple-400 uppercase">Premium</span>
                      <span className="text-xs font-bold text-purple-600">₩{((report.pricePremium || 3000000) / 10000).toFixed(0)}만</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/market/${report.slug}`); }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Eye size={13} />상세보기
                    </button>
                    {report.isGenerated ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/market/${report.slug}/view`); }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <FileText size={13} />보고서 보기
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/market/${report.slug}`); }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ShoppingCart size={13} />주문하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-slate-400">검색 결과가 없습니다</p>
              <p className="text-slate-300 text-sm mt-1">다른 검색어나 카테고리를 선택해보세요</p>
            </div>
          )}
        </>
      )}

      {/* ── 커스텀 보고서 생성 모달 ── */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} />
                  <h2 className="text-lg font-bold">새 보고서 만들기</h2>
                </div>
                <button
                  onClick={() => { setShowCustomModal(false); setCustomGenerating(false); }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-blue-100 text-sm">
                질환명, 약품명, 키워드를 입력하면 AI가 시장 분석 보고서를 자동 생성합니다
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* 키워드 입력 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  키워드 입력 <span className="text-slate-400 font-normal">(질환, 약품, 특정 키워드)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                    placeholder="예: 비만, 위고비, GLP-1..."
                    className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={customGenerating}
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!keywordInput.trim() || keywords.length >= 10 || customGenerating}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    추가
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Enter로 추가 (최대 10개)</p>
              </div>

              {/* 키워드 태그 */}
              <div className="flex flex-wrap gap-2 mb-5 min-h-[36px]">
                {keywords.length === 0 && (
                  <p className="text-sm text-slate-300 italic">키워드를 입력해주세요</p>
                )}
                {keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                  >
                    <Tag size={12} />
                    {kw}
                    {!customGenerating && (
                      <button onClick={() => removeKeyword(idx)} className="hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* 티어 선택 */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">보고서 등급</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'BASIC' as const, label: 'Basic', price: '₩50만', color: 'emerald', desc: '핵심 5섹션' },
                    { key: 'PRO' as const, label: 'Pro', price: '₩150만', color: 'blue', desc: '상세 10섹션' },
                    { key: 'PREMIUM' as const, label: 'Premium', price: '₩300만', color: 'purple', desc: '전체 15섹션' },
                  ]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => !customGenerating && setSelectedTier(t.key)}
                      disabled={customGenerating}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        selectedTier === t.key
                          ? t.color === 'emerald' ? 'border-emerald-500 bg-emerald-50'
                            : t.color === 'blue' ? 'border-blue-500 bg-blue-50'
                            : 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`text-xs font-bold uppercase ${
                        selectedTier === t.key
                          ? t.color === 'emerald' ? 'text-emerald-600'
                            : t.color === 'blue' ? 'text-blue-600'
                            : 'text-purple-600'
                          : 'text-slate-400'
                      }`}>{t.label}</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{t.price}</div>
                      <div className="text-xs text-slate-400">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 에러 메시지 */}
              {customError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {customError}
                </div>
              )}

              {/* 4단계 진행 UI (카탈로그 생성 후) */}
              {customSlug && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs text-slate-500 mb-2">{customProgressText}</p>
                  {([
                    { num: 1, label: 'HIRA 건강보험심사평가원', icon: '🏥' },
                    { num: 2, label: 'ClinicalTrials.gov', icon: '🔬' },
                    { num: 3, label: 'PubMed 논문', icon: '📄' },
                    { num: 4, label: 'AI 보고서 생성', icon: '🤖' },
                  ]).map(({ num, label, icon }) => {
                    const s = customSteps[num]
                    const anyLoading = Object.values(customSteps).some(st => st.loading)
                    return (
                      <button
                        key={num}
                        onClick={() => handleCustomStep(num)}
                        disabled={s.loading || (anyLoading && !s.loading)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          s.completed ? 'border-emerald-400 bg-emerald-50' :
                          s.loading ? 'border-blue-400 bg-blue-50' :
                          s.error ? 'border-red-400 bg-red-50' :
                          'border-slate-200 hover:border-slate-300'
                        } ${(anyLoading && !s.loading) ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-xl">
                          {s.loading ? '' : s.completed ? '✅' : s.error ? '❌' : icon}
                        </span>
                        {s.loading && <Loader2 size={20} className="animate-spin text-blue-500" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{label}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {s.loading ? '수집 중...' : s.completed ? s.summary : s.error || '클릭하여 실행'}
                          </div>
                        </div>
                        {s.completed && <span className="text-xs text-emerald-600 font-bold">완료</span>}
                      </button>
                    )
                  })}
                  {/* 진행 바 */}
                  <div className="pt-2">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(Object.values(customSteps).filter(s => s.completed).length / 4) * 100}%` }}
                      />
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-1">
                      {Object.values(customSteps).filter(s => s.completed).length}/4 단계 완료
                    </p>
                  </div>
                </div>
              )}

              {/* 생성 버튼 */}
              {!customSlug ? (
                <button
                  onClick={handleCustomGenerateAll}
                  disabled={keywords.length === 0 || customGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                >
                  {customGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      카탈로그 생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      보고서 생성하기 (자동 4단계)
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleCustomAutoRun(customSlug)}
                  disabled={Object.values(customSteps).some(s => s.loading)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-200"
                >
                  {Object.values(customSteps).some(s => s.loading) ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      진행 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      전체 자동 실행 (1→2→3→4)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
