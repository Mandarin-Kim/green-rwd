import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureDbConnection } from '@/lib/prisma'
import { getHiraData, getClinicalTrialsData, getPubMedData, generateReport, generateSingleSection, getSectionCount, ReportTier } from '@/lib/report-generator'
import { fetchGlobalMedicalData } from '@/lib/global-medical-apis'

// Vercel Hobby: ìµë 60ì´ â ê° ë¨ê³ë¥¼ 60ì´ ì´ë´ë¡ ë¶ë¦¬
export const maxDuration = 60;

// ìºì ë§ë£ ê¸°ê° (7ì¼)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** DB ìºìê° ì í¨íì§ íì¸ (dataSyncedAt ê¸°ì¤ 7ì¼ ì´ë´) */
function isCacheValid(dataSyncedAt: Date | null, data: any): boolean {
  if (!data) return false;
  if (!dataSyncedAt) return !!data; // ëê¸°í ìê°ì´ ìì¼ë©´ ë°ì´í°ê° ìì¼ë©´ ì í¨
  return (Date.now() - dataSyncedAt.getTime()) < CACHE_TTL_MS;
}

/**
 * POST /api/reports/prepare
 * 4ë¨ê³ ë¶ë¦¬ ë³´ê³ ì ìì± API
 *
 * step=1: HIRA ë°ì´í° ìì§ (ê±´ê°ë³´íì¬ì¬íê°ì)
 * step=2: ClinicalTrials.gov ìììí ë°ì´í° ìì§
 * step=3: PubMed ë¼ë¬¸ ê²ì
 * step=4: ê¸ë¡ë² ìë£ë°ì´í° ìì§ (CMS Medicare + PBS Australia + NHS UK)
 * step=5: AI ë³´ê³ ì ìì± (ìºìë ë°ì´í° íì©)
 *
 * forceRefresh=true: ìºìë¥¼ ë¬´ìíê³  ê°ì ë¡ ì¬ìì§
 */
