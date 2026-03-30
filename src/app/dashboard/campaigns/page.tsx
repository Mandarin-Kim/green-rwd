'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Copy, X, ChevronRight, Send, Search, BarChart3 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'

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