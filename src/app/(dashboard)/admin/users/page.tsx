'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Search, MoreVertical, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  organizationName: string
  status: string
  lastLoginAt: string
}

const roleColors: Record<string, 'success' | 'info' | 'warning' | 'default'> = { ADMIN: 'success', SPONSOR: 'info', CRA: 'warning', USER: 'default' }

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const { data: users, loading, error } = useApi<UserItem[]>('/api/admin/users', { search: search || undefined })

  const items = users || []

  return (
    <div className="p-8">
      <Header
        title="사용자 관리"
        description="플랫폼 사용자를 관리하세요"
        actions={<Button><Plus size={16} />사용자 추가</Button>}
      />
      <div className="mb-6 max-w-md">
        <Input placeholder="이름 또는 이메일 검색..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">이름</th>
                <th className="text-left px-3 py-3 font-medium">이메일</th>
                <th className="text-center px-3 py-3 font-medium">역할</th>
                <th className="text-left px-3 py-3 font-medium">소속</th>
                <th className="text-center px-3 py-3 font-medium">상태</th>
                <th className="text-center px-3 py-3 font-medium">마지막 로그인</th>
                <th className="text-center px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-navy text-[13px]">{u.name}</td>
                  <td className="px-3 py-3 text-[13px] text-slate-500">{u.email}</td>
                  <td className="text-center px-3 py-3"><Badge variant={roleColors[u.role] || 'default'}>{u.role}</Badge></td>
                  <td className="px-3 py-3 text-[13px] text-slate-600">{u.organizationName || '-'}</td>
                  <td className="text-center px-3 py-3">
                    <span className={`inline-block w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-success' : 'bg-slate-300'}`} />
                  </td>
                  <td className="text-center px-3 py-3 text-[13px] text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="text-center px-3 py-3"><button className="p-1 rounded hover:bg-slate-100"><MoreVertical size={14} className="text-slate-400" /></button></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">사용자가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
