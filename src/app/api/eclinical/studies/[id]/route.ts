import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser } from '@/types'

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { id } = context.params

    // Get study detail with sites and enrollment data
    const study = await prisma.study.findUnique({
      where: { id },
      include: {
        sites: {
          select: {
            id: true,
            name: true,
            code: true,
            piName: true,
            address: true,
            targetCount: true,
            enrolledCount: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        ecrfTemplates: {
          select: {
            id: true,
            name: true,
            version: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!study) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '임상시험을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Type cast for study
    const typedStudy = study as {
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
      createdAt: Date
      updatedAt: Date
      sites: Array<{
        id: string
        name: string
        code: string
        piName: string | null
        address: string | null
        targetCount: number
        enrolledCount: number
        status: string
        createdAt: Date
        updatedAt: Date
      }>
      ecrfTemplates: Array<{
        id: string
        name: string
        version: string
        isPublished: boolean
        createdAt: Date
        updatedAt: Date
      }>
    }

    // Calculate enrollment summary
    const enrollmentProgress = {
      target: typedStudy.targetEnrollment,
      enrolled: typedStudy.currentEnrollment,
      bysite: typedStudy.sites.map((site) => ({
        siteId: site.id,
        siteName: site.name,
        target: site.targetCount,
        enrolled: site.enrolledCount,
        percentage:
          site.targetCount > 0 ? Math.round((site.enrolledCount / site.targetCount) * 100) : 0,
      })),
      percentage:
        typedStudy.targetEnrollment > 0
          ? Math.round((typedStudy.currentEnrollment / typedStudy.targetEnrollment) * 100)
          : 0,
    }

    const response = {
      ...typedStudy,
      enrollmentProgress,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('Study detail fetch error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '임상시험 상세 조회 실패' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = session.user as SessionUser

    // Only ADMIN and SPONSOR can update studies
    if (!['ADMIN', 'SPONSOR'].includes(user.role)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '임상시험 수정 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { id } = context.params
    const body = await request.json()

    // Check study exists
    const study = await prisma.study.findUnique({
      where: { id },
    })

    if (!study) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '임상시험을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    const allowedFields = [
      'title',
      'phase',
      'status',
      'sponsorName',
      'indication',
      'targetEnrollment',
      'currentEnrollment',
      'startDate',
      'endDate',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'startDate' || field === 'endDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null
        } else {
          updateData[field] = body[field]
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '변경할 항목이 없습니다.' },
        { status: 400 }
      )
    }

    // Update study
    const updatedStudy = await prisma.study.update({
      where: { id },
      data: updateData,
      include: {
        sites: true,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_STUDY',
        entity: 'Study',
        entityId: id,
        detail: updateData,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedStudy,
    })
  } catch (error) {
    console.error('Study update error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '임상시험 수정 실패' },
      { status: 500 }
    )
  }
}
