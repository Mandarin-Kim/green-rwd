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

  // 커스텀 보고서 생성 (비동기: 주문생성 → 생성트리거 + 폴링)
  const handleCustomGenerate = async () => {
    if (keywords.length === 0) {
      setCustomError('최소 1개 이상의 키워드를 입력해주세요')
      return
    }
    setCustomGenerating(true)
    setCustomError(null)
    setCustomProgress(0)
    setCustomProgressText('주문 생성 중...')

    try {
      // Step 1: 주문 생성 (즉시 반환, 1~2초)
      const createRes = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, tier: selectedTier }),
      })
      let createData
      try {
        createData = await createRes.json()
      } catch {
        throw new Error('서버 응답 오류. 잠시 후 다시 시도해주세요.')
      }
      if (!createRes.ok) throw new Error(createData.error || '주문 생성 실패')

      const { orderId, catalogId, catalogSlug } = createData.data
      setCustomProgress(5)
      setCustomProgressText('데이터 수집 및 AI 분석 시작...')

      // Step 2: 생성 트리거 (별도 호출, 최대 5분) + 폴링 동시 실행
      let generationDone = false
      let pollTimer: ReturnType<typeof setInterval> | null = null

      // 폴링: 3초마다 진행률 확인
      const startPolling = () => {
        pollTimer = setInterval(async () => {
          try {
            const pollRes = await fetch(`/api/reports/generate?orderId=${orderId}`)
            const pollData = await pollRes.json()
            if (pollData.success && pollData.data) {
              const { status, progress } = pollData.data
              setCustomProgress(Math.max(5, progress))

              if (progress < 30) setCustomProgressText('HIRA/PubMed 데이터 수집 중...')
              else if (progress < 70) setCustomProgressText('AI가 보고서를 작성하고 있습니다...')
              else if (progress < 100) setCustomProgressText('최종 검토 및 참고문헌 정리 중...')

              if (status === 'COMPLETED') {
                generationDone = true
                if (pollTimer) clearInterval(pollTimer)
                setCustomProgress(100)
                setCustomProgressText('완료! 보고서로 이동합니다...')
                setTimeout(() => {
                  router.push(`/market/${catalogSlug}/view?orderId=${orderId}`)
                }, 800)
              } else if (status === 'FAILED') {
                generationDone = true
                if (pollTimer) clearInterval(pollTimer)
                setCustomError(pollData.data.errorMessage || '보고서 생성에 실패했습니다')
                setCustomGenerating(false)
              }
            }
          } catch {
            // 폴링 실패는 무시 (네트워크 일시 오류 등)
          }
        }, 3000)
      }

      startPolling()

      // 생성 요청 (최대 5분 대기)
      try {
        const genController = new AbortController()
        const genTimeout = setTimeout(() => genController.abort(), 5 * 60 * 1000)

        const genRes = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catalogId, tier: selectedTier, orderId }),
          signal: genController.signal,
        })
        clearTimeout(genTimeout)

        let genData
        try {
          genData = await genRes.json()
        } catch {
          // 504 등 비-JSON 응답 → 폴링에서 상태 확인
          console.warn('Generate response was not JSON, relying on polling')
          return
        }

        if (genData.success && !generationDone) {
          if (pollTimer) clearInterval(pollTimer)
          setCustomProgress(100)
          setCustomProgressText('완료! 보고서로 이동합니다...')
          setTimeout(() => {
            router.push(`/market/${catalogSlug}/view?orderId=${genData.data?.orderId || orderId}`)
          }, 800)
        } else if (!genData.success && !generationDone) {
          if (pollTimer) clearInterval(pollTimer)
          setCustomError(genData.error || '보고서 생성 실패')
          setCustomGenerating(false)
        }
      } catch (genErr) {
        // AbortError (타임아웃) 또는 네트워크 에러
        // 폴링이 계속 돌고 있으므로, 폴링에서 최종 상태를 확인
        if (!generationDone) {
          // 10초 더 기다려본 후 폴링 결과 확인
          await new Promise(r => setTimeout(r, 10000))
          if (!generationDone) {
            if (pollTimer) clearInterval(pollTimer)
            setCustomError('보고서 생성 시간이 초과되었습니다. 잠시 후 마켓에서 확인해주세요.')
            setCustomGenerating(false)
          }
        }
      }
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : '보고서 생성 중 오류 발생')
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
              <span>IQVIA/GlobalData 수준 퀄리티</span>
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

              {/* 진행률 표시 */}
              {customGenerating && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">{customProgressText}</span>
                    <span className="text-sm font-bold text-blue-600">{customProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${customProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    HIRA 데이터 + ClinicalTrials.gov + PubMed 논문 검색 + AI 분석 (최대 5분)
                  </p>
                </div>
              )}

              {/* 생성 버튼 */}
              <button
                onClick={handleCustomGenerate}
                disabled={keywords.length === 0 || customGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
              >
                {customGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    AI가 보고서를 생성하고 있습니다...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    보고서 생성하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
