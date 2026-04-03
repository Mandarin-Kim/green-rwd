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

interface ApprovalResponse {
  id: string
  campaignId: string
  status: string
  approvedBy: string
  approvedAt: string
  message: string
}

/**
 * POST /api/sending/[id]/approve
 * 펀딩 요청 승인 (ADMIN/SPONSOR만)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    // ADMIN과 SPONSOR만 승인 가능
    if (!['ADMIN', 'SPONSOR'].includes(user.role)) {
      return forbidden('발송 승인 권한이 없습니다.')
    }

    const sending = await prisma.sending.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        campaignId: true,
        campaign: { select: { userId: true } },
      },
    })

    if (!sending) {
      return notFound('발송을 찾을 수 없습니다.')
    }

    // SPONSOR는 자신의 캠페인 발송만 승인 가능
    if (user.role === 'SPONSOR' && sending.campaign.userId !== user.id) {
      return forbidden('다른 사용자의 발송을 승인할 수 없습니다.')
    }

    // 상태 확인: PENDING 상태일 때만 승인 가능
    if (sending.status !== 'PENDING') {
      return badRequest(
        `${sending.status} 상태의 발송은 승인할 수 없습니다. PENDING 상태만 승인 가능합니다.`
      )
    }

    // 승인 처리
    const updated = await prisma.sending.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    })

    const data: ApprovalResponse = {
      id: updated.id,
      campaignId: updated.campaignId,
      status: updated.status,
      approvedBy: updated.approvedBy || '',
      approvedAt: updated.approvedAt?.toISOString() || '',
      message: '발송이 승인되었습니다.',
    }

    return success(data)
  } catch (error) {
    console.error(`[POST /api/sending/${params.id}/approve] Error:`, error)
    return serverError('발송 승인 중 오류가 발생했습니다.')
  }
}
