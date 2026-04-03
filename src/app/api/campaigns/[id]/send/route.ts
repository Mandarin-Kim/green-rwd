import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser, ApiResponse } from '@/types'

// Cost per unit by channel (in KRW)
const CHANNEL_COSTS = {
  SMS: 50,
  LMS: 60,
  KAKAO: 70,
  EMAIL: 20,
  PUSH: 30,
}

export async function POST(
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

    // Fetch campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        segment: { select: { patientCount: true } },
        user: { select: { id: true, orgId: true } },
      },
    })

    if (!campaign) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Permission check: owner or admin
    if (
      user.role === 'SPONSOR' &&
      campaign.userId !== user.id
    ) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '발송 권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (user.role === 'CRA') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '발송 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Validation: campaign must be APPROVED
    if (campaign.status !== 'APPROVED') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '승인된 캠페인만 발송할 수 있습니다.' },
        { status: 400 }
      )
    }

    // Validation: must have segment with target count
    const targetCount = campaign.targetCount || campaign.segment?.patientCount || 0

    if (targetCount === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '타겟 고객이 없습니다.' },
        { status: 400 }
      )
    }

    // Calculate cost
    const costPerUnit =
      CHANNEL_COSTS[campaign.channelType as keyof typeof CHANNEL_COSTS] || 50
    const estimatedCost = targetCount * costPerUnit

    // Check org credit balance if needed
    if (campaign.user?.orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: campaign.user.orgId },
        select: { creditBalance: true },
      })

      if (!org || org.creditBalance < estimatedCost) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: '충분한 크레딧이 없습니다.' },
          { status: 400 }
        )
      }
    }

    // Create Sending record
    const sending = await prisma.sending.create({
      data: {
        campaignId: id,
        totalCount: targetCount,
        successCount: 0,
        failCount: 0,
        status: 'EXECUTING',
        channel: campaign.channelType,
        costPerUnit,
        totalCost: estimatedCost,
        executedAt: new Date(),
      },
    })

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: { status: 'EXECUTING' },
    })

    // Create analytics record if not exists
    const existingAnalytics = await prisma.campaignAnalytics.findUnique({
      where: { campaignId: id },
    })

    if (!existingAnalytics) {
      await prisma.campaignAnalytics.create({
        data: {
          campaignId: id,
          totalSent: targetCount,
          totalCost: estimatedCost,
        },
      })
    } else {
      await prisma.campaignAnalytics.update({
        where: { campaignId: id },
        data: {
          totalSent: { increment: targetCount },
          totalCost: { increment: estimatedCost },
        },
      })
    }

    // Deduct credit from organization (if applicable)
    if (campaign.user?.orgId) {
      await prisma.organization.update({
        where: { id: campaign.user.orgId },
        data: {
          creditBalance: { decrement: estimatedCost },
        },
      })

      // Create credit transaction record
      await prisma.creditTransaction.create({
        data: {
          orgId: campaign.user.orgId,
          type: 'SPEND',
          amount: estimatedCost,
          balance: 0, // Will be updated by trigger or manually
          description: `캠페인 발송: ${campaign.name}`,
          reference: id,
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SEND',
        entity: 'CAMPAIGN',
        entityId: id,
        detail: {
          campaignName: campaign.name,
          targetCount,
          estimatedCost,
          channel: campaign.channelType,
        },
      },
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'CAMPAIGN_SENT',
        title: '캠페인 발송 시작',
        message: `"${campaign.name}" 캠페인 발송이 시작되었습니다.`,
        link: `/campaigns/${id}`,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          sending,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: 'EXECUTING',
          },
          cost: {
            targetCount,
            costPerUnit,
            estimatedTotal: estimatedCost,
            currency: 'KRW',
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '캠페인 발송 실패' },
      { status: 500 }
    )
  }
}
