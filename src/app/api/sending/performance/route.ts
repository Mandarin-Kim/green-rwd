import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { success, unauthorized, serverError } from '@/lib/api-response'

interface ChannelStats {
  channel: string
  totalSent: number
  successCount: number
  failCount: number
  successRate: number
  totalCost: number
}

interface DailyTrendData {
  date: string
  sent: number
  success: number
  failed: number
}

interface PerformanceMetrics {
  period: string
  totalSent: number
  totalSuccess: number
  totalFailed: number
  overallSuccessRate: number
  overallDeliveryRate: number
  totalCost: number
  channelStats: ChannelStats[]
  dailyTrends: DailyTrendData[]
  topCampaigns: Array<{
    campaignId: string
    campaignName: string
    sent: number
    successCount: number
    successRate: number
  }>
}

/**
 * GET /api/sending/performance
 * 발송 성과 분석 (전체 메트릭, 채널별 통계, 일별 추이)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerSession(authOptions)
    if (!user?.user) {
      return unauthorized('로그인이 필요합니다.')
    }

    // 기간 파라미터 (기본값: 최근 30일)
    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const days = Array.isArray(searchParams.days)
      ? parseInt(searchParams.days[0], 10)
      : 30

    const validDays = Math.max(1, Math.min(365, days))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - validDays)

    // 발송 데이터 조회
    const sendings = await prisma.sending.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: {
          in: ['COMPLETED', 'EXECUTING', 'PAUSED'],
        },
      },
      select: {
        id: true,
        campaignId: true,
        campaign: { select: { name: true } },
        totalCount: true,
        successCount: true,
        failCount: true,
        channel: true,
        totalCost: true,
        createdAt: true,
      },
    })

    // 기본 통계 계산
    const totalSent = sendings.reduce((sum, s) => sum + s.totalCount, 0)
    const totalSuccess = sendings.reduce((sum, s) => sum + s.successCount, 0)
    const totalFailed = sendings.reduce((sum, s) => sum + s.failCount, 0)
    const totalCost = sendings.reduce((sum, s) => sum + s.totalCost, 0)

    const overallDelivered = totalSuccess + totalFailed
    const overallSuccessRate =
      overallDelivered > 0 ? (totalSuccess / overallDelivered) * 100 : 0
    const overallDeliveryRate = totalSent > 0 ? (overallDelivered / totalSent) * 100 : 0

    // 채널별 통계
    const channelStatsMap: Record<string, ChannelStats> = {}
    sendings.forEach((sending) => {
      const channel = sending.channel
      if (!channelStatsMap[channel]) {
        channelStatsMap[channel] = {
          channel,
          totalSent: 0,
          successCount: 0,
          failCount: 0,
          successRate: 0,
          totalCost: 0,
        }
      }
      channelStatsMap[channel].totalSent += sending.totalCount
      channelStatsMap[channel].successCount += sending.successCount
      channelStatsMap[channel].failCount += sending.failCount
      channelStatsMap[channel].totalCost += sending.totalCost
    })

    // 채널별 성공률 계산
    const channelStats = Object.values(channelStatsMap).map((cs) => ({
      ...cs,
      successRate:
        cs.successCount + cs.failCount > 0
          ? (cs.successCount / (cs.successCount + cs.failCount)) * 100
          : 0,
    }))

    // 일별 추이 계산
    const dailyStatsMap: Record<string, { sent: number; success: number; failed: number }> = {}

    sendings.forEach((sending) => {
      const dateKey = sending.createdAt.toISOString().split('T')[0]
      if (!dailyStatsMap[dateKey]) {
        dailyStatsMap[dateKey] = { sent: 0, success: 0, failed: 0 }
      }
      dailyStatsMap[dateKey].sent += sending.totalCount
      dailyStatsMap[dateKey].success += sending.successCount
      dailyStatsMap[dateKey].failed += sending.failCount
    })

    const dailyTrends = Object.entries(dailyStatsMap)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))

    // 캠페인 상위 성과
    const campaignStatsMap: Record<
      string,
      { id: string; name: string; sent: number; success: number }
    > = {}

    sendings.forEach((sending) => {
      if (!campaignStatsMap[sending.campaignId]) {
        campaignStatsMap[sending.campaignId] = {
          id: sending.campaignId,
          name: sending.campaign.name,
          sent: 0,
          success: 0,
        }
      }
      campaignStatsMap[sending.campaignId].sent += sending.totalCount
      campaignStatsMap[sending.campaignId].success += sending.successCount
    })

    const topCampaigns = Object.values(campaignStatsMap)
      .sort((a, b) => b.success - a.success)
      .slice(0, 5)
      .map((c) => ({
        campaignId: c.id,
        campaignName: c.name,
        sent: c.sent,
        successCount: c.success,
        successRate: c.sent > 0 ? (c.success / c.sent) * 100 : 0,
      }))

    const data: PerformanceMetrics = {
      period: `최근 ${validDays}일`,
      totalSent,
      totalSuccess,
      totalFailed,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      overallDeliveryRate: Math.round(overallDeliveryRate * 100) / 100,
      totalCost,
      channelStats: channelStats.map((cs) => ({
        ...cs,
        successRate: Math.round(cs.successRate * 100) / 100,
      })),
      dailyTrends,
      topCampaigns: topCampaigns.map((c) => ({
        ...c,
        successRate: Math.round(c.successRate * 100) / 100,
      })),
    }

    return success(data)
  } catch (error) {
    console.error('[GET /api/sending/performance] Error:', error)
    return serverError('성과 분석 조회 중 오류가 발생했습니다.')
  }
}
