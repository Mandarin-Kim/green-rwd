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
        { success: false, error: '\uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' },
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
      prisma.campaign.count({
        where: { status: { in: ['EXECUTING', 'SCHEDULED', 'APPROVED'] } },
      }),
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: thirtyDaysAgo } },
        _sum: { totalSent: true },
      }),
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: thirtyDaysAgo } },
        _avg: { conversionRate: true },
      }),
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: thirtyDaysAgo } },
        _sum: { totalCost: true },
      }),
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        _sum: { totalSent: true },
      }),
      prisma.campaignAnalytics.aggregate({
        where: { updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        _sum: { totalCost: true },
      }),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          segment: { select: { name: true } },
          analytics: { select: { totalSent: true, totalConverted: true, conversionRate: true, totalCost: true } },
        },
      }),
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
      recentCampaigns: recentCampaignsRaw.map(c => ({
        id: String(c.id),
        name: c.name,
        segmentName: c.segment?.name || undefined,
        totalSent: c.analytics?.totalSent || 0,
        totalConverted: c.analytics?.totalConverted || 0,
        conversionRate: c.analytics?.conversionRate || 0,
        totalCost: c.analytics?.totalCost || 0,
        status: c.status,
      })),
      pendingApprovals: pendingApprovalsRaw.map(a => ({
        id: String(a.id),
        name: a.name,
        requesterName: a.user?.name || 'Unknown',
        createdAt: a.createdAt.toISOString(),
      })),
    }

    return NextResponse.json({ success: true, data: dashboardData })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { success: false, error: '\uB300\uC2DC\uBCF4\uB4DC \uC870\uD68C \uC2E4\uD328' },
      { status: 500 }
    )
  }
}

function calculateTrend(current: number, previous: number): { change: string; up: boolean } {
  if (previous === 0) {
    return { change: '+0%', up: current > 0 }
  }
  const change = ((current - previous) / previous) * 100
  const sign = change >= 0 ? '+' : ''
  return {
    change: `${sign}${change.toFixed(1)}%`,
    up: change >= 0,
  }
}
