import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser } from '@/types'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = session.user as SessionUser

    // ADMIN role only
    if (user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // Total users
    const totalUsers = await prisma.user.count()

    // Monthly revenue
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthlyRevenueResult = (await prisma.reportOrder.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: firstDayOfMonth,
        },
      },
      _sum: {
        price: true,
      },
    })) as { _sum: { price: number | null } }

    // Active reports (GENERATING, COMPLETED in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const activeReports = await prisma.reportOrder.count({
      where: {
        OR: [
          { status: 'GENERATING' },
          { status: 'PENDING' },
          {
            status: 'COMPLETED',
            completedAt: {
              gte: thirtyDaysAgo,
            },
          },
        ],
      },
    })

    // Data source health (n/14 sources OK)
    const totalDataSources = await prisma.dataSource.count()
    const healthyDataSources = await prisma.dataSource.count({
      where: {
        isActive: true,
        OR: [
          { lastSyncStatus: 'SUCCESS' },
          { lastSyncStatus: null }, // never synced but still active
        ],
      },
    })

    const apiHealth = {
      total: totalDataSources,
      healthy: healthyDataSources,
      percentage: totalDataSources > 0 ? (healthyDataSources / totalDataSources) * 100 : 0,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        totalUsers,
        monthlyRevenue: monthlyRevenueResult._sum.price || 0,
        activeReports,
        apiHealth,
      },
    })
  } catch (error) {
    console.error('Dashboard KPI error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '대시보드 KPI 조회 실패' },
      { status: 500 }
    )
  }
}
