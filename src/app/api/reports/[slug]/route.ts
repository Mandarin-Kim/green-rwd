import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 카탈로그 조회는 인증 없이도 가능 (구매/생성 시에만 인증 필요)
    const user = await getSessionUser(request).catch(() => null)

    const { slug } = params

    if (!slug) {
      return NextResponse.json(
        { error: '보고서 슬러그가 필요합니다' },
        { status: 400 }
      )
    }

    const catalog = await prisma.reportCatalog.findUnique({
      where: { slug },
    })

    if (!catalog) {
      return NextResponse.json(
        { success: false, error: '보고서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check for completed order
    const completedOrder = await prisma.reportOrder.findFirst({
      where: {
        catalogId: catalog.id,
        status: 'COMPLETED',
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    // Format helpers
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

    // ClinicalTrials 데이터에서 임상시험 수 추출
    const clinicalTrialsData = (catalog as any).clinicalTrialsData as any
    let clinicalTrialsCount: number | null = null
    if (clinicalTrialsData) {
      if (typeof clinicalTrialsData === 'object' && clinicalTrialsData.totalCount !== undefined) {
        clinicalTrialsCount = clinicalTrialsData.totalCount
      } else if (Array.isArray(clinicalTrialsData?.studies)) {
        clinicalTrialsCount = clinicalTrialsData.studies.length
      }
    }

    const response = {
      id: catalog.id,
      slug: catalog.slug,
      title: catalog.title,
      description: catalog.description,
      categories: catalog.categories,
      therapeuticArea: catalog.therapeuticArea,
      drugName: catalog.drugName,
      indication: catalog.indication,
      marketSize: formatMarketSize(catalog.marketSizeKrw),
      marketSizeRaw: catalog.marketSizeKrw ? Number(catalog.marketSizeKrw) : null,
      patientPool: formatPatientPool(catalog.patientPool),
      patientPoolRaw: catalog.patientPool,
      clinicalTrialsCount,
      availableTiers: catalog.availableTiers,
      priceBasic: catalog.priceBasic,
      pricePro: catalog.pricePro,
      pricePremium: catalog.pricePremium,
      thumbnailUrl: catalog.thumbnailUrl,
      isGenerated: !!completedOrder,
      createdAt: catalog.createdAt.toISOString(),
      updatedAt: catalog.updatedAt.toISOString(),
    }

    // Include sections if report is generated
    if (completedOrder && completedOrder.sections) {
      const sections = Array.isArray(completedOrder.sections)
        ? completedOrder.sections
        : Object.values(completedOrder.sections || {})

      return NextResponse.json({
        success: true,
        data: {
          ...response,
          sections: sections.map((section: any) => ({
            id: section.id || Math.random().toString(36).substr(2, 9),
            title: section.title || '제목 없음',
            content: section.content || '',
            wordCount: section.wordCount || 0,
            hasCharts: section.hasCharts || false,
            hasTables: section.hasTables || false,
            charts: section.charts || [],
            tables: section.tables || [],
            order: section.order || 0,
          })),
          generatedAt: completedOrder.completedAt?.toISOString(),
          tier: completedOrder.tier,
        },
      })
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('[GET /api/reports/[slug]] Error:', error)
    return NextResponse.json(
      { success: false, error: '보고서 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
