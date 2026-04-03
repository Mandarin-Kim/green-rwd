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
  createdAt: string
  updatedAt: string
}

interface CreateSegmentRequest {
  name: string
  conditions: Record<string, unknown>
  description?: string
  tags?: string[]
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
      // 현재는 모든 활성 세그먼트 보기 가능
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
 * 새로운 세그먼트 생성
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

    // 세그먼트 생성
    const segment = await prisma.segment.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim(),
        filterJson: body.conditions,
        tags: body.tags || [],
        patientCount: 0,
        status: 'active',
      },
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

    const data: SegmentResponse = {
      ...segment,
      filterJson: segment.filterJson as Record<string, unknown>,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    }

    return success(data, undefined, 201)
  } catch (error) {
    console.error('[POST /api/segments] Error:', error)
    return serverError('세그먼트 생성 중 오류가 발생했습니다.')
  }
}
