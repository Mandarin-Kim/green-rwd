import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/api-response'

interface SegmentDetailResponse {
  id: string
  name: string
  description?: string | null
  filterJson: Record<string, unknown>
  patientCount: number
  tags: string[]
  status: string
  createdAt: string
  updatedAt: string
}

interface UpdateSegmentRequest {
  name?: string
  description?: string
  conditions?: Record<string, unknown>
  tags?: string[]
}

/**
 * GET /api/segments/[id]
 * 세그먼트 상세 조회
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

    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        filterJson: true,
        patientCount: true,
        tags: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!segment) {
      return notFound('세그먼트를 찾을 수 없습니다.')
    }

    const data: SegmentDetailResponse = {
      ...segment,
      filterJson: segment.filterJson as Record<string, unknown>,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    }

    return success(data)
  } catch (error) {
    console.error(`[GET /api/segments/${params.id}] Error:`, error)
    return serverError('세그먼트 조회 중 오류가 발생했습니다.')
  }
}

/**
 * PUT /api/segments/[id]
 * 세그먼트 업데이트 (소유자/관리자만)
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

    // 권한 확인: ADMIN만 가능 (향후 segment owner 추가 시 수정)
    if (user.role !== 'ADMIN') {
      return forbidden('세그먼트를 수정할 수 있는 권한이 없습니다.')
    }

    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
    })

    if (!segment) {
      return notFound('세그먼트를 찾을 수 없습니다.')
    }

    const body: UpdateSegmentRequest = await req.json()

    // 업데이트 데이터 준비
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }
    if (body.conditions !== undefined) {
      updateData.filterJson = body.conditions
    }
    if (body.tags !== undefined) {
      updateData.tags = body.tags
    }

    const updated = await prisma.segment.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        filterJson: true,
        patientCount: true,
        tags: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const data: SegmentDetailResponse = {
      ...updated,
      filterJson: updated.filterJson as Record<string, unknown>,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }

    return success(data)
  } catch (error) {
    console.error(`[PUT /api/segments/${params.id}] Error:`, error)
    return serverError('세그먼트 수정 중 오류가 발생했습니다.')
  }
}

/**
 * DELETE /api/segments/[id]
 * 세그먼트 삭제 (소유자/관리자, 활성 캠페인에 미사용 시에만)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    // 권한 확인: ADMIN만 가능
    if (user.role !== 'ADMIN') {
      return forbidden('세그먼트를 삭제할 수 있는 권한이 없습니다.')
    }

    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
      include: {
        campaigns: {
          where: {
            status: {
              in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'EXECUTING'],
            },
          },
          select: { id: true },
        },
      },
    })

    if (!segment) {
      return notFound('세그먼트를 찾을 수 없습니다.')
    }

    // 활성 캠페인에서 사용 중인지 확인
    if (segment.campaigns.length > 0) {
      return forbidden(
        `세그먼트가 ${segment.campaigns.length}개의 활성 캠페인에서 사용 중입니다. 삭제할 수 없습니다.`
      )
    }

    await prisma.segment.delete({
      where: { id: params.id },
    })

    return success({ id: params.id, deleted: true })
  } catch (error) {
    console.error(`[DELETE /api/segments/${params.id}] Error:`, error)
    return serverError('세그먼트 삭제 중 오류가 발생했습니다.')
  }
}
