import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbConnection } from '@/lib/prisma'
import { getHiraData, getClinicalTrialsData, getPubMedData, generateReport, generateSingleSection, getSectionCount, ReportTier } from '@/lib/report-generator'
import { fetchGlobalMedicalData } from '@/lib/global-medical-apis'

// Vercel Hobby: 최대 60초 → 각 단계를 60초 이내로 분리
export const maxDuration = 60;

// 캐시 만료 기간 (7일)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** DB 캐시가 유효한지 확인 (dataSyncedAt 기준 7일 이내) */
function isCacheValid(dataSyncedAt: Date | null, data: any): boolean {
  if (!data) return false;
  if (!dataSyncedAt) return !!data; // 동기화 시각이 없으면 데이터가 있으면 유효
  return (Date.now() - dataSyncedAt.getTime()) < CACHE_TTL_MS;
}

/**
 * POST /api/reports/prepare
 * 4단계 분리 보고서 생성 API
 *
 * step=1: HIRA 데이터 수집 (건강보험실사평가원)
 * step=2: ClinicalTrials.gov 임상시험 데이터 수집
 * step=3: PubMed 논문 검색
 * step=4: 글로벌 의료데이터 수집 (CMS Medicare + PBS Australia + NHS UK)
 * step=5: AI 보고서 생성 (캐시된 데이터 활용)
 *
 * forceRefresh=true: 캐시를 무시하고 강제로 재수집
 */