export async function POST(request: NextRequest) {
  try {
    // Neon ì ì ëª¨ë ëì: DB ì°ê²° íì¸ (ìµë 3í ì¬ìë)
    const dbReady = await ensureDbConnection()
    if (!dbReady) {
      return NextResponse.json(
        { success: false, error: 'ë°ì´í°ë² ì´ì¤ ì°ê²°ì ì¤í¨íìµëë¤. ì ì í ë¤ì ìëí´ì£¼ì¸ì.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { slug, step, tier = 'BASIC', orderId, forceRefresh = false, sectionIndex } = body

    if (!slug) {
      return NextResponse.json({ error: 'slugê° íìí©ëë¤' }, { status: 400 })
    }

    if (!step || ![1, 2, 3, 4, 5].includes(step)) {
      return NextResponse.json({ error: 'stepì 1~5 ì¬ì´ì¬ì¼ í©ëë¤' }, { status: 400 })
    }

    // ì¹´íë¡ê·¸ ì¡°í
    const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
    if (!catalog) {
      return NextResponse.json({ error: 'ì¹´íë¡ê·¸ë¥¼ ì°¾ì ì ììµëë¤' }, { status: 404 })
    }

    const syncedAt = catalog.dataSyncedAt;

    // ââ Step 1: HIRA ë°ì´í° ìì§ ââ
    if (step === 1) {
      console.log(`[Prepare Step 1] HIRA ë°ì´í° ìì§ ìì: ${slug}`)
      const existingData = (catalog as any).hiraData;
      const cacheValid = !forceRefresh && isCacheValid(syncedAt, existingData);

      // DB ìºìê° ì í¨íë©´ API í¸ì¶ ìì´ ë°ë¡ ë°í
      // indication ì ë¬: ì»¤ì¤í ë³´ê³ ìììë HIRA ì§ë³ì½ë ëì  ë§¤í ê°ë¥
      const result = await getHiraData(slug, cacheValid ? existingData : undefined, catalog.indication || undefined)

      return NextResponse.json({
        success: true,
        step: 1,
        stepName: 'HIRA ê±´ê°ë³´íì¬ì¬íê°ì',
        data: {
          hasData: !!result.rawData,
          cached: cacheValid && !!existingData,
          freshlyFetched: !cacheValid || !existingData,
          summary: result.rawData
            ? `íìì ${(result.rawData.patientCount || 0).toLocaleString()}ëª`
            : 'ë°ì´í° ìì',
        },
      })
    }

    // ââ Step 2: ClinicalTrials.gov ë°ì´í° ìì§ ââ
    if (step === 2) {
      console.log(`[Prepare Step 2] ClinicalTrials ë°ì´í° ìì§ ìì: ${slug}`)
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
            ? `ìììí ${result.data.totalCount || 0}ê±´`
            : 'ë°ì´í° ìì',
        },
      })
    }

    // ââ Step 3: PubMed ë¼ë¬¸ ê²ì ââ
    if (step === 3) {
      console.log(`[Prepare Step 3] PubMed ë¼ë¬¸ ê²ì ìì: ${slug}`)
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
        stepName: 'PubMed ë¼ë¬¸',
        data: {
          hasData: !!result.data,
          cached: cacheValid && !!existingData,
          freshlyFetched: !cacheValid || !existingData,
          summary: result.data
            ? `ë¼ë¬¸ ${result.data.articles?.length || 0}í¸`
            : 'ë°ì´í° ìì',
        },
      })
    }

    // ââ Step 4: ê¸ë¡ë² ìë£ë°ì´í° ìì§ (CMS + PBS + NHS) ââ
    if (step === 4) {
      console.log(`[Prepare Step 4] ê¸ë¡ë² ìë£ë°ì´í° ìì§ ìì: ${slug}`)
      const existingGlobalData = (catalog as any).globalMedicalData;
      const globalCacheValid = !forceRefresh && isCacheValid(syncedAt, existingGlobalData);

      if (globalCacheValid && existingGlobalData) {
        // ìºì ì í¨ â API í¸ì¶ ìì´ ë°í
        const cmsCount = existingGlobalData.cms?.drugSpending?.length || 0;
        const pbsCount = existingGlobalData.pbs?.items?.length || 0;
        const nhsCount = existingGlobalData.nhs?.prescriptionSummary?.length || 0;
        const fdaLabels = existingGlobalData.fda?.labels?.length || 0;
        const fdaEvents = existingGlobalData.fda?.adverseEvents?.length || 0;
        const fdaApprovals = existingGlobalData.fda?.approvals?.length || 0;
        return NextResponse.json({
          success: true,
          step: 4,
          stepName: 'ê¸ë¡ë² ìë£ë°ì´í° (CMSÂ·PBSÂ·NHSÂ·FDA)',
          data: {
            hasData: true,
            cached: true,
            freshlyFetched: false,
            summary: `CMS ${cmsCount}ê±´ / PBS ${pbsCount}ê±´ / NHS ${nhsCount}ê±´ / FDA ë¼ë²¨${fdaLabels}Â·ë¶ìì©${fdaEvents}Â·ì¹ì¸${fdaApprovals}ê±´`,
          },
        });
      }

      try {
        const globalData = await fetchGlobalMedicalData(
          catalog.drugName || '',
          catalog.indication || ''
        );

        // DBì ìºì ì ì¥
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
          stepName: 'ê¸ë¡ë² ìë£ë°ì´í° (CMSÂ·PBSÂ·NHSÂ·FDA)',
          data: {
            hasData: cmsCount > 0 || pbsCount > 0 || nhsCount > 0 || totalFda > 0,
            cached: false,
            freshlyFetched: true,
            summary: `CMS ${cmsCount}ê±´ / PBS ${pbsCount}ê±´ / NHS ${nhsCount}ê±´ / FDA ë¼ë²¨${fdaLabels}Â·ë¶ìì©${fdaEvents}Â·ì¹ì¸${fdaApprovals}ê±´`,
          },
        });
      } catch (globalError) {
        console.error(`[Prepare Step 4] ê¸ë¡ë² ë°ì´í° ìì§ ì¤í¨:`, globalError);
        return NextResponse.json({
          success: true,
          step: 4,
          stepName: 'ê¸ë¡ë² ìë£ë°ì´í° (CMSÂ·PBSÂ·NHSÂ·FDA)',
          data: {
            hasData: false,
            cached: false,
            freshlyFetched: false,
            summary: 'ê¸ë¡ë² ë°ì´í° ìì§ ì¤í¨ (ë³´ê³ ì ìì±ìë ìí¥ ìì)',
          },
        });
      }
    }

    // ââ Step 5: AI ë³´ê³ ì ìì± (ì¹ìë³ ë¶í  ìì± - Vercel 60ì´ ëì) ââ
    // sectionIndexê° ìì¼ë©´ ì ì£¼ë¬¸ ìì± + ì²« ì¹ì, ìì¼ë©´ í´ë¹ ì¹ìë§ ìì±
    if (step === 5) {
      if (!['BASIC', 'PRO', 'PREMIUM'].includes(tier)) {
        return NextResponse.json({ error: 'ì í¨íì§ ìì í°ì´ìëë¤' }, { status: 400 })
      }

      const freshCatalog = await prisma.reportCatalog.findUnique({ where: { slug } })
      if (!freshCatalog) {
        return NextResponse.json({ error: 'ì¹´íë¡ê·¸ë¥¼ ì°¾ì ì ììµëë¤' }, { status: 404 })
      }

      const cachedHiraData = (freshCatalog as any).hiraData || undefined
      const cachedCT = (freshCatalog as any).clinicalTrialsData || undefined
      const cachedPubMed = (freshCatalog as any).pubMedData || undefined
      const currentSectionIdx = typeof sectionIndex === 'number' ? sectionIndex : 0
      const totalSectionCount = getSectionCount(tier as ReportTier) + (cachedPubMed?.articles?.length > 0 ? 1 : 0)

      console.log(`[Prepare Step 5] ì¹ì ${currentSectionIdx + 1}/${totalSectionCount} ìì±: ${slug} (tier: ${tier})`)

      // ââ ì²« ì¹ì(sectionIndex=0)ì¼ ë: ì£¼ë¬¸ ìì± ââ
      let activeOrderId = orderId
      if (currentSectionIdx === 0 && !orderId) {
        // ì ì  íë³´
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
              data: { email: 'guest@green-rwd.system', name: 'ê²ì¤í¸', role: 'USER' },
            })
          }
          userId = guestUser.id
        }

        // ì´ì  ë¯¸ìë£ ì£¼ë¬¸ ì ë¦¬
        await prisma.reportOrder.updateMany({
          where: {
            catalogId: freshCatalog.id,
            status: { in: ['PENDING', 'GENERATING'] },
          },
          data: {
            status: 'FAILED',
            errorMessage: 'ì ìì± ìì²­ì¼ë¡ ëì²´ë¨',
            completedAt: new Date(),
          },
        })

        // ì ì£¼ë¬¸ ìì±
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

      // orderIdê° ìëë° ì´ë¯¸ ìë£ë ê²½ì° ë°ë¡ ë°í
      if (activeOrderId) {
        const existingOrder = await prisma.reportOrder.findUnique({ where: { id: activeOrderId } })
        if (existingOrder && existingOrder.status === 'COMPLETED') {
          return NextResponse.json({
            success: true,
            step: 5,
            stepName: 'AI ë³´ê³ ì ìì±',
            data: {
              orderId: existingOrder.id,
              status: 'COMPLETED',
              message: 'ì´ë¯¸ ìì±ë ë³´ê³ ìê° ììµëë¤',
            },
          })
        }
      }

      try {
        // ë¨ì¼ ì¹ì ìì± (íììì ë°©ì§)
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

        // ê¸°ì¡´ ì£¼ë¬¸ì sectionsì ì´ë² ì¹ìì ì¶ê° ì ì¥
        if (activeOrderId) {
          const currentOrder = await prisma.reportOrder.findUnique({ where: { id: activeOrderId } })
          const existingSections: any[] = (currentOrder?.sections as any[]) || []
          // ê°ì ì¸ë±ì¤ ì¹ìì´ ì´ë¯¸ ìì¼ë©´ êµì²´, ìì¼ë©´ ì¶ê°
          const updatedSections = existingSections.filter((s: any) => s.order !== result.section.order)
          updatedSections.push(result.section)
          updatedSections.sort((a: any, b: any) => a.order - b.order)

          const progress = Math.round(((currentSectionIdx + 1) / totalSectionCount) * 100)

          if (result.isLast) {
            // ë§ì§ë§ ì¹ì â ìë£ ì²ë¦¬
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
              stepName: 'AI ë³´ê³ ì ìì±',
              data: {
                orderId: activeOrderId,
                status: 'COMPLETED',
                sectionIndex: currentSectionIdx,
                sectionTitle: result.section.title,
                totalSections: totalSectionCount,
                isLast: true,
                message: 'ë³´ê³ ì ìì±ì´ ìë£ëììµëë¤',
              },
            })
          } else {
            // ì¤ê° ì¹ì â ì§í ìí ì ì¥
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
              stepName: 'AI ë³´ê³ ì ìì±',
              data: {
                orderId: activeOrderId,
                status: 'GENERATING',
                sectionIndex: currentSectionIdx,
                sectionTitle: result.section.title,
                nextSectionIndex: currentSectionIdx + 1,
                totalSections: totalSectionCount,
                isLast: false,
                progress,
                summary: `ì¹ì ${currentSectionIdx + 1}/${totalSectionCount} ìë£: ${result.section.title}`,
              },
            })
          }
        }

        // orderIdê° ìë ë¹ì ì ì¼ì´ì¤
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
        console.error(`[Prepare Step 5] ì¹ì ${currentSectionIdx} ìì± ì¤í¨:`, genError)
        if (activeOrderId) {
          await prisma.reportOrder.update({
            where: { id: activeOrderId },
            data: {
              status: 'FAILED',
              errorMessage: genError instanceof Error ? genError.message : 'ë³´ê³ ì ìì± ì¤í¨',
              completedAt: new Date(),
            },
          }).catch(() => {})
        }
        return NextResponse.json({
          success: false,
          step: 5,
          error: genError instanceof Error ? genError.message : 'ë³´ê³ ì ìì± ì¤ ì¤ë¥ê° ë°ìíìµëë¤',
          data: { orderId: activeOrderId, status: 'FAILED', sectionIndex: currentSectionIdx },
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'ì ì ìë stepìëë¤' }, { status: 400 })
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
 * ê° ë¨ê³ë³ ìºì ìí íì¸
 */
