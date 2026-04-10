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
  if (!dataSyncedAt) return !!data;
  return (Date.now() - dataSyncedAt.getTime()) < CACHE_TTL_MS;
}

// 한국어 → 영어 질환명 번역 테이블
const KO_EN_DISEASES: Record<string, string> = {
  '골수섬유증': 'myelofibrosis', '적혈구증가증': 'polycythemia vera',
  '본태성 혈소판증가증': 'essential thrombocythemia', '비만': 'obesity',
  '탈모': 'alopecia areata', '간질환': 'liver disease', '통풍': 'gout',
  '당뇨': 'diabetes mellitus', '고혈압': 'hypertension', '폐암': 'lung cancer',
  '유방암': 'breast cancer', '대장암': 'colorectal cancer', '위암': 'gastric cancer',
  '간암': 'hepatocellular carcinoma', '알츠하이머': 'Alzheimer disease',
  '파킨슨': 'Parkinson disease', '류마티스': 'rheumatoid arthritis',
  '천식': 'asthma', '크론': "Crohn disease", '건선': 'psoriasis',
  '아토피': 'atopic dermatitis', '신부전': 'renal failure', '심부전': 'heart failure',
  '뇌졸중': 'stroke', '우울증': 'depression', '조현병': 'schizophrenia',
  '다발성경화증': 'multiple sclerosis', '백혈병': 'leukemia', '림프종': 'lymphoma',
  '췌장암': 'pancreatic cancer', '신장암': 'renal cell carcinoma',
  '방광암': 'bladder cancer', '전립선암': 'prostate cancer', '갑상선암': 'thyroid cancer',
  '황반변성': 'macular degeneration', '녹내장': 'glaucoma', '백내장': 'cataract',
  '척추': 'spinal disorder', '관절염': 'arthritis', '골다공증': 'osteoporosis',
  '심근경색': 'myocardial infarction', '협심증': 'angina', '부정맥': 'arrhythmia',
  '혈우병': 'hemophilia', '빈혈': 'anemia', '혈소판': 'thrombocytopenia',
  '루푸스': 'lupus', '베체트': 'Behcet disease', '강직성척추염': 'ankylosing spondylitis',
}

