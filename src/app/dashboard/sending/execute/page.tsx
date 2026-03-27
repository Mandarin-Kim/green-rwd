'use client'
import { Send } from 'lucide-react'

export default function Page() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">발송 실행</h1>
        <p className="text-sm text-slate-500 mt-1">ܺ�페인 발송 실행</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <Send size={48} className="mx-auto text-primary/30 mb-4" />
        <p className="text-slate-400 text-sm">이 페이지는 개발 진행 중입니다</p>
      </div>
    </div>
  )
}
