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

    // Fetch campaign with analytics
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
        analytics: true,
        sendings: {
          select: {
            status: true,
            totalCount: true,
            successCount: true,
            failCount: true,
            totalCost: true,
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Permission check
    if (
      user.role === 'SPONSOR' &&
      campaign.userId !== user.id
    ) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (user.role === 'CRA') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '분석 데이터 조회 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const analytics = campaign.analytics || {
      id: '',
      campaignId: id,
      totalSent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      bounced: 0,
      unsubscribed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0,
      totalCost: 0,
      costPerConvert: 0,
      dailyStats: null,
      hourlyStats: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Calculate derived metrics
    const sent = analytics.totalSent || 0
    const delivered = analytics.delivered || 0
    const opened = analytics.opened || 0
    const clicked = analytics.clicked || 0
    const converted = analytics.converted || 0
    const bounced = analytics.bounced || 0
    const unsubscribed = analytics.unsubscribed || 0

    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0
    const conversionRate = clicked > 0 ? (converted / clicked) * 100 : 0
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0
    const unsubscribeRate = delivered > 0 ? (unsubscribed / delivered) * 100 : 0

    const costPerConvert = converted > 0 ? analytics.totalCost / converted : 0

    const responseData = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      metrics: {
        sent: {
          count: sent,
          label: '발송',
        },
        delivered: {
          count: delivered,
          rate: deliveryRate.toFixed(2),
          label: '배달',
        },
        opened: {
          count: opened,
          rate: openRate.toFixed(2),
          label: '오픈',
        },
        clicked: {
          count: clicked,
          rate: clickRate.toFixed(2),
          label: '클릭',
        },
        converted: {
          count: converted,
          rate: conversionRate.toFixed(2),
          label: '전환',
        },
        bounced: {
          count: bounced,
          rate: bounceRate.toFixed(2),
          label: '반송',
        },
        unsubscribed: {
          count: unsubscribed,
          rate: unsubscribeRate.toFixed(2),
          label: '수신거부',
        },
      },
      financial: {
        totalCost: analytics.totalCost,
        costPerConvert: costPerConvert.toFixed(2),
      },
      funnel: [
        { name: '발송', value: sent },
        { name: '배달', value: delivered },
        { name: '오픈', value: opened },
        { name: '클릭', value: clicked },
        { name: '전환', value: converted },
      ],
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('Campaign analytics error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '분석 데이터 조회 실패' },
      { status: 500 }
    )
  }
}
