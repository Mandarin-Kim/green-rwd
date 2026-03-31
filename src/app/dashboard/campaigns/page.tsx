'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface Campaign {
  id: string
  name: string
  type: 'SMS' | 'Email' | 'Push'
  status: '진행중' | '준비중' | '완료'
  segment: string
  startDate: string
  endDate: string
  createdDate: string
  message?: string
  targetCount?: number
  sentCount?: number
  openRate?: number
  conversionRate?: number
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/campaigns')
        setCampaigns(data || [])
        setFilteredCampaigns(data || [])
      } catch (err) {
        console.error('Failed to fetch campaigns:', err)
        setError('캠페인 데이터를 불러오는데 실패했습니다.')
        setCampaigns([{id:'1',name:'당뇨병 혅압 임상시험 캠페인',type:'SMS',status: '진행중',segment:'당뇨병 환자군',startDate:'2026-03-01',endDate:'2026-04-30',createdDate:'2026-02-28',targetCount:500,sentCount:450,openRate:85}])
        setFilteredCampaigns([{id:'1',name:'당뇨병 임상시험 캠페인',type:'SMS',status:'진행중',segment:'당뇨병 환자군',startDate:'2026-03-01',endDate:'2026-04-30',createdDate:'2026-02-28',targetCount:500,sentCount:450,openRate:85}])
      } finally { setLoading(false) }
    }
    fetchCampaigns()
  }, [])

  useEffect(() => {
    const filtered = campaigns.filter((campaign) =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.segment.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredCampaigns(filtered)
  }, [searchTerm, campaigns])

  const getStatusColor = (status: string) => {
    switch (status) {
      case '진행중': return 'bg-blue-100 text-blue-800'
      case '준비중': return 'bg-yellow-100 text-yellow-800'
      case '완료': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SMS': return 'bg-purple-100 text-purple-800'
      case 'Email': return 'bg-blue-100 text-blue-800'
      case 'Push': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  return ( <div className="space-y-6"> <div> <h1 className="text-3xl font-bold text-gray-900">캠페인 관리</h1> <p className="text-gray-600 mt-2">임상시험 대상 발송 캠페인 목록</p> </div> {error && ( <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3"> <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> <div> <p className="text-red-800 font-medium">오류</p> <p className="text-red-700 text-sm">{error}</p> </div> </div> )} <div className="bg-white rounded-lg shadow"> <div className="p-6 border-b border-gray-200"> <div className="relative"> <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" /> <input type="text" placeholder="캠페인명, 세근먼트으로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /> </div> </div> {loading ? ( <div className="flex justify-center items-center py-12"> <Loader2 className="w-8 h-8 text-blue-600 animate-spin" /> </div> ) : filteredCampaigns.length === 0 ? ( <div className="text-center py-12"> <p className="text-gray-500">캠페인이 없습니다.</p> </div> ) : ( <div className="overflow-x-auto"> <table className="w-full"> <thead> <tr className="bg-gray-50 border-b border-gray-200"> <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">캠페인명</th> <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">유형</th> <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">상태</th> <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">세그먼트</th> <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">대상자</th> <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">시작일</th> </tr> </thead> <tbody> {filteredCampaigns.map((campaign) => ( <tr key={campaign.id} className="border-b border-gray-200 hover:bg-gray-50"> <td className="px-6 py-4 text-sm text-gray-900 font-medium">{campaign.name}</td> <td className="px-6 py-4 text-sm"> <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(campaign.type)}`}> {campaign.type} </span> </td> <td className="px-6 py-4 text-sm"> <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}> {campaign.status} </span> </td> <td className="px-6 py-4 text-sm text-gray-600">{campaign.segment}</td> <td className="px-6 py-4 text-sm text-gray-600">{campaign.targetCount?.toLocaleString()}</td> <td className="px-6 py-4 text-sm text-gray-600">{campaign.startDate}</td> </tr> ))} </tbody> </table> </div> )} {!loading && filteredCampaigns.length > 0 && ( <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600"> 전체 {filteredCampaigns.length}건 </div> )} </div> </div> ) }
