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

interface ReportOrderDetailResponse {
  id: string
  catalogId: string
  catalogTitle: string
  userId: string
  orgId?: string | null
  tier: string
  price: number
  status: string
  progress: number
  customPrompt?: string | null
  generatedUrl?: string | null
  errorMessage?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

interface UpdateReportOrderRequest {
  status?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress?: number
  errorMessage?: string | null
  generatedUrl?: string | null
}

/**
 * GET /api/reports/orders/[id]
 * 리포트 주문 상세 조회
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

    const order = await prisma.reportOrder.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        catalogId: true,
        catalog: { select: { title: true } },
        userId: true,
        orgId: true,
        tier: true,
        price: true,
        status: true,
        progress: true,
        customPrompt: true,
        generatedUrl: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!order) {
      return notFound('주문을 찾을 수 없습니다.')
    }

    // 역할별 접근 제어
    if (user.role === 'SPONSOR' && order.userId !== user.id) {
      return forbidden('다른 사용자의 주문을 조회할 수 없습니다.')
    }

    const data: ReportOrderDetailResponse = {
      id: order.id,
      catalogId: order.catalogId,
      catalogTitle: order.catalog.title,
      userId: order.userId,
      orgId: order.orgId,
      tier: order.tier,
      price: order.price,
      status: order.status,
      progress: order.progress,
      customPrompt: order.customPrompt,
      generatedUrl: order.generatedUrl,
      errorMessage: order.errorMessage,
      startedAt: order.startedAt?.toISOString(),
      completedAt: order.completedAt?.toISOString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }

    return success(data)
  } catch (error) {
    console.error(`[GET /api/reports/orders/${params.id}] Error:`, error)
    return serverError('주문 조회 중 오류가 발생했습니다.')
  }
}

/**
 * PUT /api/reports/orders/[id]
 * 리포트 주문 상태 업데이트 (ADMIN만)
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

    // ADMIN만 주문 상태 수정 가능
    if (user.role !== 'ADMIN') {
      return forbidden('주문 상태를 수정할 수 있는 권한이 없습니다.')
    }

    const order = await prisma.reportOrder.findUnique({
      where: { id: params.id },
    })

    if (!order) {
      return notFound('주문을 찾을 수 없습니다.')
    }

    const body: UpdateReportOrderRequest = await req.json()

    // 상태 유효성 검사
    if (
      body.status &&
      !['PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(
        body.status
      )
    ) {
      return badRequest('유효하지 않은 상태입니다.')
    }

    // 상태 전이 유효성 검사
    const validTransitions: Record<string, string[]> = {
      PENDING: ['GENERATING', 'CANCELLED'],
      GENERATING: ['COMPLETED', 'FAILED', 'CANCELLED'],
      COMPLETED: [],
      FAILED: ['GENERATING'],
      CANCELLED: [],
    }

    if (body.status && !validTransitions[order.status]?.includes(body.status)) {
      return badRequest(
        `상태를 ${order.status}에서 ${body.status}로 변경할 수 없습니다.`
      )
    }

    // 업데이트 데이터 준비
    const updateData: Record<string, unknown> = {}
    if (body.status) {
      updateData.status = body.status
      if (body.status === 'GENERATING' && !order.startedAt) {
        updateData.startedAt = new Date()
      }
      if (
        ['COMPLETED', 'FAILED', 'CANCELLED'].includes(body.status) &&
        !order.completedAt
      ) {
        updateData.completedAt = new Date()
      }
    }
    if (body.progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, body.progress))
    }
    if (body.errorMessage !== undefined) {
      updateData.errorMessage = body.errorMessage
    }
    if (body.generatedUrl !== undefined) {
      updateData.generatedUrl = body.generatedUrl
    }

    const updated = await prisma.reportOrder.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        catalogId: true,
        catalog: { select: { title: true } },
        userId: true,
        orgId: true,
        tier: true,
        price: true,
        status: true,
        progress: true,
        customPrompt: true,
        generatedUrl: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const data: ReportOrderDetailResponse = {
      id: updated.id,
      catalogId: updated.catalogId,
      catalogTitle: updated.catalog.title,
      userId: updated.userId,
      orgId: updated.orgId,
      tier: updated.tier,
      price: updated.price,
      status: updated.status,
      progress: updated.progress,
      customPrompt: updated.customPrompt,
      generatedUrl: updated.generatedUrl,
      errorMessage: updated.errorMessage,
      startedAt: updated.startedAt?.toISOString(),
      completedAt: updated.completedAt?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }

    return success(data)
  } catch (error) {
    console.error(`[PUT /api/reports/orders/${params.id}] Error:`, error)
    return serverError('주문 업데이트 중 오류가 발생했습니다.')
  }
}
