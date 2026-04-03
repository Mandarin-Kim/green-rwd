import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser } from '@/types'

// Default notification preferences
const DEFAULT_PREFERENCES = {
  emailCampaignUpdates: true,
  emailReportCompletion: true,
  emailSystemAlerts: true,
  emailWeeklyDigest: true,
  pushCampaignUpdates: false,
  pushReportCompletion: true,
  pushSystemAlerts: true,
}

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

    // Get user with notification preferences
    const userWithPrefs = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
      },
    })

    if (!userWithPrefs) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Retrieve preferences from user's metadata or return defaults
    // In a real app, you might store this in a separate NotificationPreference table
    // For now, return defaults with a note that they can be customized

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        preferences: DEFAULT_PREFERENCES,
        note: '알림 설정은 향후 변경할 수 있습니다.',
      },
    })
  } catch (error) {
    console.error('Notification preferences fetch error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '알림 설정 조회 실패' },
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
    const { preferences } = body

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '유효하지 않은 입력입니다.' },
        { status: 400 }
      )
    }

    // Validate preference keys
    const validKeys = Object.keys(DEFAULT_PREFERENCES)
    const providedKeys = Object.keys(preferences)
    const invalidKeys = providedKeys.filter((key) => !validKeys.includes(key))

    if (invalidKeys.length > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: '유효하지 않은 알림 설정입니다.',
        },
        { status: 400 }
      )
    }

    // Merge with defaults
    const mergedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    }

    // In a real app, save to database
    // For now, just return the updated preferences
    // Example: await prisma.notificationPreference.upsert(...)

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_NOTIFICATION_PREFERENCES',
        entity: 'NotificationPreference',
        entityId: user.id,
        detail: mergedPreferences,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        preferences: mergedPreferences,
        message: '알림 설정이 변경되었습니다.',
      },
    })
  } catch (error) {
    console.error('Notification preferences update error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '알림 설정 변경 실패' },
      { status: 500 }
    )
  }
}
