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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const phase = url.searchParams.get('phase')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    const skip = (page - 1) * PAGE_SIZE

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {}

    if (phase) {
      whereCondition.phase = phase
    }

    if (status) {
      whereCondition.status = status
    }

    if (search) {
      whereCondition.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { protocolNumber: { contains: search, mode: 'insensitive' } },
        { sponsorName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await prisma.study.count({ where: whereCondition })

    // Get studies with enrollment progress
    const studies = (await prisma.study.findMany({
      where: whereCondition,
      select: {
        id: true,
        protocolNumber: true,
        title: true,
        phase: true,
        status: true,
        sponsorName: true,
        indication: true,
        targetEnrollment: true,
        currentEnrollment: true,
        startDate: true,
        endDate: true,
        sites: {
          select: {
            id: true,
            name: true,
            targetCount: true,
            enrolledCount: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    })) as Array<{
      id: string
      protocolNumber: string
      title: string
      phase: string | null
      status: string
      sponsorName: string | null
      indication: string | null
      targetEnrollment: number
      currentEnrollment: number
      startDate: Date | null
      endDate: Date | null
      sites: Array<{ id: string; name: string; targetCount: number; enrolledCount: number }>
      createdAt: Date
      updatedAt: Date
    }>

    // Add enrollment progress
    const studiesWithProgress = studies.map((study) => ({
      ...study,
      enrollmentProgress: {
        target: study.targetEnrollment,
        enrolled: study.currentEnrollment,
        percentage:
          study.targetEnrollment > 0
            ? Math.round((study.currentEnrollment / study.targetEnrollment) * 100)
            : 0,
      },
    }))

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: studiesWithProgress,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Studies list error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '임상시험 목록 조회 실패' },
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

    // Only ADMIN and SPONSOR can create studies
    if (!['ADMIN', 'SPONSOR'].includes(user.role)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '임상시험 생성 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { protocolNumber, title, phase, sponsorName, indication, targetEnrollment } = body

    // Validation
    if (!protocolNumber || !title) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '필수 항목을 입력해주세요.' },
        { status: 400 }
      )
    }

    // Check if protocol number already exists
    const existing = await prisma.study.findUnique({
      where: { protocolNumber },
    })

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '이미 존재하는 프로토콜 번호입니다.' },
        { status: 409 }
      )
    }

    // Create study
    const study = await prisma.study.create({
      data: {
        protocolNumber,
        title,
        phase: phase || undefined,
        sponsorName: sponsorName || undefined,
        indication: indication || undefined,
        targetEnrollment: targetEnrollment || 0,
        status: 'PLANNING',
      },
      include: {
        sites: true,
      },
    })

    return NextResponse.json<ApiResponse>({ success: true, data: study }, { status: 201 })
  } catch (error) {
    console.error('Study creation error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '임상시험 생성 실패' },
      { status: 500 }
    )
  }
}
