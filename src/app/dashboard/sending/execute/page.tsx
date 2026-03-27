'use client'
import { Send } from 'lucide-react'

export default function Page() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Campaign Sending</h1>
        <p className="text-sm text-slate-500 mt-1">Execute campaign message delivery</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <Send size={48} className="mx-auto text-primary/30 mb-4" />
        <p className="text-slate-400 text-sm">This page is under development</p>
      </div>
    </div>
  )
}