export async function GET(request: NextRequest) {
  try {
    // Neon ì ì ëª¨ë ëì
    await ensureDbConnection()

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'slugê° íìí©ëë¤' }, { status: 400 })
    }

    const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
    if (!catalog) {
      return NextResponse.json({ error: 'ì¹´íë¡ê·¸ë¥¼ ì°¾ì ì ììµëë¤' }, { status: 404 })
    }

    const hiraData = (catalog as any).hiraData
    const clinicalTrialsData = (catalog as any).clinicalTrialsData
    const pubMedData = (catalog as any).pubMedData
    const globalMedicalData = (catalog as any).globalMedicalData

    // ìë£ë ë³´ê³ ìê° ìëì§ íì¸
    const completedOrder = await prisma.reportOrder.findFirst({
      where: {
        catalogId: catalog.id,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    })

    // ê¸ë¡ë² ë°ì´í° ìì½ ìì±
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
            name: 'HIRA ê±´ê°ë³´íì¬ì¬íê°ì',
            completed: !!hiraData,
            summary: hiraData
              ? `íìì ${(hiraData.patientCount || 0).toLocaleString()}ëª`
              : null,
          },
          2: {
            name: 'ClinicalTrials.gov',
            completed: !!clinicalTrialsData,
            summary: clinicalTrialsData
              ? `ìììí ${clinicalTrialsData.totalCount || (Array.isArray(clinicalTrialsData.studies) ? clinicalTrialsData.studies.length : 0)}ê±´`
              : null,
          },
          3: {
            name: 'PubMed ë¼ë¬¸',
            completed: !!pubMedData,
            summary: pubMedData
              ? `ë¼ë¬¸ ${pubMedData.articles?.length || 0}í¸`
              : null,
          },
          4: {
            name: 'ê¸ë¡ë² ìë£ë°ì´í° (CMSÂ·PBSÂ·NHSÂ·FDA)',
            completed: !!globalMedicalData,
            summary: globalMedicalData
              ? `CMS ${cmsCount}ê±´ / PBS ${pbsCount}ê±´ / NHS ${nhsCount}ê±´ / FDA ë¼ë²¨${fdaLabels}Â·ë¶ìì©${fdaEvents}Â·ì¹ì¸${fdaApprovals}ê±´`
              : null,
          },
          5: {
            name: 'AI ë³´ê³ ì ìì±',
            completed: !!completedOrder,
            summary: completedOrder
              ? `${completedOrder.tier} ë³´ê³ ì ìì± ìë£`
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
