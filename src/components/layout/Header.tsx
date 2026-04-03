'use client'

import { Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export default function Header({ title, description, actions }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="relative p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <Bell size={18} className="text-slate-500" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[10px] text-white flex items-center justify-center font-bold">3</span>
        </button>
      </div>
    </div>
  )
}
