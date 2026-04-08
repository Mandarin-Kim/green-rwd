import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHiraData, getClinicalTrialsData, getPubMedData, generateReport, ReportTier } from '@/lib/report-generator'

// Vercel Hobby: 최대 60초 → 각 단계를 60초 이내로 분리
export const maxDuration = 60;

/**
 * POST /api/reports/prepare
 * 4단계 분리 보고서 생성 API
 *
 * step=1: HIRA 데이터 수집 (건강보험심사평가원)
 * step=2: ClinicalTrials.gov 임상시험 데이터 수집
 * step=3: PubMed 논문 검색
 * step=4: AI 보고서 생성 (캐시된 데이터 활용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, step, tier = 'BASIC', orderId } = body

    if (!slug) {
      return NextResponse.json({ error: 'slug가 필요합니다' }, { status: 400 })
    }

    if (!step || ![1, 2, 3, 4].includes(step)) {
      return NextResponse.json({ error: 'step은 1~4 사이여야 합니다' }, { status: 400 })
    }

    // 카탈로그 조회
    const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
    if (!catalog) {
      return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
    }

    // ── Step 1: HIRA 데이터 수집 ──
    if (step === 1) {
      console.log(`[Prepare Step 1] HIRA 데이터 수집 시작: ${slug}`)
      const cachedHiraData = (catalog as any).hiraData || undefined

      const result = await getHiraData(slug, cachedHiraData)

      return NextResponse.json({
        success: true,
        step: 1,
        stepName: 'HIRA 건강보험심사평가원',
        data: {
          hasData: !!result.rawData,
          cached: !!cachedHiraData,
          summary: result.rawData
            ? `환자수 ${(result.rawData.patientCount || 0).toLocaleString()}명`
            : '데이터 없음',
        },
      })
    }

    // ── Step 2: ClinicalTrials.gov 데이터 수집 ──
    if (step === 2) {
      console.log(`[Prepare Step 2] ClinicalTrials 데이터 수집 시작: ${slug}`)
      const cachedCT = (catalog as any).clinicalTrialsData || undefined

      const result = await getClinicalTrialsData(slug, cachedCT)

      return NextResponse.json({
        success: true,
        step: 2,
        stepName: 'ClinicalTrials.gov',
        data: {
          hasData: !!result.data,
          cached: !!cachedCT,
          summary: result.data
            ? `임상시험 ${result.data.totalCount || 0}건`
            : '데이터 없음',
        },
      })
    }

    // ── Step 3: PubMed 논문 검색 ──
    if (step === 3) {
      console.log(`[Prepare Step 3] PubMed 논문 검색 시작: ${slug}`)
      const cachedPubMed = (catalog as any).pubMedData || undefined

      const result = await getPubMedData(
        slug,
        catalog.drugName || '',
        catalog.indication || '',
        cachedPubMed
      )

      return NextResponse.json({
        success: true,
        step: 3,
        stepName: 'PubMed 논문',
        data: {
          hasData: !!result.data,
          cached: !!cachedPubMed,
          summary: result.data
            ? `논문 ${result.data.articles?.length || 0}편`
            : '데이터 없음',
        },
      })
    }

    // ── Step 4: AI 보고서 생성 (캐시된 데이터 활용) ──
    if (step === 4) {
      console.log(`[Prepare Step 4] AI 보고서 생성 시작: ${slug} (tier: ${tier})`)

      if (!['BASIC', 'PRO', 'PREMIUM'].includes(tier)) {
        return NextResponse.json({ error: '유효하지 않은 티어입니다' }, { status: 400 })
      }

      // DB에서 최신 캐시 데이터 다시 읽기
      const freshCatalog = await prisma.reportCatalog.findUnique({ where: { slug } })
      if (!freshCatalog) {
        return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
      }

      const cachedHiraData = (freshCatalog as any).hiraData || undefined
      const cachedCT = (freshCatalog as any).clinicalTrialsData || undefined
      const cachedPubMed = (freshCatalog as any).pubMedData || undefined

      // 유저 확보
      let userId: string | undefined
      try {
        const { getSessionUser } = await import('@/lib/api-guard')
        const sessionUser = await getSessionUser(request)
        if (sessionUser?.id) {
          const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } })
          if (dbUser) userId = dbUser.id
        }
      } catch {}
      if (!userId) {
        let guestUser = await prisma.user.findUnique({ where: { email: 'guest@green-rwd.system' } })
        if (!guestUser) {
          guestUser = await prisma.user.create({
            data: { email: 'guest@green-rwd.system', name: '게스트', role: 'USER' },
          })
        }
        userId = guestUser.id
      }

      // 기존 완료된 보고서가 있으면 반환 (orderId가 주어진 경우 해당 주문 확인)
      if (orderId) {
        const existingOrder = await prisma.reportOrder.findUnique({ where: { id: orderId } })
        if (existingOrder && existingOrder.status === 'COMPLETED') {
          return NextResponse.json({
            success: true,
            step: 4,
            stepName: 'AI 보고서 생성',
            data: {
              orderId: existingOrder.id,
              status: 'COMPLETED',
              message: '이미 생성된 보고서가 있습니다',
            },
          })
        }
      }

      // 이전 GENERATING/PENDING 주문 정리
      await prisma.reportOrder.updateMany({
        where: {
          catalogId: freshCatalog.id,
          status: { in: ['PENDING', 'GENERATING'] },
        },
        data: {
          status: 'FAILED',
          errorMessage: '새 생성 요청으로 대체됨',
          completedAt: new Date(),
        },
      })

      // 새 주문 생성
      const priceMap: Record<string, number> = {
        BASIC: freshCatalog.priceBasic,
        PRO: freshCatalog.pricePro,
        PREMIUM: freshCatalog.pricePremium,
      }
      const newOrder = await prisma.reportOrder.create({
        data: {
          catalogId: freshCatalog.id,
          userId,
          tier: tier as ReportTier,
          price: priceMap[tier],
          status: 'GENERATING',
          progress: 0,
          startedAt: new Date(),
        },
      })

      try {
        // 캐시된 데이터로 AI 생성 (외부 API 호출 없이 OpenAI만 호출)
        const sections = await generateReport({
          catalogId: freshCatalog.id,
          slug: freshCatalog.slug || '',
          title: freshCatalog.title,
          drugName: freshCatalog.drugName || '',
          indication: freshCatalog.indication || '',
          therapeuticArea: freshCatalog.therapeuticArea || '',
          tier: tier as ReportTier,
          cachedHiraData,
          cachedClinicalTrialsData: cachedCT,
          cachedPubMedData: cachedPubMed,
          onProgress: async (progress: number, sectionTitle: string) => {
            try {
              await prisma.reportOrder.update({
                where: { id: newOrder.id },
                data: { progress },
              })
            } catch {}
          },
        })

        // 완료 저장
        await prisma.reportOrder.update({
          where: { id: newOrder.id },
          data: {
            status: 'COMPLETED',
            progress: 100,
            sections: sections as any,
            completedAt: new Date(),
          },
        })

        return NextResponse.json({
          success: true,
          step: 4,
          stepName: 'AI 보고서 생성',
          data: {
            orderId: newOrder.id,
            status: 'COMPLETED',
            message: '보고서 생성이 완료되었습니다',
          },
        })
      } catch (genError) {
        console.error(`[Prepare Step 4] 생성 실패:`, genError)
        await prisma.reportOrder.update({
          where: { id: newOrder.id },
          data: {
            status: 'FAILED',
            errorMessage: genError instanceof Error ? genError.message : '보고서 생성 실패',
            completedAt: new Date(),
          },
        })
        return NextResponse.json({
          success: false,
          step: 4,
          error: genError instanceof Error ? genError.message : '보고서 생성 중 오류가 발생했습니다',
          data: { orderId: newOrder.id, status: 'FAILED' },
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: '알 수 없는 step입니다' }, { status: 400 })
  } catch (error) {
    console.error('[POST /api/reports/prepare] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/prepare?slug=xxx
 * 각 단계별 캐시 상태 확인
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'slug가 필요합니다' }, { status: 400 })
    }

    const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
    if (!catalog) {
      return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
    }

    const hiraData = (catalog as any).hiraData
    const clinicalTrialsData = (catalog as any).clinicalTrialsData
    const pubMedData = (catalog as any).pubMedData

    // 완료된 보고서가 있는지 확인
    const completedOrder = await prisma.reportOrder.findFirst({
      where: {
        catalogId: catalog.id,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        slug: catalog.slug,
        steps: {
          1: {
            name: 'HIRA 건강보험심사평가원',
            completed: !!hiraData,
            summary: hiraData
              ? `환자수 ${(hiraData.patientCount || 0).toLocaleString()}명`
              : null,
          },
          2: {
            name: 'ClinicalTrials.gov',
            completed: !!clinicalTrialsData,
            summary: clinicalTrialsData
              ? `임상시험 ${clinicalTrialsData.totalCount || (Array.isArray(clinicalTrialsData.studies) ? clinicalTrialsData.studies.length : 0)}건`
              : null,
          },
          3: {
            name: 'PubMed 논문',
            completed: !!pubMedData,
            summary: pubMedData
              ? `논문 ${pubMedData.articles?.length || 0}편`
              : null,
          },
          4: {
            name: 'AI 보고서 생성',
            completed: !!completedOrder,
            summary: completedOrder
              ? `${completedOrder.tier} 보고서 생성 완료`
              : null,
          },
        },
        dataSyncedAt: catalog.dataSyncedAt?.toISOString() || null,
        reportReady: !!completedOrder,
      },
    })
  } catch (error) {
    console.error('[GET /api/reports/prepare] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
