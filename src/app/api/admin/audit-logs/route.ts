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
    const action = url.searchParams.get('action')
    const userId = url.searchParams.get('userId')
    const entity = url.searchParams.get('entity')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const skip = (page - 1) * PAGE_SIZE

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {}

    if (action) {
      whereCondition.action = { contains: action, mode: 'insensitive' }
    }

    if (userId) {
      whereCondition.userId = userId
    }

    if (entity) {
      whereCondition.entity = entity
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
    const total = await prisma.auditLog.count({ where: whereCondition })

    // Get audit logs
    const logs = await prisma.auditLog.findMany({
      where: whereCondition,
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        action: true,
        entity: true,
        entityId: true,
        detail: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    })

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: logs,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Audit logs error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '감사 로그 조회 실패' },
      { status: 500 }
    )
  }
}
