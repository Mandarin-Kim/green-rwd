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

interface ReportOrderItem {
  id: string
  catalogId: string
  catalogTitle: string
  userId: string
  orgId?: string | null
  tier: string
  price: number
  status: string
  progress: number
  generatedUrl?: string | null
  createdAt: string
  updatedAt: string
}

interface CreateReportOrderRequest {
  catalogId: string
  tier: 'BASIC' | 'PRO' | 'PREMIUM'
  customPrompt?: string
}

interface PriceMap {
  BASIC: number
  PRO: number
  PREMIUM: number
}

/**
 * GET /api/reports/orders
 * 사용자의 리포트 주문 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const { page, pageSize, skip, take } = paginate(searchParams)

    // 상태 필터
    const status = Array.isArray(searchParams.status)
      ? searchParams.status[0]
      : searchParams.status

    const where: Record<string, unknown> = {}

    // 역할별 접근 제어
    if (user.role === 'SPONSOR') {
      where.userId = user.id
    }
    // ADMIN은 모든 주문 조회 가능

    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      prisma.reportOrder.findMany({
        where,
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
          generatedUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reportOrder.count({ where }),
    ])

    const data: ReportOrderItem[] = orders.map((o) => ({
      id: o.id,
      catalogId: o.catalogId,
      catalogTitle: o.catalog.title,
      userId: o.userId,
      orgId: o.orgId,
      tier: o.tier,
      price: o.price,
      status: o.status,
      progress: o.progress,
      generatedUrl: o.generatedUrl,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }))

    return success(data, { page, pageSize, total })
  } catch (error) {
    console.error('[GET /api/reports/orders] Error:', error)
    return serverError('리포트 주문 목록 조회 중 오류가 발생했습니다.')
  }
}

/**
 * POST /api/reports/orders
 * 새로운 리포트 주문 생성
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    // SPONSOR와 ADMIN만 주문 생성 가능
    if (!['SPONSOR', 'ADMIN'].includes(user.role)) {
      return forbidden('리포트를 주문할 수 있는 권한이 없습니다.')
    }

    const body: CreateReportOrderRequest = await req.json()

    // 유효성 검사
    if (!body.catalogId || !body.tier) {
      return badRequest('필수 필드가 누락되었습니다.', {
        required: ['catalogId', 'tier'],
      })
    }

    if (!['BASIC', 'PRO', 'PREMIUM'].includes(body.tier)) {
      return badRequest('유효하지 않은 tier 값입니다.')
    }

    // 카탈로그 조회
    const catalog = await prisma.reportCatalog.findUnique({
      where: { id: body.catalogId },
    })

    if (!catalog) {
      return notFound('카탈로그를 찾을 수 없습니다.')
    }

    // 가격 결정
    const priceMap: PriceMap = {
      BASIC: catalog.priceBasic,
      PRO: catalog.pricePro,
      PREMIUM: catalog.pricePremium,
    }

    const price = priceMap[body.tier]

    // 사용자의 조직 조회 및 크레딧 확인
    let userOrg = null
    if (user.role === 'SPONSOR') {
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { orgId: true, org: true },
      })

      if (!userRecord?.org) {
        return badRequest('조직 정보가 없습니다.')
      }

      userOrg = userRecord.org
      if (userOrg.creditBalance < price) {
        return forbidden('크레딧이 부족합니다.')
      }
    }

    // 주문 생성
    const order = await prisma.reportOrder.create({
      data: {
        catalogId: body.catalogId,
        userId: user.id,
        orgId: userOrg?.id,
        tier: body.tier as 'BASIC' | 'PRO' | 'PREMIUM',
        price,
        customPrompt: body.customPrompt,
        status: 'PENDING',
        progress: 0,
      },
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
        generatedUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const data: ReportOrderItem = {
      id: order.id,
      catalogId: order.catalogId,
      catalogTitle: order.catalog.title,
      userId: order.userId,
      orgId: order.orgId,
      tier: order.tier,
      price: order.price,
      status: order.status,
      progress: order.progress,
      generatedUrl: order.generatedUrl,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }

    return success(data, undefined, 201)
  } catch (error) {
    console.error('[POST /api/reports/orders] Error:', error)
    return serverError('리포트 주문 생성 중 오류가 발생했습니다.')
  }
}
