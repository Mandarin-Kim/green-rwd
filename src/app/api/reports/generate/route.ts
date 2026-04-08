import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import { generateReport, ReportTier } from '@/lib/report-generator'

// Vercel: Hobby 최대 60초, Pro 최대 300초
// HIRA API(15~20초) + ClinicalTrials(8초) + AI 섹션 생성이 있으므로 120초 설정
// 첫 생성 시 API 호출 → DB 캐시 저장, 이후 생성은 DB에서 즉시 읽어 훨씬 빠름
export const maxDuration = 120;

// POST /api/reports/generate - 보고서 생성 (동기 방식)
// Vercel Serverless에서는 응답 후 함수가 즉시 종료되므로
// fire-and-forget 패턴 대신 동기 생성 후 결과를 반환합니다.
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

      // 3) 이미 완료된 보고서가 있으면 반환
      const completedOrder = await tx.reportOrder.findFirst({
        where: {
          catalogId: catalog.id,
          tier: tier as ReportTier,
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
      })

      if (completedOrder) {
        return {
          alreadyCompleted: true as const,
          order: completedOrder,
          catalog,
        }
      }

      // 4) 새 주문 생성 (이전 실패/생성중 주문은 무시)
      // 이전에 GENERATING 상태로 남은 주문을 FAILED로 정리
      await tx.reportOrder.updateMany({
        where: {
          catalogId: catalog.id,
          status: { in: ['PENDING', 'GENERATING'] },
        },
        data: {
          status: 'FAILED',
          errorMessage: '이전 생성 요청이 시간 초과되어 재시도합니다',
          completedAt: new Date(),
        },
      })

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
        alreadyCompleted: false as const,
        order: newOrder,
        catalog,
      }
    })

    // 이미 완료된 보고서가 있으면 즉시 반환
    if (txResult.alreadyCompleted) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: txResult.order.id,
          status: 'COMPLETED',
          progress: 100,
          message: '이미 생성된 보고서가 있습니다',
        },
      })
    }

    // ── 동기 보고서 생성 ──
    // Vercel Serverless에서는 응답 전에 모든 작업을 완료해야 함
    const orderId = txResult.order.id
    const catalog = txResult.catalog

    try {
      console.log(`[Report Generation] Starting: ${catalog.title} (${tier})`)

      // DB에 캐시된 HIRA/ClinicalTrials 데이터가 있으면 전달
      // → 캐시가 있으면 API 호출 건너뜀 (타임아웃 방지)
      // → 캐시가 없으면 API 호출 → 결과 DB 자동 저장 (다음번에는 캐시 사용)
      const cachedHiraData = (catalog as any).hiraData || undefined
      const cachedClinicalTrialsData = (catalog as any).clinicalTrialsData || undefined
      const cachedPubMedData = (catalog as any).pubMedData || undefined

      if (cachedHiraData) console.log(`[Report Generation] HIRA 캐시 활용 (${catalog.slug})`)
      if (cachedClinicalTrialsData) console.log(`[Report Generation] ClinicalTrials 캐시 활용 (${catalog.slug})`)
      if (cachedPubMedData) console.log(`[Report Generation] PubMed 캐시 활용 (${catalog.slug})`)

      const sections = await generateReport({
        catalogId: catalog.id,
        slug: catalog.slug || '',
        title: catalog.title,
        drugName: catalog.drugName || '',
        indication: catalog.indication || '',
        therapeuticArea: catalog.therapeuticArea || '',
        tier: tier as ReportTier,
        cachedHiraData,
        cachedClinicalTrialsData,
        cachedPubMedData,
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

      // 완료 저장
      await prisma.reportOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          sections: sections as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          completedAt: new Date(),
        },
      })

      console.log(`[Report Generation] Completed: ${catalog.title}`)

      return NextResponse.json({
        success: true,
        data: {
          orderId,
          status: 'COMPLETED',
          progress: 100,
          message: '보고서 생성이 완료되었습니다',
        },
      })
    } catch (genError) {
      console.error(`[Report Generation] Failed: ${catalog.title}`, genError)

      // 실패 상태 저장
      await prisma.reportOrder.update({
        where: { id: orderId },
        data: {
          status: 'FAILED',
          errorMessage: genError instanceof Error ? genError.message : '보고서 생성 중 오류',
          completedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: false,
        error: genError instanceof Error ? genError.message : '보고서 생성 중 오류가 발생했습니다',
        data: { orderId, status: 'FAILED' },
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[POST /api/reports/generate] Error:', error)

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
