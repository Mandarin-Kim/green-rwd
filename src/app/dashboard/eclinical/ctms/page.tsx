'use client'
import { Calendar } from 'lucide-react'

export default function Page() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">CTMS</h1>
        <p className="text-sm text-slate-500 mt-1">임상시험관리시스템</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <Calendar size={48} className="mx-auto text-primary/30 mb-4" />
        <p className="text-slate-400 text-sm">이 페이지는 개발 진행 중입니다</p>
      </div>
    </div>
  )
}
