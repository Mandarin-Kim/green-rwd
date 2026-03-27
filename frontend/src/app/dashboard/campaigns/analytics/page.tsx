'use client'
import { BarChart3 } from 'lucide-react'

export default function Page() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Campaign Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Marketing Analytics</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <BarChart3 size={48} className="mx-auto text-primary/30 mb-4" />
        <p className="text-slate-400 text-sm">This page is under development</p>
      </div>
    </div>
  )
}
