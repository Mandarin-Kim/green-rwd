import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import {
  success,
  unauthorized,
  serverError,
  paginate,
} from '@/lib/api-response'

interface ReportCatalogItem {
  id: string
  title: string
  slug: string
  description?: string | null
  categories: string[]
  therapeuticArea?: string | null
  drugName?: string | null
  indication?: string | null
  region: string
  marketSizeKrw?: bigint | null
  patientPool?: number | null
  availableTiers: string[]
  priceBasic: number
  pricePro: number
  pricePremium: number
  sampleUrl?: string | null
  thumbnailUrl?: string | null
}

/**
 * GET /api/reports
 * AI 리포트 카탈로그 조회 (필터, 페이지네이션)
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
    const search = Array.isArray(searchParams.search)
      ? searchParams.search[0]
      : searchParams.search
    const category = Array.isArray(searchParams.category)
      ? searchParams.category[0]
      : searchParams.category
    const therapeuticArea = Array.isArray(searchParams.therapeuticArea)
      ? searchParams.therapeuticArea[0]
      : searchParams.therapeuticArea

    // WHERE 조건 구성
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { drugName: { contains: search, mode: 'insensitive' } },
        { indication: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.categories = { has: category }
    }

    if (therapeuticArea) {
      where.therapeuticArea = therapeuticArea
    }

    const [reports, total] = await Promise.all([
      prisma.reportCatalog.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          categories: true,
          therapeuticArea: true,
          drugName: true,
          indication: true,
          region: true,
          marketSizeKrw: true,
          patientPool: true,
          availableTiers: true,
          priceBasic: true,
          pricePro: true,
          pricePremium: true,
          sampleUrl: true,
          thumbnailUrl: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reportCatalog.count({ where }),
    ])

    const formatMarketSize = (sizeKrw: bigint | null): string => {
      if (!sizeKrw) return '-'
      const num = Number(sizeKrw)
      if (num >= 1000000000000) return `${(num / 1000000000000).toFixed(1)}조 원`
      if (num >= 100000000) return `${(num / 100000000).toFixed(0)}억 원`
      return `${(num / 1000000).toFixed(0)}백만 원`
    }

    const formatPatientPool = (count: number | null): string => {
      if (!count) return '-'
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}백만 명`
      if (count >= 10000) return `${(count / 10000).toFixed(0)}만 명`
      return `${count.toLocaleString()}명`
    }

    const data = reports.map((r) => ({
      ...r,
      marketSizeKrw: r.marketSizeKrw ? Number(r.marketSizeKrw) : null,
      marketSize: formatMarketSize(r.marketSizeKrw),
      patientPool: formatPatientPool(r.patientPool),
      patientPoolRaw: r.patientPool,
    }))

    return success(data, { page, pageSize, total })
  } catch (error) {
    console.error('[GET /api/reports] Error:', error)
    return serverError('리포트 카탈로그 조회 중 오류가 발생했습니다.')
  }
}
