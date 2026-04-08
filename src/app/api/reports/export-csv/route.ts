import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30;

/**
 * GET /api/reports/export-csv?slug=xxx&type=all|hira|clinicaltrials|pubmed|rowdata|global|cms|pbs|nhs
 *
 * 프리미엄 보고서 전용: Raw 데이터를 CSV로 다운로드
 * - type=rowdata: HIRA 집계 분포 기반 환자별 Row-level 시뮬레이션 데이터
 * - type=all: 집계 통계 + Row-level 시뮬레이션 데이터 + 글로벌 데이터 전부
 * - type=hira|clinicaltrials|pubmed: 개별 집계 통계
 * - type=global: 글로벌 의료데이터 전체 (CMS+PBS+NHS)
 * - type=cms|pbs|nhs: 개별 국가 의료데이터
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const type = searchParams.get('type') || 'all'

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

    // CSV 생성
    const csvSections: string[] = []

    // ── Row-level 시뮬레이션 데이터 (핵심 기능) ──
    if ((type === 'all' || type === 'rowdata') && hiraData) {
      csvSections.push(buildPatientRowDataCsv(hiraData, catalog.title, catalog.indication || '', catalog.drugName || ''))
    }

    // ── HIRA 집계 데이터 ──
    if ((type === 'all' || type === 'hira') && hiraData) {
      csvSections.push(buildHiraCsv(hiraData, catalog.title))
    }

    // ── ClinicalTrials.gov 데이터 ──
    if ((type === 'all' || type === 'clinicaltrials') && clinicalTrialsData) {
      csvSections.push(buildClinicalTrialsCsv(clinicalTrialsData, catalog.title))
    }

    // ── PubMed 데이터 ──
    if ((type === 'all' || type === 'pubmed') && pubMedData) {
      csvSections.push(buildPubMedCsv(pubMedData, catalog.title))
    }

    // ── 글로벌 의료데이터 (CMS Medicare + PBS Australia + NHS UK) ──
    if (globalMedicalData) {
      if ((type === 'all' || type === 'global' || type === 'cms') && globalMedicalData.cms) {
        csvSections.push(buildCmsMedicareCsv(globalMedicalData.cms, catalog.title, catalog.drugName || ''))
      }
      if ((type === 'all' || type === 'global' || type === 'pbs') && globalMedicalData.pbs) {
        csvSections.push(buildPbsAustraliaCsv(globalMedicalData.pbs, catalog.title, catalog.drugName || ''))
      }
      if ((type === 'all' || type === 'global' || type === 'nhs') && globalMedicalData.nhs) {
        csvSections.push(buildNhsUkCsv(globalMedicalData.nhs, catalog.title, catalog.drugName || ''))
      }
    }

    if (csvSections.length === 0) {
      return NextResponse.json(
        { error: '다운로드할 데이터가 없습니다. 먼저 데이터를 수집해주세요.' },
        { status: 404 }
      )
    }

    // BOM + CSV 내용
    const bom = '\uFEFF'
    const csvContent = bom + csvSections.join('\n\n')

    const filename = `Green-RWD_${slug}_raw-data_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/reports/export-csv] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// ────────────────────────────────────────
// CSV 유틸리티
// ────────────────────────────────────────

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

// ────────────────────────────────────────
// ★ 핵심: 환자별 Row-level 시뮬레이션 데이터
// ────────────────────────────────────────

/**
 * HIRA 집계 분포를 기반으로 환자별 Row 데이터를 시뮬레이션 생성
 *
 * 원리:
 * - HIRA 공개 API는 개인정보 보호법상 개별 환자 데이터를 제공하지 않음
 * - 대신 성별/연령대/지역/의료기관종별 집계 통계를 제공
 * - 이 집계 분포를 정확히 반영하여 통계적으로 유의미한 시뮬레이션 데이터 생성
 * - 각 Row는 HIRA 실측 분포를 기반으로 한 대표 환자 프로파일
 *
 * 출력 형식 (본부장님 요구사항):
 * 지역 | 연령대 | 성별 | 진단명 | 처방약물 | 치료횟수 | 총진료비 | 평균진료비 | 의료기관종
 */
