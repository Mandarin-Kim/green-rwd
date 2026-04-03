import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser } from '@/types'

const PAGE_SIZE = 20

export async function GET(request: Request) {
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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const status = url.searchParams.get('status')
    const tier = url.searchParams.get('tier')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const skip = (page - 1) * PAGE_SIZE

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {}

    if (status) {
      whereCondition.status = status
    }

    if (tier) {
      whereCondition.tier = tier
    }

    if (startDate || endDate) {
      whereCondition.createdAt = {}
      if (startDate) {
        whereCondition.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        whereCondition.createdAt.lte = end
      }
    }

    // Get total count
    const total = await prisma.reportOrder.count({ where: whereCondition })

    // Get report orders
    const orders = await prisma.reportOrder.findMany({
      where: whereCondition,
      select: {
        id: true,
        catalog: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        org: {
          select: {
            id: true,
            name: true,
          },
        },
        tier: true,
        price: true,
        status: true,
        progress: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    })

    // Calculate revenue KPIs
    const allOrders = (await prisma.reportOrder.findMany({
      where: {
        status: 'COMPLETED',
      },
      select: {
        price: true,
        tier: true,
        createdAt: true,
      },
    })) as Array<{ price: number; tier: string; createdAt: Date }>

    // Monthly revenue
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyRevenue = allOrders
      .filter((o) => o.createdAt >= firstDayOfMonth)
      .reduce((sum, o) => sum + o.price, 0)

    // Revenue by tier
    const revenueByTier = {
      BASIC: allOrders
        .filter((o) => o.tier === 'BASIC')
        .reduce((sum, o) => sum + o.price, 0),
      PRO: allOrders
        .filter((o) => o.tier === 'PRO')
        .reduce((sum, o) => sum + o.price, 0),
      PREMIUM: allOrders
        .filter((o) => o.tier === 'PREMIUM')
        .reduce((sum, o) => sum + o.price, 0),
    }

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.price, 0)

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        orders,
        kpi: {
          totalRevenue,
          monthlyRevenue,
          revenueByTier,
        },
      },
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Orders list error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '주문 목록 조회 실패' },
      { status: 500 }
    )
  }
}
