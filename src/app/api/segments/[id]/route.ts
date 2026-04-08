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
  catalogSlug?: string | null
  sourceMonth?: string | null
  currentVersion: number
  createdAt: string
  updatedAt: string
}

interface UpdateSegmentRequest {
  name?: string
  description?: string
  conditions?: Record<string, unknown>
  tags?: string[]
  changeNote?: string
  patientCount?: number
}

/**
 * GET /api/segments/[id]
 * 세그먼트 상세 조회 (버전 이력 포함)
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
        catalogSlug: true,
        sourceMonth: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            filterJson: true,
            patientCount: true,
            changeNote: true,
            createdAt: true,
          },
        },
      },
    })

    if (!segment) {
      return notFound('세그먼트를 찾을 수 없습니다.')
    }

    return success({
      ...segment,
      filterJson: segment.filterJson as Record<string, unknown>,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
      versions: segment.versions.map((v: { id: string; version: number; filterJson: unknown; patientCount: number; changeNote: string | null; createdAt: Date }) => ({
        ...v,
        filterJson: v.filterJson as Record<string, unknown>,
        createdAt: v.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error(`[GET /api/segments/${params.id}] Error:`, error)
    return serverError('세그먼트 조회 중 오류가 발생했습니다.')
  }
}

/**
 * PUT /api/segments/[id]
 * 세그먼트 업데이트 → 새 버전 생성 (버저닝 적용)
 * 필터가 변경되면 새로운 SegmentVersion이 생성됨
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

    // SPONSOR, ADMIN 모두 수정 가능
    if (!['SPONSOR', 'ADMIN'].includes(user.role)) {
      return forbidden('세그먼트를 수정할 수 있는 권한이 없습니다.')
    }

    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
    })

    if (!segment) {
      return notFound('세그먼트를 찾을 수 없습니다.')
    }

    const body: UpdateSegmentRequest = await req.json()

    // conditions(필터)가 변경되면 → 새 버전 생성
    if (body.conditions) {
      const newVersion = segment.currentVersion + 1

      const result = await prisma.$transaction(async (tx: any) => {
        // 새 버전 레코드 생성
        const version = await tx.segmentVersion.create({
          data: {
            segmentId: segment.id,
            version: newVersion,
            filterJson: body.conditions!,
            patientCount: body.patientCount || 0,
            changeNote: body.changeNote || `v${newVersion} 필터 수정`,
          },
        })

        // 세그먼트 본체 업데이트 (최신 필터 + 버전번호)
        const updated = await tx.segment.update({
          where: { id: params.id },
          data: {
            ...(body.name !== undefined && { name: body.name.trim() }),
            ...(body.description !== undefined && { description: body.description?.trim() || null }),
            filterJson: body.conditions!,
            ...(body.tags !== undefined && { tags: body.tags }),
            ...(body.patientCount !== undefined && { patientCount: body.patientCount }),
            currentVersion: newVersion,
          },
          select: {
            id: true,
            name: true,
            description: true,
            filterJson: true,
            patientCount: true,
            tags: true,
            status: true,
            catalogSlug: true,
            sourceMonth: true,
            currentVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        return { updated, version }
      })

      return success({
        ...result.updated,
        filterJson: result.updated.filterJson as Record<string, unknown>,
        createdAt: result.updated.createdAt.toISOString(),
        updatedAt: result.updated.updatedAt.toISOString(),
        newVersion: {
          id: result.version.id,
          version: result.version.version,
          changeNote: result.version.changeNote,
          createdAt: result.version.createdAt.toISOString(),
        },
      })
    }

    // conditions 변경이 없으면 메타데이터만 업데이트 (버전 생성 없음)
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.tags !== undefined) updateData.tags = body.tags

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
        catalogSlug: true,
        sourceMonth: true,
        currentVersion: true,
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
