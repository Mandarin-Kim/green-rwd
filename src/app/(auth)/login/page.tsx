'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Target } from 'lucide-react'

const demoAccounts = [
  { email: 'admin@greenribbon.co.kr', role: 'ADMIN', label: '관리자', desc: '전체 시스템 관리 권한' },
  { email: 'sponsor@pharma.co.kr', role: 'SPONSOR', label: '스폰서', desc: '캔페인 생성/보고서 주문' },
  { email: 'cra@greenribbon.co.kr', role: 'CRA', label: 'CRA/CRC', desc: '발송 승인/임상 관리' },
  { email: 'user@hospital.co.kr', role: 'USER', label: '일반 사용자', desc: '데이터 조회' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDemoLogin = async (account: typeof demoAccounts[0]) => {
    setLoading(account.role)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email: account.email,
        role: account.role,
        redirect: false,
      })
      if (result?.error) {
        setError('로그인 실패: ' + result.error)
        setLoading(null)
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Target size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Green-RWD</h1>
          <p className="text-slate-400 text-sm mt-1">Clinical Platform v2</p>
        </div>

        {/* Demo Login Cards */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <p className="text-sm text-slate-300 mb-4 text-center">데모 계정으로 로그인</p>
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs text-center">
              {error}
            </div>
          )}
          <div className="space-y-3">
            {demoAccounts.map(account => (
              <button
                key={account.role}
                onClick={() => handleDemoLogin(account)}
                disabled={loading !== null}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light font-bold text-sm">
                  {account.label[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{account.label}</p>
                  <p className="text-[11px] text-slate-400">{account.desc}</p>
                </div>
                {loading === account.role && (
                  <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6">© 2026 GreenRibbon. All rights reserved.</p>
      </div>
    </div>
  )
}
