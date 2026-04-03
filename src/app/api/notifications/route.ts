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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true'

    const skip = (page - 1) * PAGE_SIZE

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {
      userId: user.id,
    }

    if (unreadOnly) {
      whereCondition.isRead = false
    }

    // Get total count
    const total = await prisma.notification.count({ where: whereCondition })
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    // Get notifications (newest first)
    const notifications = await prisma.notification.findMany({
      where: whereCondition,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    })

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Notifications list error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '알림 목록 조회 실패' },
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
    const body = await request.json()
    const { notificationIds, markAsRead } = body

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '유효하지 않은 입력입니다.' },
        { status: 400 }
      )
    }

    if (typeof markAsRead !== 'boolean') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '유효하지 않은 입력입니다.' },
        { status: 400 }
      )
    }

    // Verify all notifications belong to user
    const notifications = await prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
        userId: user.id,
      },
      select: {
        id: true,
      },
    })

    if (notifications.length !== notificationIds.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '권한이 없는 알림이 포함되어 있습니다.' },
        { status: 403 }
      )
    }

    // Update notifications
    const updated = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id,
      },
      data: {
        isRead: markAsRead,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        updated: updated.count,
        message: markAsRead ? '알림이 읽음으로 표시되었습니다.' : '알림이 읽지 않음으로 표시되었습니다.',
      },
    })
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '알림 상태 변경 실패' },
      { status: 500 }
    )
  }
}