export async function POST(request: NextRequest) {
  try {
    // Neon 절전모드 대응: DB 연결 확인 (최대 3회 재시도)
    const dbReady = await ensureDbConnection()
    if (!dbReady) {
      return NextResponse.json(
        { success: false, error: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { slug, step, tier = 'BASIC', orderId, forceRefresh = false, sectionIndex } = body

    if (!slug) {
      return NextResponse.json({ error: 'slug가 필요합니다' }, { status: 400 })
    }

    if (!step || ![1, 2, 3, 4, 5].includes(step)) {
      return NextResponse.json({ error: 'step읁 1~5 사이여야 합니다' }, { status: 400 })
    }

    // 카탈로그 조회
    const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
    if (!catalog) {
      return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
    }

    const syncedAt = catalog.dataSyncedAt;

    // ── Step 1: HIRA 데이터 수집 ──
    if (step === 1) {
      console.log(`[Prepare Step 1] HIRA 데이터 수집 시작: ${slug}`)
      const existingData = (catalog as any).hiraData;
      const cacheValid = !forceRefresh && isCacheValid(syncedAt, existingData);

      // DB 캐시가 유효하면 API 호출 없이 바로 반환
      // indication 전달: 커스텀 보고서에서도 HIRA 질병코드 동적 매핑 가능
      const result = await getHiraData(slug, cacheValid ? existingData : undefined, catalog.indication || undefined)

      return NextResponse.json({
        success: true,
        step: 1,
        stepName: 'HIRA 건강보험심사평가원',
        data: {
          hasData: !!result.rawData,
          cached: cacheValid && !!existingData,
          freshlyFetched: !cacheValid || !existingData,
          summary: result.rawData
            ? `환자수 ${(result.rawData.patientCount || 0).toLocaleString()}명`
            : '데이터 없음',
        },
      })
    }

    // ── Step 2: ClinicalTrials.gov 데이터 수집 ──
    if (step === 2) {
      console.log(`[Prepare Step 2] ClinicalTrials 데이터 수집 시작: ${slug}`)
      const existingData = (catalog as any).clinicalTrialsData;
      const cacheValid = !forceRefresh && isCacheValid(syncedAt, existingData);

      const result = await getClinicalTrialsData(slug, cacheValid ? existingData : undefined)

      return NextResponse.json({
        success: true,
        step: 2,
        stepName: 'ClinicalTrials.gov',
        data: {
          hasData: !!result.data,
          cached: cacheValid && !!existingData,
          freshlyFetched: !cacheValid || !existingData,
          summary: result.data
            ? `임상시험 ${result.data.totalCount || 0}건`
            : '데이터 없음',
        },
      })
    }

    // ── Step 3: PubMed 논문 검색 ──
    if (step === 3) {
      console.log(`[Prepare Step 3] PubMed 논문 검색 시작: ${slug}`)
      const existingData = (catalog as any).pubMedData;
      const cacheValid = !forceRefresh && isCacheValid(syncedAt, existingData);

      const result = await getPubMedData(
        slug,
        catalog.drugName || '',
        catalog.indication || '',
        cacheValid ? existingData : undefined
      )

      return NextResponse.json({
        success: true,
        step: 3,
        stepName: 'PubMed 논문',
        data: {
          hasData: !!result.data,
          cached: cacheValid && !!existingData,
          freshlyFetched: !cacheValid || !existingData,
          summary: result.data
            ? `논문 ${result.data.articles?.length || 0}편`
            : '데이터 없음',
        },
      })
    }

    // ── Step 4: 글로벌 의료데이터 수집 (CMS + PBS + NHS) ──
    if (step === 4) {
      console.log(`[Prepare Step 4] 글로벌 의료데이터 수집 시작: ${slug}`)
      const existingGlobalData = (catalog as any).globalMedicalData;
      const globalCacheValid = !forceRefresh && isCacheValid(syncedAt, existingGlobalData);

      if (globalCacheValid && existingGlobalData) {
        // 캐시 유효 → API 호출 없이 반환
        const cmsCount = existingGlobalData.cms?.drugSpending?.length || 0;
        const pbsCount = existingGlobalData.pbs?.items?.length || 0;
        const nhsCount = existingGlobalData.nhs?.prescriptionSummary?.length || 0;
        const fdaLabels = existingGlobalData.fda?.labels?.length || 0;
        const fdaEvents = existingGlobalData.fda?.adverseEvents?.length || 0;
        const fdaApprovals = existingGlobalData.fda?.approvals?.length || 0;
        return NextResponse.json({
          success: true,
          step: 4,
          stepName: '글로벌 의료데이터 (CMS·PBS·NHS·FDA)',
          data: {
            hasData: true,
            cached: true,
            freshlyFetched: false,
            summary: `CMS ${cmsCount}건 / PBS ${pbsCount}건 / NHS ${nhsCount}건 / FDA 라벨${fdaLabels}·부작용${fdaEvents}·승인${fdaApprovals}건`,
          },
        });
      }

      try {
        const globalData = await fetchGlobalMedicalData(
          catalog.drugName || '',
          catalog.indication || ''
        );

        // DB에 캐시 저장
        await prisma.reportCatalog.updateMany({
          where: { slug },
          data: { globalMedicalData: globalData as any, dataSyncedAt: new Date() },
        });

        const cmsCount = globalData.cms?.drugSpending?.length || 0;
        const pbsCount = globalData.pbs?.items?.length || 0;
        const nhsCount = globalData.nhs?.prescriptionSummary?.length || 0;
        const fdaLabels = globalData.fda?.labels?.length || 0;
        const fdaEvents = globalData.fda?.adverseEvents?.length || 0;
        const fdaApprovals = globalData.fda?.approvals?.length || 0;
        const totalFda = fdaLabels + fdaEvents + fdaApprovals;

        return NextResponse.json({
          success: true,
          step: 4,
          stepName: '글로벌 의료데이터 (CMS·PBS·NHS·FDA)',
          data: {
            hasData: cmsCount > 0 || pbsCount > 0 || nhsCount > 0 || totalFda > 0,
            cached: false,
            freshlyFetched: true,
            summary: `CMS ${cmsCount}건 / PBS ${pbsCount}건 / NHS ${nhsCount}건 / FDA 라벨${fdaLabels}·부작용${fdaEvents}·승인${fdaApprovals}건`,
          },
        });
      } catch (globalError) {
        console.error(`[Prepare Step 4] 글로벌 데이터 수집 실패:`, globalError);
        return NextResponse.json({
          success: true,
          step: 4,
          stepName: '글로벌 의료데이터 (CMS·PBS·NHS·FDA)',
          data: {
            hasData: false,
            cached: false,
            freshlyFetched: false,
            summary: '글로벌 데이터 수집 실패 (보고서 생성에는 영향 없음)',
          },
        });
      }
    }

    // ── Step 5: AI 보고서 생성 (섹션별 분할 생성 - Vercel 60초 대응) ──
    // sectionIndex가 없으면 새 주문 생성 + 첫 섹션, 있으면 해당 섹션만 생성
    if (step === 5) {
      if (!['BASIC', 'PRO', 'PREMIUM'].includes(tier)) {
        return NextResponse.json({ error: '유효하지 않은 티어입니다' }, { status: 400 })
      }

      const freshCatalog = await prisma.reportCatalog.findUnique({ where: { slug } })
      if (!freshCatalog) {
        return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
      }

      const cachedHiraData = (freshCatalog as any).hiraData || undefined
      const cachedCT = (freshCatalog as any).clinicalTrialsData || undefined
      const cachedPubMed = (freshCatalog as any).pubMedData || undefined
      const currentSectionIdx = typeof sectionIndex === 'number' ? sectionIndex : 0
      const totalSectionCount = getSectionCount(tier as ReportTier) + (cachedPubMed?.articles?.length > 0 ? 1 : 0)

      console.log(`[Prepare Step 5] 섹션 ${currentSectionIdx + 1}/${totalSectionCount} 생성: ${slug} (tier: ${tier})`)

      // ── 첫 섹션(sectionIndex=0)일 때: 주문 생성 ──
      let activeOrderId = orderId
      if (currentSectionIdx === 0 && !orderId) {
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

        // 이전 미완료 주문 정리
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
        activeOrderId = newOrder.id
      }

      // orderId가 있는데 이미 완료된 경우 바로 반환
      if (activeOrderId) {
        const existingOrder = await prisma.reportOrder.findUnique({ where: { id: activeOrderId } })
        if (existingOrder && existingOrder.status === 'COMPLETED') {
          return NextResponse.json({
            success: true,
            step: 5,
            stepName: 'AI 보고서 생성',
            data: {
              orderId: existingOrder.id,
              status: 'COMPLETED',
              message: '이미 생성된 보고서가 있습니다',
            },
          })
        }
      }

      try {
        // 단일 섹션 생성 (타임아웃 방지)
        const result = await generateSingleSection({
          slug: freshCatalog.slug || '',
          title: freshCatalog.title,
          drugName: freshCatalog.drugName || '',
          indication: freshCatalog.indication || '',
          therapeuticArea: freshCatalog.therapeuticArea || '',
          tier: tier as ReportTier,
          sectionIndex: currentSectionIdx,
          cachedHiraData,
          cachedClinicalTrialsData: cachedCT,
          cachedPubMedData: cachedPubMed,
        })

        // 기존 주문의 sections에 이번 섹션을 추가 저장
        if (activeOrderId) {
          const currentOrder = await prisma.reportOrder.findUnique({ where: { id: activeOrderId } })
          const existingSections: any[] = (currentOrder?.sections as any[]) || []
          // 같은 인덱스 섹션이 이미 있으면 교체, 없으면 추가
          const updatedSections = existingSections.filter((s: any) => s.order !== result.section.order)
          updatedSections.push(result.section)
          updatedSections.sort((a: any, b: any) => a.order - b.order)

          const progress = Math.round(((currentSectionIdx + 1) / totalSectionCount) * 100)

          if (result.isLast) {
            // 마지막 섹션 → 완료 처리
            await prisma.reportOrder.update({
              where: { id: activeOrderId },
              data: {
                status: 'COMPLETED',
                progress: 100,
                sections: updatedSections as any,
                completedAt: new Date(),
              },
            })

            return NextResponse.json({
              success: true,
              step: 5,
              stepName: 'AI 보고서 생성',
              data: {
                orderId: activeOrderId,
                status: 'COMPLETED',
                sectionIndex: currentSectionIdx,
                sectionTitle: result.section.title,
                totalSections: totalSectionCount,
                isLast: true,
                message: '보고서 생성이 완료되었습니다',
              },
            })
          } else {
            // 중간 섹션 → 진행 상태 저장
            await prisma.reportOrder.update({
              where: { id: activeOrderId },
              data: {
                progress,
                sections: updatedSections as any,
              },
            })

            return NextResponse.json({
              success: true,
              step: 5,
              stepName: 'AI 보고서 생성',
              data: {
                orderId: activeOrderId,
                status: 'GENERATING',
                sectionIndex: currentSectionIdx,
                sectionTitle: result.section.title,
                nextSectionIndex: currentSectionIdx + 1,
                totalSections: totalSectionCount,
                isLast: false,
                progress,
                summary: `섹션 ${currentSectionIdx + 1}/${totalSectionCount} 완료: ${result.section.title}`,
              },
            })
          }
        }

        // orderId가 없는 비정상 케이스
        return NextResponse.json({
          success: true,
          step: 5,
          data: {
            status: 'GENERATING',
            sectionIndex: currentSectionIdx,
            sectionTitle: result.section.title,
            isLast: result.isLast,
          },
        })
      } catch (genError) {
        console.error(`[Prepare Step 5] 섹션 ${currentSectionIdx} 생성 실패:`, genError)
        if (activeOrderId) {
          await prisma.reportOrder.update({
            where: { id: activeOrderId },
            data: {
              status: 'FAILED',
              errorMessage: genError instanceof Error ? genError.message : '보고서 생성 실패',
              completedAt: new Date(),
            },
          }).catch(() => {})
        }
        return NextResponse.json({
          success: false,
          step: 5,
          error: genError instanceof Error ? genError.message : '보고서 생성 중 오류가 발생했습니다',
          data: { orderId: activeOrderId, status: 'FAILED', sectionIndex: currentSectionIdx },
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
    // Neon 절전모드 대응
    await ensureDbConnection()

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
    const globalMedicalData = (catalog as any).globalMedicalData

    // 완료된 보고서가 있는지 확인
    const completedOrder = await prisma.reportOrder.findFirst({
      where: {
        catalogId: catalog.id,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    })

    // 글로벌 데이터 요약 생성
    const cmsCount = globalMedicalData?.cms?.drugSpending?.length || 0;
    const pbsCount = globalMedicalData?.pbs?.items?.length || 0;
    const nhsCount = globalMedicalData?.nhs?.prescriptionSummary?.length || 0;
    const fdaLabels = globalMedicalData?.fda?.labels?.length || 0;
    const fdaEvents = globalMedicalData?.fda?.adverseEvents?.length || 0;
    const fdaApprovals = globalMedicalData?.fda?.approvals?.length || 0;
    const globalHasData = globalMedicalData != null;

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
            name: '글로벌 의료데이터 (CMS·PBS·NHS·FDA)',
            completed: !!globalMedicalData,
            summary: globalMedicalData
              ? `CMS ${cmsCount}건 / PBS ${pbsCount}건 / NHS ${nhsCount}건 / FDA 라벨${fdaLabels}·부작용${fdaEvents}·승인${fdaApprovals}건`
              : null,
          },
          5: {
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
