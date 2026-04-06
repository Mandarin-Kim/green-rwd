import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser, ApiResponse } from '@/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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
    const { id } = params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        segment: {
          select: { id: true, name: true, patientCount: true },
        },
        analytics: true,
        sendings: {
          select: {
            id: true,
            status: true,
            totalCount: true,
            successCount: true,
            failCount: true,
            totalCost: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!campaign) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Role-based access control
    if (
      user.role === 'SPONSOR' &&
      campaign.userId !== user.id
    ) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (user.role === 'CRA' && !['EXECUTING', 'COMPLETED'].includes(campaign.status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: campaign,
    })
  } catch (error) {
    console.error('Campaign detail error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '캠페인 조회 실패' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
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
    const { id } = params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { userId: true, status: true, targetCount: true, channelType: true },
    })

    if (!campaign) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Permission check: owner or admin
    if (user.role !== 'ADMIN' && campaign.userId !== user.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '수정 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      status,
      rejectionReason,
      name,
      channelType,
      description,
      objective,
      segmentId,
      scheduledAt,
      contentTitle,
      contentBody,
      abTestEnabled,
    } = body

    // Status change flow (for ADMIN only)
    if (status !== undefined) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: '상태 변경 권한이 없습니다.' },
          { status: 403 }
        )
      }

      // Allow status transitions from PENDING_APPROVAL
      if (campaign.status !== 'PENDING_APPROVAL') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: '승인 대기 상태의 캠페인만 상태를 변경할 수 있습니다.' },
          { status: 400 }
        )
      }

      // Validate allowed status transitions
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: '허용되지 않는 상태입니다.' },
          { status: 400 }
        )
      }

      const updateData: any = { status }

      if (status === 'REJECTED') {
        updateData.rejectionReason = rejectionReason || '승인 반려'
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { name: true, email: true } },
          analytics: true,
        },
      })

      // Create Sending record if status changed to APPROVED
      if (status === 'APPROVED') {
        await prisma.sending.create({
          data: {
            campaignId: id,
            totalCount: campaign.targetCount || 0,
            channel: campaign.channelType || 'SMS',
            status: 'PENDING',
          },
        })
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: updatedCampaign,
      })
    }

    // Content edit flow (for DRAFT campaigns)
    if (campaign.status !== 'DRAFT') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '초안 상태의 캠페인만 수정할 수 있습니다.' },
        { status: 400 }
      )
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(channelType && { channelType }),
        ...(description !== undefined && { description }),
        ...(objective !== undefined && { objective }),
        ...(segmentId !== undefined && { segmentId }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(contentTitle !== undefined && { contentTitle }),
        ...(contentBody !== undefined && { contentBody }),
        ...(abTestEnabled !== undefined && { abTestEnabled }),
      },
      include: {
        user: { select: { name: true, email: true } },
        analytics: true,
      },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedCampaign,
    })
  } catch (error) {
    console.error('Campaign update error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '캠페인 수정 실패' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
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
    const { id } = params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { userId: true, status: true },
    })

    if (!campaign) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Permission check: owner or admin
    if (user.role !== 'ADMIN' && campaign.userId !== user.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '삭제 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Can only delete DRAFT status campaigns
    if (campaign.status !== 'DRAFT') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '초안 상태의 캠페인만 삭제할 수 있습니다.' },
        { status: 400 }
      )
    }

    // Soft delete by changing status
    const deletedCampaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: deletedCampaign,
    })
  } catch (error) {
    console.error('Campaign deletion error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '캠페인 삭제 실패' },
      { status: 500 }
    )
  }
}
