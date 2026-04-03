'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { User, Bell, CreditCard, Key, Save, Loader2 } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'

interface Profile {
  name: string
  email: string
  phone: string
  organization: string
}

interface CreditInfo {
  balance: number
  transactions: Array<{
    id: string
    description: string
    amount: number
    createdAt: string
  }>
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', organization: '' })
  const [saving, setSaving] = useState(false)

  const { data: profile } = useApi<Profile>('/api/settings/profile')
  const { data: credits } = useApi<CreditInfo>(tab === 'credits' ? '/api/settings/credits' : null)
  const { mutate: updateProfile } = useMutation('put')

  // 프로필 데이터가 로드되면 폼에 반영
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        phone: profile.phone || '',
        organization: profile.organization || '',
      })
    }
  }, [profile])

  const handleSaveProfile = async () => {
    setSaving(true)
    await updateProfile('/api/settings/profile', profileForm)
    setSaving(false)
  }

  return (
    <div className="p-8">
      <Header title="설정" description="계정 및 시스템 설정을 관리하세요" />

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 space-y-1">
          {[
            { key: 'profile', label: '프로필', icon: <User size={16} /> },
            { key: 'notifications', label: '알림 설정', icon: <Bell size={16} /> },
            { key: 'credits', label: '크레딧/결제', icon: <CreditCard size={16} /> },
            { key: 'api', label: 'API 키', icon: <Key size={16} /> },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                tab === item.key ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'profile' && (
            <Card>
              <h3 className="font-semibold text-[15px] mb-6">프로필 설정</h3>
              <div className="space-y-4 max-w-lg">
                <Input
                  label="이름"
                  value={profileForm.name}
                  onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                />
                <Input label="이메일" value={profile?.email || ''} disabled />
                <Input
                  label="전화번호"
                  placeholder="010-0000-0000"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                />
                <Input
                  label="소속"
                  value={profileForm.organization}
                  onChange={e => setProfileForm(p => ({ ...p, organization: e.target.value }))}
                />
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  저장
                </Button>
              </div>
            </Card>
          )}
          {tab === 'notifications' && (
            <Card>
              <h3 className="font-semibold text-[15px] mb-6">알림 설정</h3>
              <div className="space-y-4">
                {['캠페인 승인 요청', '발송 완료', 'AI 보고서 생성 완료', '시스템 알림'].map(item => (
                  <div key={item} className="flex items-center justify-between py-3 border-b border-slate-50">
                    <span className="text-sm text-navy">{item}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {tab === 'credits' && (
            <Card>
              <h3 className="font-semibold text-[15px] mb-6">크레딧 & 결제</h3>
              <div className="p-6 bg-primary/5 rounded-xl mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">현재 잔액</p>
                  <p className="text-3xl font-bold text-primary">₩{(credits?.balance || 0).toLocaleString()}</p>
                </div>
                <Button>충전하기</Button>
              </div>
              <h4 className="font-medium text-sm text-slate-600 mb-3">최근 거래</h4>
              <div className="space-y-2">
                {(credits?.transactions || []).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <p className="text-sm text-navy">{tx.description}</p>
                      <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <span className={`text-sm font-medium tabular-nums ${tx.amount > 0 ? 'text-success' : 'text-navy'}`}>
                      {tx.amount > 0 ? '+' : ''}₩{Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!credits?.transactions || credits.transactions.length === 0) && (
                  <p className="text-center py-6 text-sm text-slate-400">거래 내역이 없습니다</p>
                )}
              </div>
            </Card>
          )}
          {tab === 'api' && (
            <Card>
              <h3 className="font-semibold text-[15px] mb-6">API 키 관리</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 mb-2">API Key</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-mono text-slate-600">grwd_sk_••••••••••••••••••••</code>
                    <Button variant="outline" size="sm">복사</Button>
                  </div>
                </div>
                <Button variant="outline">새 API 키 생성</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
