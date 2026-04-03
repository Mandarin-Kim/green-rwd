import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from '@/lib/api-response'

interface SendingDetailResponse {
  id: string
  campaignId: string
  campaignName: string
  totalCount: number
  successCount: number
  failCount: number
  status: string
  channel: string
  costPerUnit: number
  totalCost: number
  approvedBy?: string | null
  approvedAt?: string | null
  executedAt?: string | null
  completedAt?: string | null
  deliveryRate: number
  successRate: number
  createdAt: string
  updatedAt: string
}

interface UpdateSendingRequest {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'READY' | 'EXECUTING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
}

/**
 * GET /api/sending/[id]
 * 발송 상세 조회 (배송 통계 포함)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    const sending = await prisma.sending.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        campaignId: true,
        campaign: { select: { name: true, userId: true } },
        totalCount: true,
        successCount: true,
        failCount: true,
        status: true,
        channel: true,
        costPerUnit: true,
        totalCost: true,
        approvedBy: true,
        approvedAt: true,
        executedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!sending) {
      return notFound('발송을 찾을 수 없습니다.')
    }

    // 역할별 접근 제어
    if (user.role === 'SPONSOR' && sending.campaign.userId !== user.id) {
      return forbidden('다른 사용자의 발송을 조회할 수 없습니다.')
    }

    // 통계 계산
    const deliveryCount = sending.successCount + sending.failCount
    const deliveryRate =
      deliveryCount > 0 ? (sending.successCount / deliveryCount) * 100 : 0
    const successRate = sending.totalCount > 0
      ? (sending.successCount / sending.totalCount) * 100
      : 0

    const data: SendingDetailResponse = {
      id: sending.id,
      campaignId: sending.campaignId,
      campaignName: sending.campaign.name,
      totalCount: sending.totalCount,
      successCount: sending.successCount,
      failCount: sending.failCount,
      status: sending.status,
      channel: sending.channel,
      costPerUnit: sending.costPerUnit,
      totalCost: sending.totalCost,
      approvedBy: sending.approvedBy,
      approvedAt: sending.approvedAt?.toISOString(),
      executedAt: sending.executedAt?.toISOString(),
      completedAt: sending.completedAt?.toISOString(),
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      createdAt: sending.createdAt.toISOString(),
      updatedAt: sending.updatedAt.toISOString(),
    }

    return success(data)
  } catch (error) {
    console.error(`[GET /api/sending/${params.id}] Error:`, error)
    return serverError('발송 조회 중 오류가 발생했습니다.')
  }
}

/**
 * PUT /api/sending/[id]
 * 발송 상태 업데이트 (승인/거절/일시중지/재개)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    const sending = await prisma.sending.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        campaign: { select: { userId: true } },
      },
    })

    if (!sending) {
      return notFound('발송을 찾을 수 없습니다.')
    }

    // 역할별 권한 확인
    if (user.role === 'SPONSOR' && sending.campaign.userId !== user.id) {
      return forbidden('다른 사용자의 발송을 수정할 수 없습니다.')
    }

    const body: UpdateSendingRequest = await req.json()

    if (!body.status) {
      return badRequest('status는 필수입니다.')
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'READY', 'EXECUTING', 'PAUSED', 'COMPLETED', 'FAILED']
    if (!validStatuses.includes(body.status)) {
      return badRequest('유효하지 않은 상태입니다.')
    }

    // 상태 전이 유효성 검사
    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['READY', 'REJECTED'],
      REJECTED: [],
      READY: ['EXECUTING', 'PAUSED'],
      EXECUTING: ['PAUSED', 'COMPLETED', 'FAILED'],
      PAUSED: ['EXECUTING', 'CANCELLED'],
      COMPLETED: [],
      FAILED: [],
    }

    if (!validTransitions[sending.status]?.includes(body.status)) {
      return badRequest(
        `상태를 ${sending.status}에서 ${body.status}로 변경할 수 없습니다.`
      )
    }

    // ADMIN만 승인 가능
    if (body.status === 'APPROVED' && user.role !== 'ADMIN') {
      return forbidden('발송 승인은 관리자만 가능합니다.')
    }

    // 업데이트 데이터 준비
    const updateData: Record<string, unknown> = {
      status: body.status,
    }

    if (body.status === 'APPROVED') {
      updateData.approvedBy = user.id
      updateData.approvedAt = new Date()
    }

    if (body.status === 'EXECUTING' && !sending) {
      updateData.executedAt = new Date()
    }

    if (
      ['COMPLETED', 'FAILED'].includes(body.status) &&
      sending.status !== 'COMPLETED'
    ) {
      updateData.completedAt = new Date()
    }

    const updated = await prisma.sending.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        campaignId: true,
        campaign: { select: { name: true, userId: true } },
        totalCount: true,
        successCount: true,
        failCount: true,
        status: true,
        channel: true,
        costPerUnit: true,
        totalCost: true,
        approvedBy: true,
        approvedAt: true,
        executedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // 통계 계산
    const deliveryCount = updated.successCount + updated.failCount
    const deliveryRate =
      deliveryCount > 0 ? (updated.successCount / deliveryCount) * 100 : 0
    const successRate = updated.totalCount > 0
      ? (updated.successCount / updated.totalCount) * 100
      : 0

    const data: SendingDetailResponse = {
      id: updated.id,
      campaignId: updated.campaignId,
      campaignName: updated.campaign.name,
      totalCount: updated.totalCount,
      successCount: updated.successCount,
      failCount: updated.failCount,
      status: updated.status,
      channel: updated.channel,
      costPerUnit: updated.costPerUnit,
      totalCost: updated.totalCost,
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt?.toISOString(),
      executedAt: updated.executedAt?.toISOString(),
      completedAt: updated.completedAt?.toISOString(),
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }

    return success(data)
  } catch (error) {
    console.error(`[PUT /api/sending/${params.id}] Error:`, error)
    return serverError('발송 업데이트 중 오류가 발생했습니다.')
  }
}
