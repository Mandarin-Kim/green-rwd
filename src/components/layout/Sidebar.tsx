'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Target, Megaphone, Rocket, Users, FlaskConical,
  Settings, ChevronDown, ChevronRight, LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  { label: '대시보드', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: '시장분석·타겟', icon: <BarChart3 size={18} />,
    children: [
      { label: '시장보고서', href: '/dashboard/market' },
      { label: 'RWD 리스트', href: '/dashboard/rwd-list' },
      { label: '세그먼트', href: '/dashboard/segments' },
    ]
  },
  {
    label: '캠페인·분석', icon: <Megaphone size={18} />,
    children: [
      { label: '캠페인 관리', href: '/dashboard/campaigns' },
      { label: '콘텐츠 생성', href: '/dashboard/campaigns/content' },
      { label: '분석 설정', href: '/dashboard/campaigns/analytics' },
    ]
  },
  {
    label: '발송·성과', icon: <Rocket size={18} />,
    children: [
      { label: '승인/충전', href: '/dashboard/sending/approve' },
      { label: '발송', href: '/dashboard/sending/execute' },
      { label: '성과 분석', href: '/dashboard/sending/performance' },
    ]
  },
  {
    label: '대상자·프로젝트', icon: <Users size={18} />,
    children: [
      { label: '적격 분류', href: '/dashboard/subjects/qualify' },
      { label: '대상자 관리', href: '/dashboard/subjects/manage' },
      { label: '프로젝트', href: '/dashboard/projects' },
    ]
  },
  {
    label: 'eClinical Suite', icon: <FlaskConical size={18} />,
    children: [
      { label: 'EDC', href: '/dashboard/eclinical/edc' },
      { label: 'CTMS', href: '/dashboard/eclinical/ctms' },
      { label: 'IWRS', href: '/dashboard/eclinical/iwrs' },
      { label: 'Safety', href: '/dashboard/eclinical/safety' },
      { label: 'eTMF', href: '/dashboard/eclinical/etmf' },
      { label: 'eConsent', href: '/dashboard/eclinical/econsent' },
    ]
  },
  { label: '설정', href: '/dashboard/settings', icon: <Settings size={18} /> },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    '시장분석·타겟': true,
    '캠페인·분석': false,
    '발송·성과': false,
    '대상자·프로젝트': false,
    'eClinical Suite': false,
  })

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const isActive = (href: string) => pathname === href
  const isGroupActive = (item: NavItem) =>
    item.children?.some(c => pathname?.startsWith(c.href)) ?? false

  return (
    <aside className="fixed left-0 top-0 h-screen w-[230px] bg-navy flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-[15px] leading-tight">Green-RWD</h1>
            <p className="text-[10px] text-slate-400 leading-tight">Real-World Data Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navItems.map((item) => (
          <div key={item.label} className="mb-0.5">
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all',
                  isActive(item.href)
                    ? 'bg-primary/20 text-primary-light font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all',
                    isGroupActive(item)
                      ? 'text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {openMenus[item.label] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {openMenus[item.label] && item.children && (
                  <div className="ml-5 pl-3 border-l border-white/10 mt-1 mb-2">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-3 py-2 rounded-md text-[12px] transition-all',
                          isActive(child.href)
                            ? 'text-primary-light bg-primary/10 font-medium'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs text-primary-light font-bold">
            관
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-white font-medium truncate">본부장님</p>
            <p className="text-[10px] text-slate-500 truncate">그린리본 · Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
