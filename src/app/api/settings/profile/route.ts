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

    // Get user profile
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        createdAt: true,
        org: {
          select: {
            id: true,
            name: true,
            bizNumber: true,
            plan: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: profile,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '프로필 조회 실패' },
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

    const { name, phone } = body

    // Validation
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '유효하지 않은 입력입니다.' },
        { status: 400 }
      )
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '유효하지 않은 입력입니다.' },
        { status: 400 }
      )
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    if (name !== undefined) {
      updateData.name = name
    }

    if (phone !== undefined) {
      updateData.phone = phone
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '변경할 항목이 없습니다.' },
        { status: 400 }
      )
    }

    // Update profile
    const updatedProfile = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedProfile,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '프로필 수정 실패' },
      { status: 500 }
    )
  }
}