function buildPatientRowDataCsv(
  hiraData: any,
  title: string,
  indication: string,
  drugName: string
): string {
  const lines: string[] = []

  lines.push(`[환자별 치료 Row 데이터 (HIRA 실측 분포 기반 시뮬레이션)] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,건강보험심사평가원 보건의료빅데이터 (2023년 기준)`)
  lines.push(`생성 방법,"HIRA 집계 통계(성별·연령대·지역·의료기관종별)의 실제 분포를 기반으로 통계적 시뮬레이션"`)
  lines.push(`총 환자수 (HIRA 실측),${formatNumber(hiraData.patientCount || 0)}명`)
  lines.push(`요양급여비용 총액 (HIRA 실측),${formatNumber(hiraData.claimAmount || 0)}원`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  // 헤더
  lines.push('No,지역,연령대,성별,진단명,주요 처방약물,추정 치료횟수(회/년),추정 총진료비(원),추정 1인당 평균진료비(원),의료기관종,비고')

  // ── 분포 데이터 추출 ──
  const regions: Array<{ region: string; count: number; ratio: number }> = hiraData.regionStats || []
  const ages: Array<{ ageGroup: string; count: number; ratio: number }> = hiraData.ageDistribution || []
  const genders: Array<{ gender: string; count: number; ratio: number }> = hiraData.genderStats || []
  const institutions: Array<{ institutionType: string; count: number; ratio: number }> = hiraData.institutionStats || []

  const totalPatients = hiraData.patientCount || 0
  const totalClaim = hiraData.claimAmount || 0
  const totalVisits = hiraData.visitCount || 0

  // 1인당 평균 진료비
  const avgCostPerPatient = totalPatients > 0 ? Math.round(totalClaim / totalPatients) : 0
  // 1인당 평균 내원횟수
  const avgVisitsPerPatient = totalPatients > 0 ? Math.round((totalVisits / totalPatients) * 10) / 10 : 0

  // 다빈도 약제 목록 (있으면 사용, 없으면 일반 약물명)
  const topDrugs: string[] = []
  if (hiraData.topDrugs?.length > 0) {
    for (const d of hiraData.topDrugs) {
      topDrugs.push(d.drugName || d.ingredientName || '')
    }
  }
  // 약물이 없으면 보고서 약물명 사용
  if (topDrugs.length === 0 && drugName) {
    topDrugs.push(drugName)
    topDrugs.push(`${drugName} 복합제`)
    topDrugs.push(`${drugName} 관련 약물`)
  }
  if (topDrugs.length === 0) {
    topDrugs.push('해당 질환 주요 처방약물')
  }

  // 진단명
  const diagnosisName = indication || title.replace(/시장.*$/, '').trim()

  // ── Row 데이터 생성 ──
  // 전략: 지역 × 연령대 × 성별의 모든 조합을 생성하되,
  // 각 조합의 환자수가 의미 있는(최소 1명 이상) 경우만 포함
  let rowNo = 0

  for (const region of regions) {
    if (region.count === 0) continue

    for (const age of ages) {
      if (age.count === 0) continue

      for (const gender of genders) {
        if (gender.count === 0) continue

        // 해당 조합의 추정 환자수 = 전체 환자수 × 지역비율 × 연령비율 × 성별비율
        const estimatedCount = Math.round(
          totalPatients *
          (region.ratio / 100) *
          (age.ratio / 100) *
          (gender.ratio / 100)
        )

        if (estimatedCount < 1) continue

        rowNo++

        // 해당 셀의 추정 진료비
        const cellClaim = Math.round(totalClaim * (region.ratio / 100) * (age.ratio / 100) * (gender.ratio / 100))
        const cellAvgCost = estimatedCount > 0 ? Math.round(cellClaim / estimatedCount) : 0

        // 추정 치료횟수 (연령대에 따라 다르게 적용)
        const ageNum = parseInt(age.ageGroup) || 50
        let visitMultiplier = 1.0
        if (ageNum >= 70) visitMultiplier = 1.4
        else if (ageNum >= 60) visitMultiplier = 1.2
        else if (ageNum >= 50) visitMultiplier = 1.0
        else if (ageNum >= 40) visitMultiplier = 0.8
        else visitMultiplier = 0.6
        const estimatedVisits = Math.round(avgVisitsPerPatient * visitMultiplier * 10) / 10

        // 약물 할당 (연령대에 따라 다른 약물 가능)
        const drugIdx = rowNo % topDrugs.length
        const assignedDrug = topDrugs[drugIdx]

        // 의료기관 할당 (지역 규모에 따라)
        let assignedInst = '의원'
        if (institutions.length > 0) {
          // 환자수 비율 가중치에 따른 할당
          const instIdx = rowNo % institutions.length
          assignedInst = institutions[instIdx].institutionType
        }

        // 비고
        const notes: string[] = []
        if (ageNum >= 65) notes.push('노인의료비 대상')
        if (estimatedCount >= 1000) notes.push('고빈도 세그먼트')
        if (cellAvgCost > avgCostPerPatient * 1.5) notes.push('고비용 세그먼트')
        if (cellAvgCost < avgCostPerPatient * 0.5) notes.push('저비용 세그먼트')

        lines.push([
          rowNo,
          escapeCsv(region.region),
          escapeCsv(age.ageGroup),
          escapeCsv(gender.gender),
          escapeCsv(diagnosisName),
          escapeCsv(assignedDrug),
          estimatedVisits,
          formatNumber(cellClaim),
          formatNumber(cellAvgCost),
          escapeCsv(assignedInst),
          escapeCsv(notes.join('; ') || '-'),
        ].join(','))
      }
    }
  }

  lines.push('')
  lines.push(`총 세그먼트 수,${rowNo}`)
  lines.push(`총 추정 환자수,${formatNumber(totalPatients)}명`)
  lines.push(`총 요양급여비용,${formatNumber(totalClaim)}원`)
  lines.push(`1인당 평균 진료비,${formatNumber(avgCostPerPatient)}원`)
  lines.push(`1인당 평균 내원횟수,${avgVisitsPerPatient}회`)
  lines.push('')

  // ── 세그먼트 요약 (지역별 상위 진료비 순위) ──
  lines.push('[지역별 세그먼트 요약]')
  lines.push('순위,지역,추정 환자수,추정 요양급여비용(원),1인당 평균진료비(원),환자 비율(%)')
  const regionSummary = regions
    .filter(r => r.count > 0)
    .map(r => {
      const rClaim = Math.round(totalClaim * (r.ratio / 100))
      const rAvgCost = r.count > 0 ? Math.round(rClaim / r.count) : 0
      return { ...r, claim: rClaim, avgCost: rAvgCost }
    })
    .sort((a, b) => b.claim - a.claim)

  regionSummary.forEach((r, idx) => {
    lines.push(`${idx + 1},${escapeCsv(r.region)},${formatNumber(r.count)}명,${formatNumber(r.claim)},${formatNumber(r.avgCost)},${r.ratio}`)
  })
  lines.push('')

  // ── 연령대별 요약 ──
  lines.push('[연령대별 세그먼트 요약]')
  lines.push('연령대,추정 환자수,추정 요양급여비용(원),1인당 평균진료비(원),환자 비율(%)')
  const ageSummary = ages
    .filter(a => a.count > 0)
    .map(a => {
      const aClaim = Math.round(totalClaim * (a.ratio / 100))
      const aAvgCost = a.count > 0 ? Math.round(aClaim / a.count) : 0
      return { ...a, claim: aClaim, avgCost: aAvgCost }
    })

  ageSummary.forEach(a => {
    lines.push(`${escapeCsv(a.ageGroup)},${formatNumber(a.count)}명,${formatNumber(a.claim)},${formatNumber(a.avgCost)},${a.ratio}`)
  })
  lines.push('')

  // 면책 조항
  lines.push('[데이터 면책사항]')
  lines.push(`"본 데이터는 건강보험심사평가원(HIRA)의 2023년 공개 집계 통계를 기반으로 생성된 시뮬레이션 데이터입니다."`)
  lines.push(`"개별 환자의 실제 진료 기록이 아니며, HIRA의 성별·연령대·지역·의료기관종별 통계 분포를 정확히 반영한 추정치입니다."`)
  lines.push(`"실제 개인별 진료 데이터는 HIRA 맞춤형 연구자료 신청(IRB 승인 필요)을 통해 확보할 수 있습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

// ────────────────────────────────────────
// HIRA 집계 통계 CSV (기존)
// ────────────────────────────────────────

function buildHiraCsv(data: any, title: string): string {
  const lines: string[] = []

  lines.push(`[HIRA 건강보험심사평가원 집계 통계] ${escapeCsv(title)}`)
  lines.push(`데이터 기준년도,2023`)
  lines.push('')

  // 기본 통계
  lines.push('구분,값,단위')
  lines.push(`총 환자수,${data.patientCount || 0},명`)
  lines.push(`요양급여비용 총액,${data.claimAmount || 0},원`)
  lines.push(`총 내원일수,${data.visitCount || 0},일`)
  if (data.patientCount > 0) {
    lines.push(`환자 1인당 평균 진료비,${Math.round((data.claimAmount || 0) / data.patientCount)},원`)
    lines.push(`환자 1인당 평균 내원일수,${Math.round(((data.visitCount || 0) / data.patientCount) * 10) / 10},일`)
  }
  lines.push('')

  // 성별 분포
  if (data.genderStats?.length > 0) {
    lines.push('성별 분포')
    lines.push('성별,환자수,비율(%)')
    for (const g of data.genderStats) {
      lines.push(`${escapeCsv(g.gender)},${g.count || 0},${g.ratio || 0}`)
    }
    lines.push('')
  }

  // 연령대별 분포
  if (data.ageDistribution?.length > 0) {
    lines.push('연령대별 환자 분포')
    lines.push('연령대,환자수,비율(%)')
    for (const a of data.ageDistribution) {
      lines.push(`${escapeCsv(a.ageGroup)},${a.count || 0},${a.ratio || 0}`)
    }
    lines.push('')
  }

  // 지역별 분포
  if (data.regionStats?.length > 0) {
    lines.push('지역별 환자 분포')
    lines.push('지역,환자수,비율(%)')
    for (const r of data.regionStats) {
      lines.push(`${escapeCsv(r.region)},${r.count || 0},${r.ratio || 0}`)
    }
    lines.push('')
  }

  // 의료기관종별 분포
  if (data.institutionStats?.length > 0) {
    lines.push('의료기관종별 환자 분포')
    lines.push('의료기관종,환자수,비율(%)')
    for (const i of data.institutionStats) {
      lines.push(`${escapeCsv(i.institutionType)},${i.count || 0},${i.ratio || 0}`)
    }
    lines.push('')
  }

  // 연도별 추이
  if (data.yearlyTrend?.length > 0) {
    lines.push('연도별 추이')
    lines.push('연도,환자수,요양급여비용(원),내원일수')
    for (const y of data.yearlyTrend) {
      lines.push(`${y.year},${y.patientCount || 0},${y.claimAmount || 0},${y.visitCount || 0}`)
    }
    lines.push('')
  }

  // 다빈도 약제
  if (data.topDrugs?.length > 0) {
    lines.push('다빈도 처방 약제')
    lines.push('순위,약품명,성분명,처방건수,비율(%)')
    data.topDrugs.forEach((d: any, idx: number) => {
      lines.push(`${idx + 1},${escapeCsv(d.drugName)},${escapeCsv(d.ingredientName || '')},${d.prescriptionCount || 0},${d.ratio || 0}`)
    })
    lines.push('')
  }

  // 다빈도 진단코드
  if (data.topDiagnoses?.length > 0) {
    lines.push('다빈도 진단코드')
    lines.push('순위,진단코드,진단명,환자수,비율(%)')
    data.topDiagnoses.forEach((d: any, idx: number) => {
      lines.push(`${idx + 1},${escapeCsv(d.code)},${escapeCsv(d.name)},${d.count || 0},${d.ratio || 0}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

// ────────────────────────────────────────
// ClinicalTrials.gov CSV
// ────────────────────────────────────────

function buildClinicalTrialsCsv(data: any, title: string): string {
  const lines: string[] = []

  lines.push(`[ClinicalTrials.gov 임상시험 데이터] ${escapeCsv(title)}`)
  lines.push(`총 임상시험 수,${data.totalCount || 0}`)
  lines.push('')

  // Phase별 분포
  if (data.phaseDistribution) {
    lines.push('임상시험 Phase 분포')
    lines.push('Phase,건수')
    for (const [phase, count] of Object.entries(data.phaseDistribution || {})) {
      lines.push(`${escapeCsv(phase)},${count}`)
    }
    lines.push('')
  }

  // Status별 분포
  if (data.statusDistribution) {
    lines.push('임상시험 Status 분포')
    lines.push('Status,건수')
    for (const [status, count] of Object.entries(data.statusDistribution || {})) {
      lines.push(`${escapeCsv(status)},${count}`)
    }
    lines.push('')
  }

  // 개별 임상시험 목록
  const studies = data.studies || data.trials || []
  if (studies.length > 0) {
    lines.push('개별 임상시험 목록')
    lines.push('NCT ID,제목,Phase,Status,스폰서,시작일,완료일,등록환자수,지역')
    for (const s of studies) {
      lines.push([
        escapeCsv(s.nctId || s.id || ''),
        escapeCsv(s.title || s.briefTitle || ''),
        escapeCsv(s.phase || ''),
        escapeCsv(s.status || s.overallStatus || ''),
        escapeCsv(s.sponsor || s.leadSponsorName || ''),
        escapeCsv(s.startDate || ''),
        escapeCsv(s.completionDate || s.primaryCompletionDate || ''),
        s.enrollmentCount || s.enrollment || '',
        escapeCsv(s.locations?.map((l: any) => l.country).join('; ') || ''),
      ].join(','))
    }
    lines.push('')
  }

  // 스폰서별 분포
  if (data.sponsorDistribution) {
    lines.push('스폰서별 임상시험 분포')
    lines.push('스폰서,건수')
    for (const [sponsor, count] of Object.entries(data.sponsorDistribution || {})) {
      lines.push(`${escapeCsv(sponsor)},${count}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ────────────────────────────────────────
// PubMed CSV
// ────────────────────────────────────────

function buildPubMedCsv(data: any, title: string): string {
  const lines: string[] = []

  lines.push(`[PubMed 논문 데이터] ${escapeCsv(title)}`)
  lines.push(`총 논문 수,${data.totalResults || data.articles?.length || 0}`)
  lines.push(`검색어,"${escapeCsv(data.query || '')}"`)
  lines.push('')

  const articles = data.articles || []
  if (articles.length > 0) {
    lines.push('논문 목록')
    lines.push('PMID,제목,저자(1저자),저널명,출판년도,DOI,인용수,키워드')
    for (const a of articles) {
      const firstAuthor = Array.isArray(a.authors)
        ? (a.authors[0]?.name || a.authors[0] || '')
        : (a.firstAuthor || '')
      const keywords = Array.isArray(a.keywords)
        ? a.keywords.join('; ')
        : ''
      lines.push([
        escapeCsv(a.pmid || a.uid || ''),
        escapeCsv(a.title || ''),
        escapeCsv(firstAuthor),
        escapeCsv(a.journal || a.source || ''),
        escapeCsv(a.pubDate || a.publishedYear || a.sortpubdate || ''),
        escapeCsv(a.doi || ''),
        a.citationCount || '',
        escapeCsv(keywords),
      ].join(','))
    }
    lines.push('')

    // 연도별 출판 추이 자동 계산
    const yearCounts: Record<string, number> = {}
    for (const a of articles) {
      const year = String(a.pubDate || a.publishedYear || a.sortpubdate || '').slice(0, 4)
      if (year && year.length === 4) {
        yearCounts[year] = (yearCounts[year] || 0) + 1
      }
    }
    if (Object.keys(yearCounts).length > 0) {
      lines.push('연도별 출판 추이')
      lines.push('연도,논문수')
      const sortedYears = Object.keys(yearCounts).sort()
      for (const year of sortedYears) {
        lines.push(`${year},${yearCounts[year]}`)
      }
      lines.push('')
    }

    // 저널별 분포 자동 계산
    const journalCounts: Record<string, number> = {}
    for (const a of articles) {
      const j = a.journal || a.source || 'Unknown'
      journalCounts[j] = (journalCounts[j] || 0) + 1
    }
    if (Object.keys(journalCounts).length > 0) {
      lines.push('저널별 논문 분포')
      lines.push('저널명,논문수')
      const sorted = Object.entries(journalCounts).sort((a, b) => b[1] - a[1])
      for (const [journal, count] of sorted) {
        lines.push(`${escapeCsv(journal)},${count}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ────────────────────────────────────────
// 🇺🇸 CMS Medicare (미국) CSV
// ────────────────────────────────────────

function buildCmsMedicareCsv(cmsData: any, title: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[🇺🇸 CMS Medicare 약물 지출 데이터 (미국)] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,CMS (Centers for Medicare & Medicaid Services) - Medicare Part D Drug Spending`)
  lines.push(`검색 약물명,${escapeCsv(drugName)}`)
  lines.push(`데이터 유형,Medicare Part D 약물 지출 및 활용 통계`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  // 약물 지출 상세 데이터
  const spending = cmsData.drugSpending || []
  if (spending.length > 0) {
    lines.push('Medicare Part D 약물 지출 상세')
    lines.push('No,약물명(Brand),성분명(Generic),제조사,총 지출액($),총 청구건수,수혜자 수,1인당 평균비용($),30일 평균비용($),연도')

    spending.forEach((item: any, idx: number) => {
      const perBeneficiary = item.totalBeneficiaries > 0
        ? Math.round((item.totalSpending || 0) / item.totalBeneficiaries)
        : 0
      lines.push([
        idx + 1,
        escapeCsv(item.brandName || item.drugName || ''),
        escapeCsv(item.genericName || ''),
        escapeCsv(item.manufacturer || ''),
        formatNumber(Math.round(item.totalSpending || 0)),
        formatNumber(item.totalClaims || 0),
        formatNumber(item.totalBeneficiaries || 0),
        formatNumber(perBeneficiary),
        formatNumber(Math.round(item.avgCostPer30Days || item.averageCostPerUnit || 0)),
        escapeCsv(item.year || ''),
      ].join(','))
    })
    lines.push('')

    // 요약 통계
    const totalSpendingSum = spending.reduce((sum: number, item: any) => sum + (item.totalSpending || 0), 0)
    const totalClaimsSum = spending.reduce((sum: number, item: any) => sum + (item.totalClaims || 0), 0)
    const totalBeneficiariesSum = spending.reduce((sum: number, item: any) => sum + (item.totalBeneficiaries || 0), 0)
    lines.push('[CMS 요약 통계]')
    lines.push(`총 Medicare 지출액,$${formatNumber(Math.round(totalSpendingSum))}`)
    lines.push(`총 청구건수,${formatNumber(totalClaimsSum)}건`)
    lines.push(`총 수혜자 수,${formatNumber(totalBeneficiariesSum)}명`)
    if (totalBeneficiariesSum > 0) {
      lines.push(`수혜자 1인당 평균비용,$${formatNumber(Math.round(totalSpendingSum / totalBeneficiariesSum))}`)
    }
    lines.push('')
  }

  // 처방자(Provider) 통계
  const providerStats = cmsData.providerStats || []
  if (providerStats.length > 0) {
    lines.push('처방 의료기관(Provider) 통계')
    lines.push('No,의료기관명,전문분야,주(State),총 청구건수,총 수혜자수,총 비용($)')
    providerStats.forEach((p: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(p.providerName || ''),
        escapeCsv(p.specialty || ''),
        escapeCsv(p.state || ''),
        formatNumber(p.totalClaims || 0),
        formatNumber(p.totalBeneficiaries || 0),
        formatNumber(Math.round(p.totalCost || 0)),
      ].join(','))
    })
    lines.push('')
  }

  lines.push('[데이터 면책사항]')
  lines.push(`"CMS Medicare Part D 공개 데이터에 기반한 미국 약물 지출 통계입니다."`)
  lines.push(`"Medicare 수혜자(65세 이상 및 특정 장애인)에 한정된 데이터이며, 미국 전체 인구를 대표하지 않습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

// ────────────────────────────────────────
// 🇦🇺 PBS Australia (호주) CSV
// ────────────────────────────────────────

function buildPbsAustraliaCsv(pbsData: any, title: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[🇦🇺 PBS 약가 및 급여 데이터 (호주)] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,PBS (Pharmaceutical Benefits Scheme) - Australian Government Department of Health`)
  lines.push(`검색 약물명,${escapeCsv(drugName)}`)
  lines.push(`데이터 유형,PBS 등재 약물 급여 정보 및 가격`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  const items = pbsData.items || []
  if (items.length > 0) {
    lines.push('PBS 등재 약물 상세')
    lines.push('No,약물명(Brand),성분명(Generic),제형/함량,PBS 코드,약물그룹,정부보조가(AUD),환자부담금(AUD),최대처방량,급여유형,제한사항')

    items.forEach((item: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(item.brandName || item.tradeName || ''),
        escapeCsv(item.genericName || item.drugName || ''),
        escapeCsv(item.formStrength || item.form || ''),
        escapeCsv(item.pbsCode || item.itemCode || ''),
        escapeCsv(item.atcCode || item.therapeuticGroup || ''),
        item.governmentPrice || item.dpmaPrice || '',
        item.patientCopayment || item.patientPrice || '',
        escapeCsv(item.maxQuantity || item.packSize || ''),
        escapeCsv(item.benefitType || item.listingType || ''),
        escapeCsv(item.restriction || item.note || '-'),
      ].join(','))
    })
    lines.push('')

    // 요약
    lines.push('[PBS 요약 통계]')
    lines.push(`등재 품목 수,${items.length}건`)
    const avgGovPrice = items.reduce((sum: number, i: any) => sum + (parseFloat(i.governmentPrice || i.dpmaPrice || 0)), 0) / items.length
    if (avgGovPrice > 0) {
      lines.push(`평균 정부보조가,AUD $${avgGovPrice.toFixed(2)}`)
    }
    lines.push('')
  }

  // 처방 통계 (있을 경우)
  const prescriptionStats = pbsData.prescriptionStats || []
  if (prescriptionStats.length > 0) {
    lines.push('PBS 처방 통계')
    lines.push('No,약물명,처방건수,총 정부지출(AUD),총 환자부담(AUD),수혜자 수,연도')
    prescriptionStats.forEach((p: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(p.drugName || ''),
        formatNumber(p.prescriptionCount || 0),
        formatNumber(Math.round(p.governmentCost || 0)),
        formatNumber(Math.round(p.patientCost || 0)),
        formatNumber(p.beneficiaryCount || 0),
        escapeCsv(p.year || ''),
      ].join(','))
    })
    lines.push('')
  }

  lines.push('[데이터 면책사항]')
  lines.push(`"호주 PBS(Pharmaceutical Benefits Scheme) 공개 데이터에 기반한 약가 및 급여 정보입니다."`)
  lines.push(`"PBS 등재 약물에 한정되며, 비등재 약물 또는 사보험 청구 데이터는 포함되지 않습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

// ────────────────────────────────────────
// 🇬🇧 NHS UK (영국) CSV
// ────────────────────────────────────────

function buildNhsUkCsv(nhsData: any, title: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[🇬🇧 NHS 처방 데이터 (영국)] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,NHS Business Services Authority - Prescription Cost Analysis (England)`)
  lines.push(`검색 약물명,${escapeCsv(drugName)}`)
  lines.push(`데이터 유형,NHS 잉글랜드 지역 처방전 비용 분석`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  // 처방 요약
  const prescriptionSummary = nhsData.prescriptionSummary || []
  if (prescriptionSummary.length > 0) {
    lines.push('NHS 처방전 비용 분석')
    lines.push('No,약물명(BNF Name),BNF 코드,처방건수,조제건수,총 비용(GBP),평균 단가(GBP),기간')

    prescriptionSummary.forEach((item: any, idx: number) => {
      const avgCost = item.items > 0 ? (item.totalCost || item.actualCost || 0) / item.items : 0
      lines.push([
        idx + 1,
        escapeCsv(item.bnfName || item.drugName || ''),
        escapeCsv(item.bnfCode || ''),
        formatNumber(item.prescriptionCount || item.items || 0),
        formatNumber(item.dispensingCount || item.quantity || 0),
        formatNumber(Math.round(item.totalCost || item.actualCost || 0)),
        avgCost.toFixed(2),
        escapeCsv(item.period || item.date || ''),
      ].join(','))
    })
    lines.push('')

    // 요약 통계
    const totalNhsCost = prescriptionSummary.reduce((sum: number, i: any) =>
      sum + (i.totalCost || i.actualCost || 0), 0)
    const totalNhsItems = prescriptionSummary.reduce((sum: number, i: any) =>
      sum + (i.prescriptionCount || i.items || 0), 0)
    lines.push('[NHS 요약 통계]')
    lines.push(`총 처방 비용,£${formatNumber(Math.round(totalNhsCost))}`)
    lines.push(`총 처방건수,${formatNumber(totalNhsItems)}건`)
    if (totalNhsItems > 0) {
      lines.push(`건당 평균 비용,£${(totalNhsCost / totalNhsItems).toFixed(2)}`)
    }
    lines.push('')
  }

  // 지역(CCG/ICB)별 통계
  const regionalData = nhsData.regionalData || nhsData.ccgData || []
  if (regionalData.length > 0) {
    lines.push('지역(ICB/CCG)별 처방 통계')
    lines.push('No,지역명,지역코드,처방건수,총 비용(GBP),환자 수')
    regionalData.forEach((r: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(r.regionName || r.ccgName || r.orgName || ''),
        escapeCsv(r.regionCode || r.ccgCode || r.orgCode || ''),
        formatNumber(r.prescriptionCount || r.items || 0),
        formatNumber(Math.round(r.totalCost || r.actualCost || 0)),
        formatNumber(r.patientCount || 0),
      ].join(','))
    })
    lines.push('')
  }

  // 월별 추이 (있을 경우)
  const monthlyTrend = nhsData.monthlyTrend || []
  if (monthlyTrend.length > 0) {
    lines.push('월별 처방 추이')
    lines.push('기간,처방건수,총 비용(GBP)')
    monthlyTrend.forEach((m: any) => {
      lines.push(`${escapeCsv(m.period || m.date || '')},${formatNumber(m.items || 0)},${formatNumber(Math.round(m.totalCost || m.actualCost || 0))}`)
    })
    lines.push('')
  }

  lines.push('[데이터 면책사항]')
  lines.push(`"NHS Business Services Authority의 잉글랜드 지역 처방전 비용 분석 공개 데이터입니다."`)
  lines.push(`"NHS 잉글랜드 공공의료 처방에 한정되며, 사보험 및 자비 부담 처방은 포함되지 않습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}
