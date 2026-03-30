'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Send,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  FileText,
} from 'lucide-react'
import { apiGet } from 'A/lib/api'

interface KPI {
  activeCampaigns: number
  totalSent: number
  avgConversion: number
  monthCost: number
  changes: {
    activeCampaigns: number
    totalSent: number
    avgConversion: number
    monthCost: number
  }
}

interface RecentCampaign {
  id: string
  name: string
  type: string
  status: string
  progress: number
  startDate?: string
  endDate?: string
}

interface PendingApproval {
  id: string
  name: string
  type: string
  date: string
  status: string
}

interface ProjectSummary {
  id: string
  name: string
  phase: string
  status: string
  targetSubjects: number
  enrolledSubjects: number
  sponsor: string
}

interface DashboardData {
  kpis: KPI
  recentCampaigns: RecentCampaign[]
  pendingApprovals: PendingApproval[]
  activeProjects: ProjectSummary[]
}

// Fallback hardcoded data
const FALLBACK_DATA: DashboardData = {
  kpis: {
    activeCampaigns: 12,
    totalSent: 2400000,
    avgConversion: 3.5,
    monthCost: 28500,
    changes: {
      activeCampaigns: 2,
      totalSent: 125000,
      avgConversion: 0.2,
      monthCost: 2300,
    },
  },
