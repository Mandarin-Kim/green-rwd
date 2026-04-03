import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser, Role } from '@/types'

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
    const search = url.searchParams.get('search')
    const role = url.searchParams.get('role')

    const skip = (page - 1) * PAGE_SIZE

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {}

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      whereCondition.role = role
    }

    // Get total count
    const total = await prisma.user.count({ where: whereCondition })

    // Get users
    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        org: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            campaigns: true,
            reportOrders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    })

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: users,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '사용자 목록 조회 실패' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '필수 항목을 입력해주세요.' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: Role[] = ['ADMIN', 'SPONSOR', 'CRA', 'USER']
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      )
    }

    // Check user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_USER_ROLE',
        entity: 'User',
        entityId: userId,
        detail: {
          previousRole: targetUser.role,
          newRole: role,
        },
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedUser,
    })
  } catch (error) {
    console.error('User role update error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '사용자 역할 변경 실패' },
      { status: 500 }
    )
  }
}
