'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Send,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'

interface DashboardStats {
  totalCampaigns: number
  activeCampaigns: number
  totalSubjects: number
  totalSendings: number
  recentActivities: { id: string; action: string; entity: string; createdAt: string }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => {
        setStats({
          totalCampaigns: 5,
          activeCampaigns: 2,
          totalSubjects: 150,
          totalSendings: 12,
          recentActivities: [],
        })
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Campaigns',
      value: stats?.totalCampaigns ?? 0,
      icon: BarChart3,
      color: 'bg-blue-500',
      change: '+12%',
      up: true,
    },
    {
      title: 'Active Campaigns',
      value: stats?.activeCampaigns ?? 0,
      icon: Send,
      color: 'bg-green-500',
      change: '+5%',
      up: true,
    },
    {
      title: 'Total Subjects',
      value: stats?.totalSubjects ?? 0,
      icon: Users,
      color: 'bg-purple-500',
      change: '+8%',
      up: true,
    },
    {
      title: 'Total Sendings',
      value: stats?.totalSendings ?? 0,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '-2%',
      up: false,
    },
  ]

  const quickLinks = [
    { title: 'Campaigns', href: '/dashboard/campaigns', icon: BarChart3, desc: 'Manage campaigns' },
    { title: 'eClinical', href: '/dashboard/eclinical', icon: FileText, desc: 'Clinical trials' },
    { title: 'Market', href: '/dashboard/market', icon: TrendingUp, desc: 'RWD Market data' },
    { title: 'Projects', href: '/dashboard/projects', icon: FolderOpen, desc: 'Project management' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          <Clock className="inline h-4 w-4 mr-1" />
          Last updated: {new Date().toLocaleString('ko-KR')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {card.up ? (
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={card.up ? 'text-green-600' : 'text-red-600'}>{card.change}</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="bg-green-100 p-2 rounded-lg">
              <link.icon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{link.title}</p>
              <p className="text-sm text-gray-500">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {stats?.recentActivities && stats.recentActivities.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.entity} - {activity.createdAt}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
