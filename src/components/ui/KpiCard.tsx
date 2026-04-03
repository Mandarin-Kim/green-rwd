import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  change: string
  up: boolean
  icon: React.ReactNode
  className?: string
}

export default function KpiCard({ label, value, change, up, icon, className }: KpiCardProps) {
  return (
    <div className={cn('bg-white rounded-xl p-5 shadow-sm border border-slate-100', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className={cn('flex items-center gap-1 text-xs font-medium', up ? 'text-success' : 'text-danger')}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}
