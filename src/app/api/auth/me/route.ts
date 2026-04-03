import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/me
 * Get current authenticated user information
 *
 * Response:
 * - 200: User information including organization
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function GET() {
  try {
    // Get session
    const session = await getAuthSession()

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // Get user ID from session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID를 찾을 수 없습니다' },
        { status: 401 }
      )
    }

    // Fetch full user data with organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            plan: true,
            creditBalance: true,
            bizNumber: true,
            createdAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 401 }
      )
    }

    // Return user data (exclude sensitive fields)
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt,
        organization: user.org,
      },
    })
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
