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

    let dashboardData

    if (user.role === 'SPONSOR') {
      // SPONSOR: active campaigns, total sent, avg conversion rate, total spend
      const [
        activeCampaigns,
        totalSent,
        avgConversionData,
        totalSpend,
        prevTotalSent,
        prevTotalSpend,
      ] = await Promise.all([
        prisma.campaign.count({
          where: {
            userId: user.id,
            status: { in: ['EXECUTING', 'SCHEDULED', 'APPROVED'] },
          },
        }),
        prisma.campaignAnalytics.aggregate({
          where: {
            campaign: { userId: user.id },
            updatedAt: { gte: thirtyDaysAgo },
          },
          _sum: { totalSent: true },
        }),
        prisma.campaignAnalytics.aggregate({
          where: {
            campaign: { userId: user.id },
            updatedAt: { gte: thirtyDaysAgo },
          },
          _avg: { conversionRate: true },
        }),
        prisma.campaignAnalytics.aggregate({
          where: {
            campaign: { userId: user.id },
            updatedAt: { gte: thirtyDaysAgo },
          },
          _sum: { totalCost: true },
        }),
        prisma.campaignAnalytics.aggregate({
          where: {
            campaign: { userId: user.id },
            updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
          _sum: { totalSent: true },
        }),
        prisma.campaignAnalytics.aggregate({
          where: {
            campaign: { userId: user.id },
            updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
          _sum: { totalCost: true },
        }),
      ])

      const sentTrend = calculateTrend(
        totalSent._sum.totalSent || 0,
        prevTotalSent._sum.totalSent || 0
      )
      const spendTrend = calculateTrend(
        totalSpend._sum.totalCost || 0,
        prevTotalSpend._sum.totalCost || 0
      )

      dashboardData = {
        role: 'SPONSOR',
        kpis: [
          {
            label: '활성 캠페인',
            value: activeCampaigns,
            change: '0%',
            up: true,
            icon: 'trending-up',
          },
          {
            label: '총 발송',
            value: totalSent._sum.totalSent || 0,
            change: sentTrend.change,
            up: sentTrend.up,
            icon: 'send',
          },
          {
            label: '평균 전환율',
            value: `${(avgConversionData._avg.conversionRate || 0).toFixed(2)}%`,
            change: '0%',
            up: true,
            icon: 'target',
          },
          {
            label: '총 소비액',
            value: `₩${((totalSpend._sum.totalCost || 0) / 1000).toFixed(0)}K`,
            change: spendTrend.change,
            up: spendTrend.up,
            icon: 'wallet',
          },
        ],
      }
    } else if (user.role === 'CRA') {
      // CRA: assigned studies, enrolled, enrollment rate, pending tasks
      const [assignedStudies, totalEnrolled, pendingTasks] = await Promise.all([
        prisma.study.count({
          where: { status: 'ACTIVE' },
        }),
        prisma.site.aggregate({
          where: { study: { status: 'ACTIVE' } },
          _sum: { enrolledCount: true },
        }),
        prisma.notification.count({
          where: {
            userId: user.id,
            isRead: false,
          },
        }),
      ])

      const targetEnrollment = await prisma.site.aggregate({
        where: { study: { status: 'ACTIVE' } },
        _sum: { targetCount: true },
      })

      const enrollmentRate =
        (targetEnrollment._sum.targetCount || 0) > 0
          ? ((totalEnrolled._sum.enrolledCount || 0) /
              (targetEnrollment._sum.targetCount || 1)) *
            100
          : 0

      dashboardData = {
        role: 'CRA',
        kpis: [
          {
            label: '할당된 임상시험',
            value: assignedStudies,
            change: '0%',
            up: true,
            icon: 'clipboard',
          },
          {
            label: '총 등록',
            value: totalEnrolled._sum.enrolledCount || 0,
            change: '0%',
            up: true,
            icon: 'users',
          },
          {
            label: '등록율',
            value: `${enrollmentRate.toFixed(2)}%`,
            change: '0%',
            up: true,
            icon: 'percent',
          },
          {
            label: '대기중 작업',
            value: pendingTasks,
            change: '0%',
            up: false,
            icon: 'alert-circle',
          },
        ],
      }
    } else if (user.role === 'ADMIN') {
      // ADMIN: total users, monthly revenue, active reports, API health
      const [totalUsers, activeReports] = await Promise.all([
        prisma.user.count(),
        prisma.reportOrder.count({
          where: { status: 'GENERATING' },
        }),
      ])

      const monthlyRevenue = await prisma.creditTransaction.aggregate({
        where: {
          type: 'CHARGE',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      })

      const prevMonthlyRevenue = await prisma.creditTransaction.aggregate({
        where: {
          type: 'CHARGE',
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        _sum: { amount: true },
      })

      const revenueTrend = calculateTrend(
        monthlyRevenue._sum.amount || 0,
        prevMonthlyRevenue._sum.amount || 0
      )

      dashboardData = {
        role: 'ADMIN',
        kpis: [
          {
            label: '전체 사용자',
            value: totalUsers,
            change: '0%',
            up: true,
            icon: 'users',
          },
          {
            label: '월간 수익',
            value: `₩${((monthlyRevenue._sum.amount || 0) / 1000).toFixed(0)}K`,
            change: revenueTrend.change,
            up: revenueTrend.up,
            icon: 'trending-up',
          },
          {
            label: '생성 중인 리포트',
            value: activeReports,
            change: '0%',
            up: true,
            icon: 'file-text',
          },
          {
            label: 'API 상태',
            value: '정상',
            change: '0%',
            up: true,
            icon: 'check-circle',
          },
        ],
      }
    } else {
      return NextResponse.json(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
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
  const change = ((current - previous) / previous) * 100
  const sign = change >= 0 ? '+' : ''
  return {
    change: `${sign}${change.toFixed(1)}%`,
    up: change >= 0,
  }
}
