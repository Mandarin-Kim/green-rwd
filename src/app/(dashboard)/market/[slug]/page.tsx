'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ArrowLeft, FileText, Zap, Crown, Check } from 'lucide-react'
import Link from 'next/link'

const tiers = [
  { key: 'BASIC', label: 'Basic', price: '₩50만', icon: <FileText size={20} />, desc: '시장 개요 + PEST 분석 + 기본 통계', sections: 5 },
  { key: 'PRO', label: 'Pro', price: '₩150만', icon: <Zap size={20} />, desc: 'Basic + 경쟁사 분석 + Porter 5 Forces + 시나리오', sections: 10 },
  { key: 'PREMIUM', label: 'Premium', price: '₩300만', icon: <Crown size={20} />, desc: 'Pro + 환자 세그먼트 + RWD 대시보드 + 전략 제안', sections: 15 },
]

export default function ReportOrderPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState('PRO')
  const [ordering, setOrdering] = useState(false)
  const [ordered, setOrdered] = useState(false)

  const handleOrder = () => {
    setOrdering(true)
    setTimeout(() => {
      setOrdering(false)
      setOrdered(true)
    }, 2000)
  }

  return (
    <div className="p-8">
      <Link href="/market" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-4">
        <ArrowLeft size={14} />보고서 목록
      </Link>

      <Header title="보고서 주문" description={`${slug} 보고서의 티어를 선택하고 주문하세요`} />

      {ordered ? (
        <Card className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">주문이 완료되었습니다!</h2>
          <p className="text-slate-500 mb-6">AI가 보고서를 생성 중입니다. 완료 시 알림을 보내드립니다.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/market')}>보고서 목록</Button>
            <Button onClick={() => router.push('/dashboard')}>대시보드로</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Tier Selection */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {tiers.map(tier => (
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
                <p className="text-2xl font-bold text-primary mb-3">{tier.price}</p>
                <p className="text-sm text-slate-500 mb-3">{tier.desc}</p>
                <p className="text-xs text-slate-400">{tier.sections}개 섹션 포함</p>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button size="lg" onClick={handleOrder} loading={ordering}>
              {ordering ? '주문 처리 중...' : `${tiers.find(t => t.key === selectedTier)?.label} 주문하기`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
