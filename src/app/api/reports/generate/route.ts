import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import { generateReport, ReportTier } from '@/lib/report-generator'

// PREMIUM 보고서는 15섹션 × AI 호출 → 최대 5분 소요 가능
export const maxDuration = 300;

// POST /api/reports/generate - Start report generation
export async function POST(request: NextRequest) {
  try {
    // 인증: 로그인 사용자 우선, 비로그인 시 시스템 게스트 사용자 사용
    const user = await getSessionUser(request)
    let userId = user?.id
    if (!userId) {
      // 게스트 사용자 조회
      let guestUser = await prisma.user.findUnique({ where: { email: 'guest@green-rwd.system' } })
      if (!guestUser) {
        // 게스트 사용자 생성
        guestUser = await prisma.user.create({
          data: {
            email: 'guest@green-rwd.system',
            name: '게스트',
            role: 'USER',
          },
        })
        console.log('[Auth] Guest user created:', guestUser.id)
      }
      userId = guestUser.id
    }

    const body = await request.json()
    const { catalogId, slug, tier = 'BASIC' } = body

    if (!catalogId && !slug) {
      return NextResponse.json({ error: '카탈로그 ID 또는 slug가 필요합니다' }, { status: 400 })
    }

    // Validate tier
    if (!['BASIC', 'PRO', 'PREMIUM'].includes(tier)) {
      return NextResponse.json({ error: '유효하지 않은 티어입니다' }, { status: 400 })
    }

    // Get catalog (slug 또는 catalogId로 조회)
    const catalog = catalogId
      ? await prisma.reportCatalog.findUnique({ where: { id: catalogId } })
      : await prisma.reportCatalog.findUnique({ where: { slug } })

    if (!catalog) {
      return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
    }

    // Check for existing active order
    const existingOrder = await prisma.reportOrder.findFirst({
      where: {
        catalogId: catalog.id,
        status: { in: ['PENDING', 'GENERATING'] },
      },
    })

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: existingOrder.id,
          status: existingOrder.status,
          progress: existingOrder.progress,
          message: '이미 생성 중인 보고서가 있습니다',
        },
      })
    }

    // Get price for tier
    const priceMap: Record<string, number> = {
      BASIC: catalog.priceBasic,
      PRO: catalog.pricePro,
      PREMIUM: catalog.pricePremium,
    }

    // Create order
    const order = await prisma.reportOrder.create({
      data: {
        catalogId: catalog.id,
        userId,
        tier: tier as ReportTier,
        price: priceMap[tier],
        status: 'GENERATING',
        progress: 0,
        startedAt: new Date(),
      },
    })

    // Start async generation (fire-and-forget)
    generateReportAsync(order.id, catalog, tier as ReportTier).catch((error) => {
      console.error(`[Report Generation Failed] Order: ${order.id}`, error)
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        status: 'GENERATING',
        progress: 0,
        message: '보고서 생성이 시작되었습니다',
      },
    }, { status: 202 })
  } catch (error) {
    console.error('[POST /api/reports/generate] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// GET /api/reports/generate?orderId=xxx - Check progress
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'orderId가 필요합니다' }, { status: 400 })
    }

    const order = await prisma.reportOrder.findUnique({
      where: { id: orderId },
      include: { catalog: true },
    })

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        progress: order.progress,
        tier: order.tier,
        catalogTitle: order.catalog.title,
        catalogSlug: order.catalog.slug,
        startedAt: order.startedAt?.toISOString(),
        completedAt: order.completedAt?.toISOString(),
        errorMessage: order.errorMessage,
      },
    })
  } catch (error) {
    console.error('[GET /api/reports/generate] Error:', error)
    return NextResponse.json(
      { success: false, error: '진행 상태 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// Async report generation
async function generateReportAsync(
  orderId: string,
  catalog: any,
  tier: ReportTier
) {
  try {
    console.log(`[Async Generation] Starting: ${catalog.title} (${tier})`)

    const sections = await generateReport({
      catalogId: catalog.id,
      slug: catalog.slug || '',
      title: catalog.title,
      drugName: catalog.drugName || '',
      indication: catalog.indication || '',
      therapeuticArea: catalog.therapeuticArea || '',
      tier,
      onProgress: async (progress: number, sectionTitle: string) => {
        try {
          await prisma.reportOrder.update({
            where: { id: orderId },
            data: { progress },
          })
          console.log(`[Progress] ${catalog.slug}: ${progress}% - ${sectionTitle}`)
        } catch (e) {
          console.error('[Progress Update Error]', e)
        }
      },
    })

    // Save completed report
    await prisma.reportOrder.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        sections: sections as any,
        completedAt: new Date(),
      },
    })

    console.log(`[Async Generation] Completed: ${catalog.title}`)
  } catch (error) {
    console.error(`[Async Generation] Failed: ${catalog.title}`, error)

    await prisma.reportOrder.update({
      where: { id: orderId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
        completedAt: new Date(),
      },
    })
  }
}
