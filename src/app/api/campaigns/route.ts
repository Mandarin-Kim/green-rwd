import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser, ApiResponse } from '@/types'

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
    const status = url.searchParams.get('status')
    const channel = url.searchParams.get('channel')
    const search = url.searchParams.get('search')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const skip = (page - 1) * PAGE_SIZE

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {}

    // Role-based filtering
    if (user.role === 'SPONSOR') {
      whereCondition.userId = user.id
    } else if (user.role === 'CRA') {
      // CRA sees campaigns shared with them (simplified: all active campaigns)
      whereCondition.status = { in: ['EXECUTING', 'COMPLETED'] }
    } else if (user.role === 'ADMIN') {
      // ADMIN sees all
    } else {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Additional filters
    if (status) {
      whereCondition.status = status
    }

    if (channel) {
      whereCondition.channelType = channel
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
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
    const total = await prisma.campaign.count({ where: whereCondition })

    // Get campaigns
    const campaigns = await prisma.campaign.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        channelType: true,
        targetCount: true,
        scheduledAt: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        analytics: {
          select: {
            totalSent: true,
            delivered: true,
            opened: true,
            clicked: true,
            converted: true,
            conversionRate: true,
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
      data: campaigns,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Campaigns list error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '캠페인 목록 조회 실패' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = session.user as SessionUser

    // Only SPONSOR and ADMIN can create campaigns
    if (!['SPONSOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '캠페인 생성 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      channelType,
      description,
      objective,
      segmentId,
      scheduledAt,
    } = body

    // Validation
    if (!name || !channelType) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '필수 항목을 입력해주세요.' },
        { status: 400 }
      )
    }

    // Get user's org
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { orgId: true },
    })

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        channelType,
        description: description || undefined,
        objective: objective || undefined,
        segmentId: segmentId || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        userId: user.id,
        orgId: userRecord?.orgId || undefined,
        status: 'PENDING_APPROVAL',
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json<ApiResponse>(
      { success: true, data: campaign },
      { status: 201 }
    )
  } catch (error) {
    console.error('Campaign creation error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '캠페인 생성 실패' },
      { status: 500 }
    )
  }
}
