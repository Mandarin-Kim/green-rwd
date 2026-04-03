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
    const type = url.searchParams.get('type')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    const skip = (page - 1) * PAGE_SIZE

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {}

    if (type) {
      whereCondition.type = type
    }

    if (search) {
      whereCondition.name = { contains: search, mode: 'insensitive' }
    }

    // Get total count
    const total = await prisma.dataSource.count({ where: whereCondition })

    // Get data sources
    const dataSources = await prisma.dataSource.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        type: true,
        endpoint: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        recordCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    })

    // Map status based on lastSyncStatus and isActive
    const dataSourcesWithStatus = dataSources.map((ds) => {
      let statusValue = 'maintenance'
      if (!ds.isActive) {
        statusValue = 'maintenance'
      } else if (ds.lastSyncStatus === 'SUCCESS' || ds.lastSyncStatus === null) {
        statusValue = 'active'
      } else if (ds.lastSyncStatus === 'ERROR') {
        statusValue = 'error'
      }

      return {
        ...ds,
        status: statusValue,
      }
    })

    // Filter by status if provided
    let filtered = dataSourcesWithStatus
    if (status) {
      filtered = dataSourcesWithStatus.filter((ds) => ds.status === status)
    }

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: filtered,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Data sources list error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '데이터 소스 목록 조회 실패' },
      { status: 500 }
    )
  }
}
