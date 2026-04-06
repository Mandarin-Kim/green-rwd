'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { ArrowLeft, FileText, Zap, Crown, Check, Eye, ShoppingCart, CreditCard, Loader2, BarChart3, TrendingUp, Users, Globe } from 'lucide-react'
import Link from 'next/link'
import { useApi, useMutation } from '@/hooks/use-api'
import { useSession } from 'next-auth/react'

interface ReportCatalog {
  id: string
  slug: string
  title: string
  description: string
  categories: string[]
  therapeuticArea: string
  drugName: string
  indication: string
  region: string
  marketSizeKrw: number
  patientPool: number
  priceBasic: number
  pricePro: number
  pricePremium: number
  sampleUrl: string | null
  thumbnailUrl: string | null
}

const tiers = [
  { key: 'BASIC', label: 'Basic', icon: <FileText size={20} />, desc: '시장 개요 + PEST 분석 + 기본 통계', sections: 5 },
  { key: 'PRO', label: 'Pro', icon: <Zap size={20} />, desc: 'Basic + 경쟁사 분석 + Porter 5 Forces + 시나리올', sections: 10 },
  { key: 'PREMIUM', label: 'Premium', icon: <Crown size={20} />, desc: 'Pro + 환자 세그먼트 + RWD 대시보드 + 전뎹 제안', sections: 15 },
]

// 미리보기 샘플 데이터 (실제로는 API에서 가져옴)
const sampleSections = [
  { title: '시장 개요 (Market Overview)', icon: <Globe size={18} />, content: '본 보고서는 해당 의약품/건강식품 시장의 전반적인 개요를 제공합니다. 시장 규모, 성장률, 주요 트렌드 등을 분석합니다.' },
  { title: 'PEST 분석', icon: <BarChart3 size={18} />, content: '정치(Political), 경제(Economic), 사회(Social), 기술(Technological) 요인을 분석하여 시장 환경을 파악합니다.' },
  { title: '경쟁사 분석', icon: <TrendingUp size={18} />, locked: true, content: '주요 경쟁사의 시장 점유율, 전략, 제품 파이프라인을 분석합니다. Pro 이상 티어에서 확인 가능합니다.' },
  { title: '환자 세그먼트', icon: <Users size={18} />, locked: true, content: '환자 인구통계, 질화 실걩도, 치료 패턴 등 세부 환자 세그먼트를 분석합니다. Premium 티어에서 확인 가능합니다.' },
]

