import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  serverError,
  paginate,
} from '@/lib/api-response'

interface SendingListItem {
  id: string
  campaignId: string
  campaignName: string
  totalCount: number
  successCount: number
  failCount: number
  status: string
  channel: string
  totalCost: number
  createdAt: string
  updatedAt: string
}

interface CreateSendingRequest {
  campaignId: string
}

/**
 * GET /api/sending
 * 발송 목록 조회 (필터, 페이지네이션, 역할별 접근)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const { page, pageSize, skip, take } = paginate(searchParams)

    // 필터 파라미터
    const status = Array.isArray(searchParams.status)
      ? searchParams.status[0]
      : searchParams.status
    const campaignId = Array.isArray(searchParams.campaignId)
      ? searchParams.campaignId[0]
      : searchParams.campaignId

    const where: Record<string, unknown> = {}

    // 역할별 접근 제어
    if (user.role === 'SPONSOR') {
      // SPONSOR는 자신의 캠페인의 발송만 조회 가능
      where.campaign = {
        userId: user.id,
      }
    }
    // ADMIN은 모든 발송 조회 가능

    if (status) {
      where.status = status
    }

    if (campaignId) {
      where.campaignId = campaignId
    }

    const [sendings, total] = await Promise.all([
      prisma.sending.findMany({
        where,
        select: {
          id: true,
          campaignId: true,
          campaign: { select: { name: true } },
          totalCount: true,
          successCount: true,
          failCount: true,
          status: true,
          channel: true,
          totalCost: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sending.count({ where }),
    ])

    const data: SendingListItem[] = sendings.map((s) => ({
      id: s.id,
      campaignId: s.campaignId,
      campaignName: s.campaign.name,
      totalCount: s.totalCount,
      successCount: s.successCount,
      failCount: s.failCount,
      status: s.status,
      channel: s.channel,
      totalCost: s.totalCost,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))

    return success(data, { page, pageSize, total })
  } catch (error) {
    console.error('[GET /api/sending] Error:', error)
    return serverError('발송 목록 조회 중 오류가 발생했습니다.')
  }
}

/**
 * POST /api/sending
 * 새로운 발송 요청 생성 (캠페인 연결)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    // SPONSOR와 ADMIN만 발송 생성 가능
    if (!['SPONSOR', 'ADMIN'].includes(user.role)) {
      return forbidden('발송을 생성할 수 있는 권한이 없습니다.')
    }

    const body: CreateSendingRequest = await req.json()

    if (!body.campaignId) {
      return badRequest('campaignId는 필수입니다.')
    }

    // 캠페인 확인
    const campaign = await prisma.campaign.findUnique({
      where: { id: body.campaignId },
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
        targetCount: true,
        channelType: true,
      },
    })

    if (!campaign) {
      return notFound('캠페인을 찾을 수 없습니다.')
    }

    // 권한 확인: SPONSOR는 자신의 캠페인만 발송 가능
    if (user.role === 'SPONSOR' && campaign.userId !== user.id) {
      return forbidden('다른 사용자의 캠페인에 발송할 수 없습니다.')
    }

    // 캠페인 상태 확인: APPROVED 이상 상태일 때만 발송 가능
    if (!['APPROVED', 'SCHEDULED', 'EXECUTING'].includes(campaign.status)) {
      return badRequest('승인된 캠페인에서만 발송을 생성할 수 있습니다.')
    }

    // 발송 생성
    const sending = await prisma.sending.create({
      data: {
        campaignId: body.campaignId,
        totalCount: campaign.targetCount,
        channel: campaign.channelType,
        status: 'PENDING',
      },
      select: {
        id: true,
        campaignId: true,
        campaign: { select: { name: true } },
        totalCount: true,
        successCount: true,
        failCount: true,
        status: true,
        channel: true,
        totalCost: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const data: SendingListItem = {
      id: sending.id,
      campaignId: sending.campaignId,
      campaignName: sending.campaign.name,
      totalCount: sending.totalCount,
      successCount: sending.successCount,
      failCount: sending.failCount,
      status: sending.status,
      channel: sending.channel,
      totalCost: sending.totalCost,
      createdAt: sending.createdAt.toISOString(),
      updatedAt: sending.updatedAt.toISOString(),
    }

    return success(data, undefined, 201)
  } catch (error) {
    console.error('[POST /api/sending] Error:', error)
    return serverError('발송 생성 중 오류가 발생했습니다.')
  }
}
