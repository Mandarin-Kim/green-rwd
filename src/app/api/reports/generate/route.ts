import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import { generateReport, ReportTier } from '@/lib/report-generator'

// PREMIUM 보고서는 15섹션 × AI 호출 → 최대 5분 소요 가능
export const maxDuration = 300;

// POST /api/reports/generate - Start report generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { catalogId, slug, tier = 'BASIC' } = body

    if (!catalogId && !slug) {
      return NextResponse.json({ error: '카탈로그 ID 또는 slug가 필요합니다' }, { status: 400 })
    }

    if (!['BASIC', 'PRO', 'PREMIUM'].includes(tier)) {
      return NextResponse.json({ error: '유효하지 않은 티어입니다' }, { status: 400 })
    }

    // ── 단일 트랜잭션으로 유저 확보 + 카탈로그 조회 + 주문 생성 ──
    // Neon pgBouncer 풀링 환경에서 FK constraint 에러를 방지하기 위해
    // 모든 DB 작업을 하나의 트랜잭션 안에서 처리합니다.
    const txResult = await prisma.$transaction(async (tx) => {
      // 1) 인증: 세션 유저 → DB 존재 확인 → 없으면 게스트
      let userId: string | undefined
      const sessionUser = await getSessionUser(request)

      if (sessionUser?.id) {
        const dbUser = await tx.user.findUnique({ where: { id: sessionUser.id } })
        if (dbUser) userId = dbUser.id
      }

      if (!userId) {
        let guestUser = await tx.user.findUnique({
          where: { email: 'guest@green-rwd.system' },
        })
        if (!guestUser) {
          guestUser = await tx.user.create({
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

      // 2) 카탈로그 조회
      const catalog = catalogId
        ? await tx.reportCatalog.findUnique({ where: { id: catalogId } })
        : await tx.reportCatalog.findUnique({ where: { slug } })

      if (!catalog) {
        throw new Error('CATALOG_NOT_FOUND')
      }

      // 3) 이미 생성 중인 주문이 있는지 확인
      const existingOrder = await tx.reportOrder.findFirst({
        where: {
          catalogId: catalog.id,
          status: { in: ['PENDING', 'GENERATING'] },
        },
      })

      if (existingOrder) {
        return {
          isExisting: true as const,
          order: existingOrder,
          catalog,
        }
      }

      // 4) 새 주문 생성
      const priceMap: Record<string, number> = {
        BASIC: catalog.priceBasic,
        PRO: catalog.pricePro,
        PREMIUM: catalog.pricePremium,
      }

      const newOrder = await tx.reportOrder.create({
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

      return {
        isExisting: false as const,
        order: newOrder,
        catalog,
      }
    })

    // 이미 생성 중인 주문이면 기존 정보 반환
    if (txResult.isExisting) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: txResult.order.id,
          status: txResult.order.status,
          progress: txResult.order.progress,
          message: '이미 생성 중인 보고서가 있습니다',
        },
      })
    }

    // 비동기 보고서 생성 시작 (fire-and-forget)
    generateReportAsync(txResult.order.id, txResult.catalog, tier as ReportTier).catch((error) => {
      console.error(`[Report Generation Failed] Order: ${txResult.order.id}`, error)
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: txResult.order.id,
        status: 'GENERATING',
        progress: 0,
        message: '보고서 생성이 시작되었습니다',
      },
    }, { status: 202 })
  } catch (error) {
    console.error('[POST /api/reports/generate] Error:', error)

    // 카탈로그 없음은 404로 반환
    if (error instanceof Error && error.message === 'CATALOG_NOT_FOUND') {
      return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
    }

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
  catalog: { id: string; slug: string; title: string; drugName: string | null; indication: string | null; therapeuticArea: string | null },
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
        sections: sections as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