export default function ReportDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const initialTab = searchParams.get('tab') || 'preview'
  const [activeTab, setActiveTab] = useState<'preview' | 'order' | 'payment' | 'complete'>(initialTab as any)
  const [selectedTier, setSelectedTier] = useState('PRO')
  const [ordering, setOrdering] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [orderId, setOrderId] = useState<string | null>(null)

  const { data: catalog } = useApi<ReportCatalog>(`/api/reports?slug=${slug}`)
  const { mutate: createOrder } = useMutation('post')
  const { mutate: updateOrder } = useMutation('put')

  const getTierPrice = useCallback((tierKey: string) => {
    if (!catalog) return 0
    if (isAdmin) return 0 // 관리자 0원 테스트
    const map: Record<string, number> = {
      BASIC: catalog.priceBasic || 500000,
      PRO: catalog.pricePro || 1500000,
      PREMIUM: catalog.pricePremium || 3000000,
    }
    return map[tierKey] || 0
  }, [catalog, isAdmin])

  const formatPrice = (price: number) => {
    if (price === 0) return '₩0 (관리자 무료)'
    return `₩${(price / 10000).toFixed(0)}만`
  }

  // 주문하기 클릭
  const handleOrder = async () => {
    setOrdering(true)
    try {
      const catalogId = catalog?.id
      if (!catalogId) {
        alert('보고서 정보를 불러올 수 없습니다.')
        setOrdering(false)
        return
      }
      const result = await createOrder('/api/reports/orders', {
        catalogId,
        tier: selectedTier,
      })
      if (result?.id) {
        setOrderId(result.id)
        setActiveTab('payment')
      }
    } catch (e: any) {
      alert(e?.message || '주문 생성에 실패했습니다.')
    }
    setOrdering(false)
  }

  // 결제 처리 (관리자 0원 즉시 결제)
  const handlePayment = async () => {
    setPaymentProcessing(true)

    // 결제 시뮬레이션 (1.5초)
    await new Promise(r => setTimeout(r, 1500))

    if (!orderId) {
      setPaymentProcessing(false)
      return
    }

    // 결제 완료 → 보고서 생성 시작
    setPaymentProcessing(false)
    setActiveTab('complete')
    setGenerating(true)
    setProgress(0)

    // 보고서 생성 시뮬레이션 (상태 업데이�()
    try {
      await updateOrder(`/api/reports/orders/${orderId}`, {
        status: 'GENERATING',
        progress: 10,
      })
    } catch {}

    // 프로그레스 시뮬레이션
    const steps = [20, 35, 50, 65, 80, 90, 100]
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 800))
      setProgress(step)
      try {
        if (step === 100) {
          await updateOrder(`/api/reports/orders/${orderId}`, {
            status: 'COMPLETED',
            progress: 100,
            generatedUrl: `/reports/generated/${orderId}.pdf`,
          })
        } else {
          await updateOrder(`/api/reports/orders/${orderId}`, {
            progress: step,
          })
        }
      } catch {}
    }

    setGenerating(false)
  }

  return (
    <div className="p-8">
      <Link href="/market" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-4">
        <ArrowLeft size={14} />보고서 목록
      </Link>

      <Header
        title={catalog?.title || String(slug)}
        description={catalog?.description || '보고서 미리보기 및 주문'}
      />

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 mb-8 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'preview' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Eye size={16} />미리보기
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'order' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart size={16} />주문하기
        </button>
      </div>

      {/* ===== 미리보기 탭 ===== */}
      {activeTab === 'preview' && (
        <div>
          {/* 보고서 기본 정보 */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: '질환 영역', value: catalog?.therapeuticArea || catalog?.indication || '-' },
              { label: '시장 규모', value: catalog?.marketSizeKrw ? `₩${(catalog.marketSizeKrw / 100000000).toFixed(0)}억` : '-' },
              { label: '환자 풀', value: catalog?.patientPool ? `${catalog.patientPool.toLocaleString()}명` : '-' },
              { label: '분석 지역', value: catalog?.region || '국내' },
            ].map(info => (
              <Card key={info.label}>
                <p className="text-xs text-slate-500 mb-1">{info.label}</p>
                <p className="text-lg font-bold text-navy">{info.value}</p>
              </Card>
            ))}
          </div>

          {/* 샘플 보고서 섹션 */}
          <Card className="mb-8">
            <h3 className="font-semibold text-[15px] mb-4 flex items-center gap-2">
              <FileText size={18} className="text-primary" />보고서 구성 미리보기
            </h3>
            <div className="space-y-4">
              {sampleSections.map((section, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${section.locked ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">{section.icon}</span>
                      <h4 className="font-medium text-navy text-sm">{section.title}</h4>
                    </div>
                    {section.locked && <Badge variant="warning">잠김</Badge>}
                  </div>
                  <p className={`text-sm ${section.locked ? 'text-slate-400' : 'text-slate-600'}`}>
                    {section.content}
                  </p>
                  {section.locked && (
                    <div className="mt-2 h-8 bg-gradient-to-b from-slate-100 to-white rounded" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* 미리보기 내 주문 CTA */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-navy text-lg mb-1">전체 보고서가 필요하신가요?</h3>
              <p className="text-sm text-slate-600">
                {isAdmin ? '관리자 계정 - 0원으로 테스트 주문이 가능합니다.' : 'Basic ₩50만부터 시작하는 AI 분석 보고서를 받아보세요.'}
              </p>
            </div>
            <Button size="lg" onClick={() => setActiveTab('order')}>
              <ShoppingCart size={16} />주문하기
            </Button>
          </div>
        </div>
      )}

      {/* ===== 주문 탭 ===== */}
      {activeTab === 'order' && (
        <>
          {/* 관리자 0원 테스트 안내 */}
          {isAdmin && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-3">
              <CreditCard size={20} className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">관리자 테스트 모드</p>
                <p className="text-xs text-blue-600">모든 티어가 0원으로 결제됩니다. 결제 완료 시 즉시 보고서가 생성됩니다.</p>
              </div>
            </div>
          )}

          {/* Tier Selection */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {tiers.map(tier => {
              const price = getTierPrice(tier.key)
              return (
                <button
                  key={tier.key}
                  onClick={() => setSelectedTier(tier.key)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    selectedTier === tier.key ? 'border-primary bg-primary/5 shadow-lg' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTier === tier.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {tier.icon}
                    </div>
                    {selectedTier === tier.key && <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"><Check size={14} className="text-white" /></div>}
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-1">{tier.label}</h3>
                  <p className="text-2xl font-bold text-primary mb-3">{formatPrice(price)}</p>
                  <p className="text-sm text-slate-500 mb-3">{tier.desc}</p>
                  <p className="text-xs text-slate-400">{tier.sections}개 섹션 포함</p>
                </button>
              )
            })}
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setActiveTab('preview')} className="text-sm text-slate-500 hover:text-primary flex items-center gap-1">
              <Eye size={14} />미리보기로 돌아가기
            </button>
            <Button size="lg" onClick={handleOrder} loading={ordering}>
              {ordering ? '주문 처리 중...' : `${tiers.find(t => t.key === selectedTier)?.label} 결제하기`}
            </Button>
          </div>
        </>
      )}

      {/* ===== 결제 탭 ===== */}
      {activeTab === 'payment' && (
        <Card className="max-w-lg mx-auto text-center py-12">
          {paymentProcessing ? (
            <>
              <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-navy mb-2">결제 처리 중...</h2>
              <p className="text-slate-500">잠시만 기다려 주세요.</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CreditCard size={36} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-navy mb-2">결제 확인</h2>
              <div className="my-6 p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">보고서</span>
                  <span className="font-medium text-navy">{catalog?.title || slug}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">티어</span>
                  <span className="font-medium text-navy">{tiers.find(t => t.key === selectedTier)?.label}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500 font-medium">결제 금액</span>
                  <span className="font-bold text-primary text-lg">{formatPrice(getTierPrice(selectedTier))}</span>
                </div>
              </div>
              {isAdmin && (
                <p className="text-xs text-blue-600 mb-4">관리자 테스트: 0원 결제로 처리됩니다.</p>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setActiveTab('order')}>이전으로</Button>
                <Button size="lg" onClick={handlePayment}>결제 완료</Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ===== 완료 탭 ===== */}
      {activeTab === 'complete' && (
        <Card className="max-w-lg mx-auto text-center py-12">
          {generating ? (
            <>
              <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-navy mb-2">AI 보고서 생성 중...</h2>
              <p className="text-slate-500 mb-6">RWD 데이터를 분석하고 있습니다.</p>
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>생성 진행률</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-success" />
              </div>
              <h2 className="text-xl font-bold text-navy mb-2">보고서 생성 완료!</h2>
              <p className="text-slate-500 mb-6">AI 분석 보고서가 성공적으로 생성되었습니다.</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/market')}>보고서 목록</Button>
                <Button onClick={() => router.push('/admin/orders')}>주문 관리</Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
