'use client'

import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Plus, RefreshCw, Database, Globe, FileText, Server, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface DataSource {
  id: string
  name: string
  type: string
  endpoint: string
  status: string
  lastSyncAt: string
  recordCount: number
  syncSchedule: string
}

const typeIcons: Record<string, React.ReactNode> = {
  API: <Globe size={16} />, SCRAPING: <FileText size={16} />, PROPRIETARY: <Server size={16} />, MANUAL: <Database size={16} />,
}

export default function DataSourcesPage() {
  const { data: sources, loading, error } = useApi<DataSource[]>('/api/admin/datasources')

  const items = sources || []

  return (
    <div className="p-8">
      <Header
        title="데이터소스 관리"
        description="외부 API 연동 및 스크래핑 데이터소스를 관리하세요"
        actions={<Button><Plus size={16} />데이터소스 추가</Button>}
      />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">등록된 데이터소스가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {items.map(s => (
            <Card key={s.id} padding="none" className="hover:shadow-md transition-shadow">
              <div className="flex items-center p-5 gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === 'active' || s.status === 'ACTIVE' ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-600'}`}>
                  {typeIcons[s.type] || <Database size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-navy text-[14px]">{s.name}</h3>
                    <Badge variant={s.type === 'API' ? 'info' : s.type === 'SCRAPING' ? 'warning' : 'success'}>{s.type}</Badge>
                    <span className={`w-2 h-2 rounded-full ${s.status === 'active' || s.status === 'ACTIVE' ? 'bg-success' : 'bg-amber-400'}`} />
                  </div>
                  <p className="text-[12px] text-slate-400">{s.endpoint}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-sm font-medium text-navy">{(s.recordCount || 0).toLocaleString()}건</p>
                  <p className="text-[11px] text-slate-400">{s.syncSchedule || '-'}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-[12px] text-slate-500">{s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString('ko-KR') : '-'}</p>
                </div>
                <Button variant="ghost" size="sm"><RefreshCw size={14} />동기화</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
