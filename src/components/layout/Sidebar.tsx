'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Target, Megaphone, Rocket, FlaskConical,
  Settings, ChevronDown, ChevronRight, LayoutDashboard, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  permission?: string
  children?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  { label: '대시보드', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: '시장분석·보고서', icon: <BarChart3 size={18} />,
    children: [
      { label: 'AI 시장보고서', href: '/market' },
      { label: '세그먼트', href: '/segments' },
    ]
  },
  {
    label: '캠페인', icon: <Megaphone size={18} />,
    children: [
      { label: '캠페인 목록', href: '/campaigns' },
      { label: '새 캠페인', href: '/campaigns/new' },
    ]
  },
  {
    label: '발송·성과', icon: <Rocket size={18} />,
    children: [
      { label: '발송 관리', href: '/sending' },
    ]
  },
  {
    label: 'eClinical', icon: <FlaskConical size={18} />,
    children: [
      { label: '임상시험 관리', href: '/eclinical' },
    ]
  },
  {
    label: '관리자', icon: <Shield size={18} />, permission: 'ADMIN',
    children: [
      { label: '사용자 관리', href: '/admin/users' },
      { label: '데이터소스', href: '/admin/datasources' },
      { label: '주문 관리', href: '/admin/orders' },
    ]
  },
  { label: '설정', href: '/settings', icon: <Settings size={18} /> },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    '시장분석·보고서': true,
    '캠페인': false,
    '발송·성과': false,
    'eClinical': false,
    '관리자': false,
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
            <p className="text-[10px] text-slate-400 leading-tight">Clinical Platform v2</p>
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
