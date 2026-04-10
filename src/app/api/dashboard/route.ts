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

    const [
      activeCampaigns,
      totalSentData,
      avgConversionData,
      totalCostData,
      prevSentData,
      prevCostData,
      recentCampaignsRaw,
      pendingApprovalsRaw,
      totalReports,
      totalSegments,
      totalPatients,
      recentReports,
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
      prisma.campaign.findMany({
        where: { status: 'PENDING_APPROVAL' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      // 보고서 총 개수
      prisma.reportCatalog.count({ where: { isActive: true } }),
      // 세그먼트 총 개수
      prisma.segment.count({ where: { status: 'active' } }),
      // 총 환자 풀
      prisma.segment.aggregate({
        where: { status: 'active' },
        _sum: { patientCount: true },
      }),
      // 최근 보고서 (5개)
      prisma.reportCatalog.findMany({
        take: 5,
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          categories: true,
          marketSizeKrw: true,
          patientPool: true,
          createdAt: true,
        },
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
      // 플랫폼 통계 (보고서/세그먼트)
      platformStats: {
        totalReports,
        totalSegments,
        totalPatients: totalPatients._sum.patientCount || 0,
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
      recentReports: recentReports.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: r.categories?.[0] || '',
        marketSize: r.marketSizeKrw ? `${(Number(r.marketSizeKrw) / 100000000).toFixed(0)}억원` : '',
        patientPool: r.patientPool ? `${r.patientPool.toLocaleString()}명` : '',
        createdAt: r.createdAt.toISOString(),
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
