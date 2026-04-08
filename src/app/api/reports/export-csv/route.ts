import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30;

/**
 * GET /api/reports/export-csv?slug=xxx&type=all|hira|clinicaltrials|pubmed
 *
 * 프리미엄 보고서 전용: Raw 데이터를 CSV로 다운로드
 * HIRA, ClinicalTrials.gov, PubMed 데이터를 정제하여 CSV 형태로 제공
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

    // CSV 생성
    const csvSections: string[] = []

    // ── HIRA 데이터 ──
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
// CSV 빌더 함수들
// ────────────────────────────────────────

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildHiraCsv(data: any, title: string): string {
  const lines: string[] = []

  lines.push(`[HIRA 건강보험심사평가원 데이터] ${escapeCsv(title)}`)
  lines.push(`데이터 기준년도,2023`)
  lines.push('')

  // 기본 통계
  lines.push('구분,값,단위')
  lines.push(`총 환자수,${data.patientCount || 0},명`)
  lines.push(`요양급여비용 총액,${data.claimAmount || 0},원`)
  lines.push(`총 내원일수,${data.visitCount || 0},일`)
  if (data.avgCostPerPatient) {
    lines.push(`환자 1인당 평균 진료비,${data.avgCostPerPatient},원`)
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
