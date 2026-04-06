import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/types'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = session.user as SessionUser
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Common queries for all roles
    const [
      activeCampaigns,
      totalSentData,
      avgConversionData,
      totalCostData,
      prevSentData,
      prevCostData,
      recentCampaignsRaw,
      pendingApprovalsRaw,
    ] = await Promise.all([
      // Active campaign count
      prisma.campaign.count({
        where: {
          status: { in: ['EXECUTING', 'SCHEDULED', 'APPROVED'] },
        },
      }),
      // Total sent (last 30 days)
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: thirtyDaysAgo } },
        _sum: { totalSent: true },
      }),
      // Avg conversion rate (last 30 days)
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: thirtyDaysAgo } },
        _avg: { conversionRate: true },
      }),
      // Total cost (last 30 days)
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: thirtyDaysAgo } },
        _sum: { totalCost: true },
      }),
      // Previous period sent
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        _sum: { totalSent: true },
      }),
      // Previous period cost
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        _sum: { totalCost: true },
      }),
      // Recent campaigns with analytics
      prisma.campaign.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        where: { status: { not: 'DRAFT' } },
        include: {
          segment: { select: { name: true } },
          analytics: {
            select: {
              totalSent: true,
              converted: true,
              conversionRate: true,
              totalCost: true,
            },
          },
        },
      }),
      // Pending approvals
      prisma.campaign.findMany({
        where: { status: 'PENDING_APPROVAL' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
    ])

    const totalSent = totalSentData._sum.totalSent || 0
    const avgConversion = avgConversionData._avg.conversionRate || 0
    const monthCost = totalCostData._sum.totalCost || 0
    const prevSent = prevSentData._sum.totalSent || 0
    const prevCost = prevCostData._sum.totalCost || 0

    const sentTrend = calculateTrend(totalSent, prevSent)
    const costTrend = calculateTrend(monthCost, prevCost)

    const dashboardData = {
      kpis: {
        activeCampaigns,
        totalSent,
        avgConversionRate: avgConversion,
        monthCost,
        changes: {
          activeCampaigns: '+0%',
          totalSent: sentTrend.change,
          avgConversionRate: '+0%',
          monthCost: costTrend.change,
        },
      },
      recentCampaigns: recentCampaignsRaw.map((c) => ({
        id: c.id,
        name: c.name,
        segmentName: c.segment?.name,
        totalSent: c.analytics?.totalSent || 0,
        totalConverted: c.analytics?.converted || 0,
        conversionRate: c.analytics?.conversionRate || 0,
        totalCost: c.analytics?.totalCost || 0,
        status: c.status,
      })),
      pendingApprovals: pendingApprovalsRaw.map((a) => ({
        id: a.id,
        name: a.name,
        requesterName: a.user?.name || '알 수 없음',
        createdAt: a.createdAt.toISOString(),
      })),
    }

    return NextResponse.json({ success: true, data: dashboardData })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { success: false, error: '대시보드 조회 실패' },
      { status: 500 }
    )
  }
}

function calculateTrend(current: number, previous: number): { change: string; up: boolean } {
  if (previous === 0) {
    return { change: '+0%', up: current > 0 }
  }
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return {
    change: `${sign}${pct.toFixed(1)}%`,
    up: pct >= 0,
  }
}