/** 한국어 포함 텍스트에서 영어 검색어 추출 */
function toEnglishSearchTerms(indication: string, drugName: string): string[] {
  const terms: string[] = []
  const combined = `${indication} ${drugName}`
  for (const [ko, en] of Object.entries(KO_EN_DISEASES)) {
    if (combined.includes(ko) && !terms.includes(en)) terms.push(en)
  }
  if (terms.length === 0) {
    const engTerms = [indication, drugName].filter(t => t && /^[a-zA-Z]/.test(t.trim()))
    terms.push(...engTerms)
  }
  return terms
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
      const result = await getHiraData(slug, cacheValid ? existingData : undefined, catalog.indication || undefined)
      // 새로 수집한 데이터를 DB에 명시적으로 저장 (fire-and-forget 방지)
      if (result.rawData && (!cacheValid || !existingData)) {
        await prisma.reportCatalog.updateMany({
          where: { slug },
          data: { hiraData: result.rawData as any, dataSyncedAt: new Date() }
        })
      }
      return NextResponse.json({
        success: true,
        step: 1,
        stepName: 'HIRA 건강보험심사평가원',
        data: {
          hasData: !!result.rawData,
          cached: cacheValid && !!existingData,
          freshlyFetched: !cacheValid || !existingData,
          summary: result.rawData ? `환자수 ${(result.rawData.patientCount || 0).toLocaleString()}명` : '데이터 없음',
        },
      })
    }

    // ── Step 2: ClinicalTrials.gov 데이터 수집 (한영 번역 포함) ──
    if (step === 2) {
      console.log(`[Prepare Step 2] ClinicalTrials 데이터 수집 시작: ${slug}`)
      const existingData = (catalog as any).clinicalTrialsData;
      const cacheValid = !forceRefresh && isCacheValid(syncedAt, existingData);

      if (cacheValid && existingData) {
        const totalCount = (existingData as any).totalCount || ((existingData as any).studies?.length || 0)
        return NextResponse.json({
          success: true, step: 2, stepName: 'ClinicalTrials.gov',
          data: {
            hasData: totalCount > 0, cached: true, freshlyFetched: false,
            summary: totalCount > 0 ? `임상시험 ${totalCount}건` : '데이터 없음',
          }
        })
      }

      const indication = catalog.indication || ''
      const drugName = catalog.drugName || ''
      const searchTerms = toEnglishSearchTerms(indication, drugName)

      // 영어 검색어가 없으면 기존 함수로 폴백
      if (searchTerms.length === 0) {
        const result = await getClinicalTrialsData(slug, undefined)
        return NextResponse.json({
          success: true, step: 2, stepName: 'ClinicalTrials.gov',
          data: {
            hasData: !!result.data, cached: false, freshlyFetched: true,
            summary: result.data ? `임상시험 ${(result.data as any).totalCount || 0}건` : '데이터 없음',
          }
        })
      }

      try {
        const allStudies: any[] = []
        for (const term of searchTerms.slice(0, 2)) {
          const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(term)}&pageSize=20`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            if (data.studies) allStudies.push(...data.studies)
          }
        }

        const clinicalTrialsResult = {
          totalCount: allStudies.length,
          searchTerms,
          studies: allStudies.slice(0, 20).map((s: any) => {
            const pm = s.protocolSection
            return {
              nctId: pm?.identificationModule?.nctId,
              title: pm?.identificationModule?.briefTitle,
              phase: pm?.designModule?.phases?.[0] || 'N/A',
              status: pm?.statusModule?.overallStatus,
              startDate: pm?.statusModule?.startDateStruct?.date,
              sponsor: pm?.sponsorCollaboratorsModule?.leadSponsor?.name,
              condition: pm?.conditionsModule?.conditions?.[0],
            }
          })
        }

        await prisma.reportCatalog.updateMany({
          where: { slug },
          data: { clinicalTrialsData: clinicalTrialsResult as any, dataSyncedAt: new Date() }
        })

        return NextResponse.json({
          success: true, step: 2, stepName: 'ClinicalTrials.gov',
          data: {
            hasData: allStudies.length > 0, cached: false, freshlyFetched: true,
            summary: allStudies.length > 0 ? `임상시험 ${allStudies.length}건` : '데이터 없음',
          }
        })
      } catch (ctError) {
        console.error('[Prepare Step 2] ClinicalTrials 오류:', ctError)
        return NextResponse.json({
          success: true, step: 2, stepName: 'ClinicalTrials.gov',
          data: { hasData: false, cached: false, freshlyFetched: false, summary: '데이터 수집 실패' }
        })
      }
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
          summary: result.data ? `논문 ${result.data.articles?.length || 0}편` : '데이터 없음',
        },
      })
    }

    // ── Step 4: 글로벌 의료데이터 수집 (CMS + PBS + NHS) ──
    if (step === 4) {
      console.log(`[Prepare Step 4] 글로벌 의료데이터 수집 시작: ${slug}`)
      const existingGlobalData = (catalog as any).globalMedicalData;
      const globalCacheValid = !forceRefresh && isCacheValid(syncedAt, existingGlobalData);

      if (globalCacheValid && existingGlobalData) {
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
        // DB에 캐시 저장 (update by primary key)
        console.log(`[Step 4 DB] Saving globalData, catalog.id=${catalog.id}`)
        const updateResult = await prisma.reportCatalog.update({
          where: { id: catalog.id },
          data: { globalMedicalData: globalData as any, dataSyncedAt: new Date() },
        })
        console.log(`[Step 4 DB] Saved OK, dataSyncedAt=${updateResult.dataSyncedAt}`)
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

    // ── Step 5: AI 보고서 생성 ──
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

      let activeOrderId = orderId
      if (currentSectionIdx === 0 && !orderId) {
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
        await prisma.reportOrder.updateMany({
          where: { catalogId: freshCatalog.id, status: { in: ['PENDING', 'GENERATING'] } },
          data: { status: 'FAILED', errorMessage: '새 생성 요청으로 대체됨', completedAt: new Date() },
        })
        const priceMap: Record<string, number> = {
          BASIC: freshCatalog.priceBasic, PRO: freshCatalog.pricePro, PREMIUM: freshCatalog.pricePremium,
        }
        const newOrder = await prisma.reportOrder.create({
          data: {
            catalogId: freshCatalog.id, userId, tier: tier as ReportTier,
            price: priceMap[tier], status: 'GENERATING', progress: 0, startedAt: new Date(),
          },
        })
        activeOrderId = newOrder.id
      }

      if (activeOrderId) {
        const existingOrder = await prisma.reportOrder.findUnique({ where: { id: activeOrderId } })
        if (existingOrder && existingOrder.status === 'COMPLETED') {
          return NextResponse.json({
            success: true, step: 5, stepName: 'AI 보고서 생성',
            data: { orderId: existingOrder.id, status: 'COMPLETED', message: '이미 생성된 보고서가 있습니다' },
          })
        }
      }

      try {
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

        if (activeOrderId) {
          const currentOrder = await prisma.reportOrder.findUnique({ where: { id: activeOrderId } })
          const existingSections: any[] = (currentOrder?.sections as any[]) || []
          const updatedSections = existingSections.filter((s: any) => s.order !== result.section.order)
          updatedSections.push(result.section)
          updatedSections.sort((a: any, b: any) => a.order - b.order)
          const progress = Math.round(((currentSectionIdx + 1) / totalSectionCount) * 100)

          if (result.isLast) {
            await prisma.reportOrder.update({
              where: { id: activeOrderId },
              data: { status: 'COMPLETED', progress: 100, sections: updatedSections as any, completedAt: new Date() },
            })
            return NextResponse.json({
              success: true, step: 5, stepName: 'AI 보고서 생성',
              data: {
                orderId: activeOrderId, status: 'COMPLETED',
                sectionIndex: currentSectionIdx, sectionTitle: result.section.title,
                totalSections: totalSectionCount, isLast: true,
                message: '보고서 생성이 완료되었습니다',
              },
            })
          } else {
            await prisma.reportOrder.update({
              where: { id: activeOrderId },
              data: { progress, sections: updatedSections as any },
            })
            return NextResponse.json({
              success: true, step: 5, stepName: 'AI 보고서 생성',
              data: {
                orderId: activeOrderId, status: 'GENERATING',
                sectionIndex: currentSectionIdx, sectionTitle: result.section.title,
                nextSectionIndex: currentSectionIdx + 1,
                totalSections: totalSectionCount, isLast: false, progress,
                summary: `섹션 ${currentSectionIdx + 1}/${totalSectionCount} 완료: ${result.section.title}`,
              },
            })
          }
        }

        return NextResponse.json({
          success: true, step: 5,
          data: { status: 'GENERATING', sectionIndex: currentSectionIdx, sectionTitle: result.section.title, isLast: result.isLast },
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
          success: false, step: 5,
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
    const globalMedicalData = (catalog as any).globalMedicamData
    const completedOrder = await prisma.reportOrder.findFirst({
      where: { catalogId: catalog.id, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    })
    const cmsCount = globalMedicalData?.cms?.drugSpending?.length || 0;
    const pbsCount = globalMedicalData?.pbs?.items?.length || 0;
    const nhsCount = globalMedicalData?.nhs?.prescriptionSummary?.length || 0;
    const fdaLabels = globalMedicalData?.fda?.labels?.length || 0;
    const fdaEvents = globalMedicalData?.fda?.adverseEvents?.length || 0;
    const fdaApprovals = globalMedicalData?.fda?.approvals?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        slug: catalog.slug,
        steps: {
          1: { name: 'HIRA 건강보험심사평가원', completed: !!hiraData,
            summary: hiraData ? `환자수 ${(hiraData.patientCount || 0).toLocaleString()}명` : null },
          2: { name: 'ClinicalTrials.gov', completed: !!clinicalTrialsData,
            summary: clinicalTrialsData ? `임상시험 ${clinicalTrialsData.totalCount || (Array.isArray(clinicalTrialsData.studies) ? clinicalTrialsData.studies.length : 0)}건` : null },
          3: { name: 'PubMed 논문', completed: !!pubMedData,
            summary: pubMedData ? `논문 ${pubMedData.articles?.length || 0}편` : null },
          4: { name: '글로벌 의료데이터 (CMS·PBS·NHS·FDA)', completed: !!globalMedicalData,
            summary: globalMedicalData ? `CMS ${cmsCount}건 / PBS ${pbsCount}건 / NHS ${nhsCount}건 / FDA 라벨${fdaLabels}·부작용${fdaEvents}·승인${fdaApprovals}건` : null },
          5: { name: 'AI 보고서 생성', completed: !!completedOrder,
            summary: completedOrder ? `${completedOrder.tier} 보고서 생성 완료` : null },
        },
        dataSyncedAt: catalog.dataSyncedAt?.toISOString() || null,
        reportReady: !!completedOrder,
      },
    })
  } catch (error) {
    console.error('[GET /api/reports/prepare] Error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
