import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import {
  success,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api-response'

/**
 * GET /api/segments/[id]/versions
 * 세그먼트 버전 이력 조회
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
        currentVersion: true,
      },
    })

    if (!segment) {
      return notFound('세그먼트를 찾을 수 없습니다.')
    }

    // SegmentVersion 모델에서 버전 이력 조회
    const segmentWithVersions = await prisma.segment.findUnique({
      where: { id: params.id },
      select: {
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

    const versions = segmentWithVersions?.versions || []

    return success({
      segmentId: segment.id,
      segmentName: segment.name,
      currentVersion: segment.currentVersion,
      versions: versions.map((v: { id: string; version: number; filterJson: unknown; patientCount: number; changeNote: string | null; createdAt: Date }) => ({
        ...v,
        filterJson: v.filterJson as Record<string, unknown>,
        createdAt: v.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error(`[GET /api/segments/${params.id}/versions] Error:`, error)
    return serverError('버전 이력 조회 중 오류가 발생했습니다.')
  }
}
