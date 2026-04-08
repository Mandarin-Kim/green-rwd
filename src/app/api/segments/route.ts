import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  paginate,
} from '@/lib/api-response'

interface SegmentListItem {
  id: string
  name: string
  description?: string | null
  patientCount: number
  tags: string[]
  status: string
  catalogSlug?: string | null
  sourceMonth?: string | null
  currentVersion: number
  createdAt: string
  updatedAt: string
}

interface SegmentResponse {
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

interface CreateSegmentRequest {
  name: string
  conditions: Record<string, unknown>
  description?: string
  tags?: string[]
  catalogSlug?: string
  sourceMonth?: string
}

/**
 * GET /api/segments
 * 세그먼트 목록 조회 (페이지네이션, 검색)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const { page, pageSize, skip, take } = paginate(searchParams)
    const search = Array.isArray(searchParams.search)
      ? searchParams.search[0]
      : searchParams.search

    // 역할별 접근 제어
    const where: Record<string, unknown> = {}
    if (user.role === 'SPONSOR') {
      // SPONSOR는 자신의 세그먼트만 보기 (향후 segment owner 추가 시)
    }

    // 검색 필터
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 활성 세그먼트만 조회
    where.status = 'active'

    const [segments, total] = await Promise.all([
      prisma.segment.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          patientCount: true,
          tags: true,
          status: true,
          catalogSlug: true,
          sourceMonth: true,
          currentVersion: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.segment.count({ where }),
    ])

    const data: SegmentListItem[] = segments.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))

    return success(data, { page, pageSize, total })
  } catch (error) {
    console.error('[GET /api/segments] Error:', error)
    return serverError('세그먼트 목록 조회 중 오류가 발생했습니다.')
  }
}

/**
 * POST /api/segments
 * 새로운 세그먼트 생성 (같은 보고서+같은 월에는 1개만 허용)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    // SPONSOR와 ADMIN만 세그먼트 생성 가능
    if (!['SPONSOR', 'ADMIN'].includes(user.role)) {
      return forbidden('세그먼트를 생성할 수 있는 권한이 없습니다.')
    }

    const body: CreateSegmentRequest = await req.json()

    // 유효성 검사
    if (!body.name || !body.conditions) {
      return badRequest('필수 필드가 누락되었습니다.', {
        required: ['name', 'conditions'],
      })
    }

    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return badRequest('세그먼트 이름은 필수입니다.')
    }

    if (typeof body.conditions !== 'object') {
      return badRequest('conditions은 JSON 객체여야 합니다.')
    }

    // sourceMonth 자동 설정: 전달되지 않으면 현재 월 사용
    const sourceMonth = body.sourceMonth || new Date().toISOString().slice(0, 7)

    // ─── 중복 방지: 같은 보고서(catalogSlug) + 같은 월(sourceMonth)에 이미 존재하는지 확인 ───
    if (body.catalogSlug) {
      const existing = await prisma.segment.findUnique({
        where: {
          catalogSlug_sourceMonth: {
            catalogSlug: body.catalogSlug,
            sourceMonth: sourceMonth,
          },
        },
        select: {
          id: true,
          name: true,
          filterJson: true,
          patientCount: true,
          currentVersion: true,
          catalogSlug: true,
          sourceMonth: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
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

      if (existing) {
        // 이미 존재하는 세그먼트를 반환 (duplicate=true 플래그로 프론트엔드에서 구분)
        return success({
          ...existing,
          filterJson: existing.filterJson as Record<string, unknown>,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
          versions: existing.versions.map((v: { id: string; version: number; filterJson: unknown; patientCount: number; changeNote: string | null; createdAt: Date }) => ({
            ...v,
            filterJson: v.filterJson as Record<string, unknown>,
            createdAt: v.createdAt.toISOString(),
          })),
          duplicate: true,
          message: `이번 달(${sourceMonth})에 이미 동일 보고서에서 생성된 세그먼트가 있습니다. 기존 세그먼트를 수정하시면 새 버전이 생성됩니다.`,
        })
      }
    }

    // ─── 새 세그먼트 + 초기 버전(v1) 트랜잭션으로 동시 생성 ───
    const result = await prisma.$transaction(async (tx: any) => {
      const segment = await tx.segment.create({
        data: {
          name: body.name.trim(),
          description: body.description?.trim(),
          filterJson: body.conditions,
          tags: body.tags || [],
          patientCount: 0,
          status: 'active',
          catalogSlug: body.catalogSlug || null,
          sourceMonth: body.catalogSlug ? sourceMonth : null,
          currentVersion: 1,
        },
      })

      // 초기 버전 (v1) 생성
      const version = await tx.segmentVersion.create({
        data: {
          segmentId: segment.id,
          version: 1,
          filterJson: body.conditions,
          patientCount: 0,
          changeNote: '초기 세그먼트 생성',
        },
      })

      return { segment, version }
    })

    const data: SegmentResponse = {
      id: result.segment.id,
      name: result.segment.name,
      description: result.segment.description,
      filterJson: result.segment.filterJson as Record<string, unknown>,
      patientCount: result.segment.patientCount,
      tags: result.segment.tags,
      status: result.segment.status,
      catalogSlug: result.segment.catalogSlug,
      sourceMonth: result.segment.sourceMonth,
      currentVersion: result.segment.currentVersion,
      createdAt: result.segment.createdAt.toISOString(),
      updatedAt: result.segment.updatedAt.toISOString(),
    }

    return success(data, undefined, 201)
  } catch (error) {
    console.error('[POST /api/segments] Error:', error)
    return serverError('세그먼트 생성 중 오류가 발생했습니다.')
  }
}
