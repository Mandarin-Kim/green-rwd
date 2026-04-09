/**
 * report-validator.ts
 * ──────────────────────────────────────────────
 * 보고서 생성 후 데이터 정합성 검수 모듈
 *
 * 검수 항목:
 * 1. 수치 일관성: HIRA 실측값과 보고서 내 인용값 비교
 * 2. 단위 혼동 방지: 원/달러, 억/조 단위 교차검증
 * 3. 차트 데이터 검증: 같은 차트 내 단위 통일 확인
 * 4. 논리적 검증: 한국 < 글로벌, 부분 < 전체 등
 * 5. 출처 표기 확인: 데이터에 출처가 명시되었는지
 * ──────────────────────────────────────────────
 */

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  category: 'unit_mismatch' | 'value_inconsistency' | 'logic_error' | 'missing_source' | 'chart_error'
  message: string
  location?: string // 어느 섹션/차트에서 발견됐는지
  suggestion?: string // 수정 제안
}

export interface ValidationResult {
  isValid: boolean
  score: number // 0~100
  issues: ValidationIssue[]
  corrections: ContentCorrection[]
}

export interface ContentCorrection {
  type: 'chart_fix' | 'text_fix' | 'unit_fix'
  original: string
  corrected: string
  reason: string
}

/**
 * 보고서 전체를 검수하는 메인 함수
 */
export function validateReport(
  sections: Array<{ title: string; content: string; charts?: any[] }>,
  hiraData: any,
  globalData?: any,
  clinicalTrialsData?: any
): ValidationResult {
  const issues: ValidationIssue[] = []
  const corrections: ContentCorrection[] = []

  for (const section of sections) {
    // 1. 수치 일관성 검증
    issues.push(...validateNumberConsistency(section, hiraData))

    // 2. 단위 혼동 검증
    issues.push(...validateUnitConsistency(section.content, section.title))

    // 3. 차트 데이터 검증
    if (section.charts?.length) {
      issues.push(...validateCharts(section.charts, section.title))
    }

    // 4. 논리적 검증
    issues.push(...validateLogic(section.content, hiraData, globalData, section.title))

    // 5. 출처 표기 검증
    issues.push(...validateSources(section.content, section.title))
  }

  // 점수 산출 (100점 만점)
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5))

  return {
    isValid: errorCount === 0,
    score,
    issues,
    corrections,
  }
}

// ────────────────────────────────────────
// 1. 수치 일관성 검증
// ────────────────────────────────────────

function validateNumberConsistency(
  section: { title: string; content: string },
  hiraData: any
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!hiraData) return issues

  const patientCount = hiraData.patientCount || 0
  const claimAmount = hiraData.claimAmount || 0
  const visitCount = hiraData.visitCount || 0

  // 환자수 검증: 보고서에 환자수가 언급될 때 HIRA 실측과 비교
  if (patientCount > 0) {
    const patientMentions = section.content.match(/(\d{1,3}(?:,\d{3})*)\s*명/g) || []
    for (const mention of patientMentions) {
      const mentioned = parseInt(mention.replace(/[^0-9]/g, ''))
      // 한국 환자수로 보이는 경우 (다른 나라 데이터가 아닌)
      if (section.content.includes('한국') || section.content.includes('HIRA') || section.content.includes('국내')) {
        // 환자수가 HIRA 값의 10배 이상 또는 1/10 이하면 경고
        if (mentioned > 0 && patientCount > 0) {
          if (mentioned > patientCount * 10 || mentioned < patientCount / 10) {
            // 다만 글로벌 환자수 컨텍스트에서는 무시
            if (!section.content.substring(
              Math.max(0, section.content.indexOf(mention) - 100),
              section.content.indexOf(mention) + mention.length + 100
            ).match(/글로벌|미국|영국|호주|세계|global/i)) {
              issues.push({
                severity: 'warning',
                category: 'value_inconsistency',
                message: `한국 환자수 언급 "${mention}"이 HIRA 실측(${patientCount.toLocaleString()}명)과 크게 차이남`,
                location: section.title,
                suggestion: `HIRA 실측 환자수: ${patientCount.toLocaleString()}명을 사용하세요`,
              })
            }
          }
        }
      }
    }
  }

  // 진료비 검증
  if (claimAmount > 0) {
    const claimBillion = Math.round(claimAmount / 1_0000_0000)
    const amountMentions = section.content.match(/(\d{1,3}(?:,\d{3})*)\s*억\s*원/g) || []
    for (const mention of amountMentions) {
      const mentioned = parseInt(mention.replace(/[^0-9]/g, ''))
      // "한국" 컨텍스트에서 요양급여비용 관련 언급인 경우
      const surroundingText = section.content.substring(
        Math.max(0, section.content.indexOf(mention) - 150),
        section.content.indexOf(mention) + mention.length + 100
      )
      if (surroundingText.match(/요양급여|HIRA|급여비|건보|심평원/)) {
        if (mentioned > 0 && claimBillion > 0) {
          const ratio = mentioned / claimBillion
          if (ratio > 5 || ratio < 0.2) {
            issues.push({
              severity: 'error',
              category: 'value_inconsistency',
              message: `요양급여비용 "${mention}"이 HIRA 실측(약 ${claimBillion.toLocaleString()}억 원)과 크게 차이남 (${ratio.toFixed(1)}배)`,
              location: section.title,
              suggestion: `HIRA 실측 요양급여비용: 약 ${claimBillion.toLocaleString()}억 원`,
            })
          }
        }
      }
    }
  }

  return issues
}

// ────────────────────────────────────────
// 2. 단위 혼동 검증
// ────────────────────────────────────────

function validateUnitConsistency(content: string, sectionTitle: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // "한국 시장 X억 달러" → 한국은 원화여야 함
  const koreaInDollar = content.match(/한국\s*(?:시장|내수)?\s*(?:규모)?\s*[\d,]+\s*(?:억|조)\s*달러/g)
  if (koreaInDollar) {
    for (const match of koreaInDollar) {
      issues.push({
        severity: 'error',
        category: 'unit_mismatch',
        message: `한국 시장을 달러로 표기: "${match}" → 원화(원)로 표기해야 합니다`,
        location: sectionTitle,
        suggestion: '한국 시장 데이터는 HIRA 기반이므로 반드시 원(₩) 단위 사용',
      })
    }
  }

  // "글로벌 시장 X억 원" → 글로벌은 달러여야 함 (단, 환산 표기 제외)
  const globalInWon = content.match(/글로벌\s*(?:시장|전체)?\s*(?:규모)?\s*[\d,]+\s*(?:억|조)\s*원/g)
  if (globalInWon) {
    for (const match of globalInWon) {
      // "≈" 또는 "환산" 등이 근처에 있으면 환산 표기이므로 OK
      const idx = content.indexOf(match)
      const surrounding = content.substring(Math.max(0, idx - 50), idx + match.length + 50)
      if (!surrounding.match(/≈|환산|약|원화\s*환산|KRW/)) {
        issues.push({
          severity: 'warning',
          category: 'unit_mismatch',
          message: `글로벌 시장을 원화로 표기: "${match}" → 달러($) 단위가 더 적절합니다`,
          location: sectionTitle,
          suggestion: '글로벌 시장은 USD 기준으로 표기하고, 원화는 환산 참고치로만 병기',
        })
      }
    }
  }

  // 같은 문장에서 억 원과 억 달러를 직접 비교하는 경우
  const mixedComparison = content.match(/(\d+)\s*억\s*원.{0,30}(\d+)\s*억\s*달러/g)
  if (mixedComparison) {
    for (const match of mixedComparison) {
      issues.push({
        severity: 'error',
        category: 'unit_mismatch',
        message: `단위가 다른 수치를 직접 비교: "${match}" → 같은 단위로 환산 후 비교 필요`,
        location: sectionTitle,
        suggestion: '비교 시 동일 통화(원 또는 달러)로 환산하여 표기하세요',
      })
    }
  }

  return issues
}

// ────────────────────────────────────────
// 3. 차트 데이터 검증
// ────────────────────────────────────────

function validateCharts(charts: any[], sectionTitle: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const chart of charts) {
    if (!chart?.data || !Array.isArray(chart.data)) continue

    // 빈 차트 검증
    if (chart.data.length === 0) {
      issues.push({
        severity: 'warning',
        category: 'chart_error',
        message: `빈 차트 발견: "${chart.title || '제목없음'}"`,
        location: sectionTitle,
      })
      continue
    }

    // 단위 혼합 검증: 라벨에서 단위 추출
    const units = new Set<string>()
    for (const item of chart.data) {
      const label = String(item.label || '')
      if (label.includes('원') || label.includes('₩')) units.add('KRW')
      if (label.includes('달러') || label.includes('$') || label.includes('USD')) units.add('USD')
      if (label.includes('£') || label.includes('GBP')) units.add('GBP')
      if (label.includes('%')) units.add('PCT')
    }
    if (units.size > 1) {
      issues.push({
        severity: 'error',
        category: 'chart_error',
        message: `차트 "${chart.title || ''}"에 서로 다른 단위 혼재: ${[...units].join(', ')}`,
        location: sectionTitle,
        suggestion: '같은 차트 내에서는 동일한 단위를 사용하세요. 단위가 다른 데이터는 별도 차트로 분리하세요.',
      })
    }

    // 값이 0이거나 음수인 항목 검증
    const zeroItems = chart.data.filter((d: any) => d.value === 0)
    if (zeroItems.length === chart.data.length) {
      issues.push({
        severity: 'error',
        category: 'chart_error',
        message: `차트 "${chart.title || ''}"의 모든 값이 0입니다`,
        location: sectionTitle,
      })
    }

    // 라벨이 "항목 1", "항목 2" 같은 무의미한 라벨인지 검증
    const genericLabels = chart.data.filter((d: any) =>
      /^항목\s*\d+$/.test(String(d.label || ''))
    )
    if (genericLabels.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'chart_error',
        message: `차트 "${chart.title || ''}"에 무의미한 라벨 사용: ${genericLabels.map((d: any) => d.label).join(', ')}`,
        location: sectionTitle,
        suggestion: '의미 있는 라벨(지역명, 연령대, 약물명 등)을 사용하세요.',
      })
    }

    // 비율 차트(pie/donut)에서 합이 100%가 아닌 경우
    if (chart.type === 'pie' || chart.type === 'donut') {
      const total = chart.data.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      if (Math.abs(total - 100) > 5) {
        issues.push({
          severity: 'warning',
          category: 'chart_error',
          message: `원형 차트 합계가 100%가 아님: ${total.toFixed(1)}%`,
          location: sectionTitle,
          suggestion: '비율 차트의 합은 100%가 되어야 합니다.',
        })
      }
    }

    // 막대 차트에서 값의 스케일 차이가 너무 큰 경우 (100배 이상)
    if (chart.type === 'bar' && chart.data.length >= 2) {
      const values = chart.data.map((d: any) => d.value).filter((v: number) => v > 0)
      if (values.length >= 2) {
        const maxVal = Math.max(...values)
        const minVal = Math.min(...values)
        if (maxVal / minVal > 100) {
          issues.push({
            severity: 'warning',
            category: 'chart_error',
            message: `차트 "${chart.title || ''}"에서 값 스케일 차이가 너무 큼 (최대/최소 = ${Math.round(maxVal / minVal)}배)`,
            location: sectionTitle,
            suggestion: '스케일이 매우 다른 데이터는 별도 차트로 분리하거나 로그 스케일 사용을 고려하세요.',
          })
        }
      }
    }
  }

  return issues
}

// ────────────────────────────────────────
// 4. 논리적 검증
// ────────────────────────────────────────

function validateLogic(content: string, hiraData: any, globalData: any, sectionTitle: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // 한국 시장이 글로벌보다 크다고 표기된 경우
  const koreaMarket = content.match(/한국\s*(?:시장|내수)?\s*(?:규모)?\s*(?:약\s*)?(\d{1,3}(?:,\d{3})*)\s*(억|조)\s*원/)?.[0]
  const globalMarket = content.match(/글로벌\s*(?:시장)?\s*(?:규모)?\s*(?:약\s*)?(\d{1,3}(?:,\d{3})*)\s*(억|조)\s*달러/)?.[0]

  if (koreaMarket && globalMarket) {
    const koreaVal = parseMarketValue(koreaMarket, 'KRW')
    const globalVal = parseMarketValue(globalMarket, 'USD')
    const globalInKrw = globalVal * 1350 // USD→KRW 환산

    if (koreaVal > globalInKrw && globalInKrw > 0) {
      issues.push({
        severity: 'error',
        category: 'logic_error',
        message: `한국 시장(${koreaMarket})이 글로벌 시장(${globalMarket})보다 큰 것으로 표기됨`,
        location: sectionTitle,
        suggestion: '한국 시장은 글로벌 시장의 일부입니다. 수치를 재확인하세요.',
      })
    }
  }

  // CAGR이 비정상적으로 높거나 낮은 경우
  const cagrMatch = content.match(/CAGR\s*(?:약\s*)?(\d+(?:\.\d+)?)\s*%/)
  if (cagrMatch) {
    const cagr = parseFloat(cagrMatch[1])
    if (cagr > 30) {
      issues.push({
        severity: 'warning',
        category: 'logic_error',
        message: `CAGR ${cagr}%는 비정상적으로 높음`,
        location: sectionTitle,
        suggestion: '일반 제약 시장 CAGR은 3~15% 범위. 매우 높은 CAGR은 근거를 명시하세요.',
      })
    }
    if (cagr < 0) {
      issues.push({
        severity: 'info',
        category: 'logic_error',
        message: `음의 CAGR(${cagr}%)은 시장 축소를 의미. 의도된 것인지 확인 필요`,
        location: sectionTitle,
      })
    }
  }

  // 1인당 진료비가 비합리적인 경우
  if (hiraData?.patientCount > 0 && hiraData?.claimAmount > 0) {
    const avgCost = hiraData.claimAmount / hiraData.patientCount
    const avgCostMentions = content.match(/1인당\s*(?:평균\s*)?(?:진료비|비용)\s*(?:약\s*)?(\d{1,3}(?:,\d{3})*)\s*원/g) || []
    for (const mention of avgCostMentions) {
      const mentioned = parseInt(mention.replace(/[^0-9]/g, ''))
      if (mentioned > 0) {
        const ratio = mentioned / avgCost
        if (ratio > 5 || ratio < 0.2) {
          issues.push({
            severity: 'warning',
            category: 'value_inconsistency',
            message: `1인당 진료비 "${mention}"이 HIRA 실측 평균(약 ${Math.round(avgCost).toLocaleString()}원)과 ${ratio.toFixed(1)}배 차이`,
            location: sectionTitle,
          })
        }
      }
    }
  }

  return issues
}

// ────────────────────────────────────────
// 5. 출처 표기 검증
// ────────────────────────────────────────

function validateSources(content: string, sectionTitle: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // 수치가 있는 섹션인데 출처가 하나도 없는 경우
  const hasNumbers = /\d{2,}(?:,\d{3})*\s*(?:명|원|건|%)/.test(content)
  const hasSource = /(?:출처|HIRA|건강보험심사평가원|ClinicalTrials|PubMed|CMS|NHS|PBS|데이터 출처)/.test(content)

  if (hasNumbers && !hasSource && content.length > 500) {
    issues.push({
      severity: 'warning',
      category: 'missing_source',
      message: `수치가 포함된 섹션에 출처 표기 없음`,
      location: sectionTitle,
      suggestion: '수치 인용 시 출처를 명시하세요 (예: 건강보험심사평가원, 2023)',
    })
  }

  return issues
}

// ────────────────────────────────────────
// 유틸리티
// ────────────────────────────────────────

function parseMarketValue(text: string, currency: 'KRW' | 'USD'): number {
  const num = parseFloat(text.replace(/[^0-9.]/g, ''))
  if (text.includes('조')) return num * 1_0000_0000_0000
  if (text.includes('억')) return num * 1_0000_0000
  return num
}

/**
 * HIRA 실측 데이터 기반으로 차트 데이터를 생성
 * (AI가 만든 부정확한 차트 대신 실데이터 기반)
 */
export function buildDataDrivenCharts(
  hiraData: any,
  globalData?: any,
  clinicalTrialsData?: any
): any[] {
  const charts: any[] = []

  if (!hiraData) return charts

  const patientCount = hiraData.patientCount || 0
  const claimAmount = hiraData.claimAmount || 0

  // ── 1. 성별 환자 분포 (파이 차트) ──
  if (hiraData.genderStats?.length > 0) {
    const genderColors = ['#0d9488', '#f59e0b', '#8b5cf6']
    charts.push({
      type: 'pie',
      title: '성별 환자 분포 (HIRA 2023)',
      source: '건강보험심사평가원',
      data: hiraData.genderStats.map((g: any, idx: number) => ({
        label: `${g.gender} (${g.count?.toLocaleString()}명)`,
        value: g.ratio || 0,
        color: genderColors[idx % genderColors.length],
      })),
    })
  }

  // ── 2. 연령대별 환자 분포 (막대 차트) ──
  if (hiraData.ageDistribution?.length > 0) {
    charts.push({
      type: 'bar',
      title: '연령대별 환자 분포 (HIRA 2023)',
      source: '건강보험심사평가원',
      unit: '%',
      data: hiraData.ageDistribution.map((a: any) => ({
        label: a.ageGroup,
        value: a.ratio || 0,
        color: '#0d9488',
      })),
    })
  }

  // ── 3. 지역별 환자 분포 (상위 10개, 막대 차트) ──
  if (hiraData.regionStats?.length > 0) {
    const topRegions = [...hiraData.regionStats]
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, 10)

    charts.push({
      type: 'bar',
      title: '지역별 환자 분포 TOP 10 (HIRA 2023)',
      source: '건강보험심사평가원',
      unit: '%',
      data: topRegions.map((r: any) => ({
        label: r.region,
        value: r.ratio || 0,
        color: '#6366f1',
      })),
    })
  }

  // ── 4. 의료기관종별 분포 (도넛 차트) ──
  if (hiraData.institutionStats?.length > 0) {
    const instColors = ['#0d9488', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#84cc16']
    charts.push({
      type: 'donut',
      title: '의료기관종별 환자 분포 (HIRA 2023)',
      source: '건강보험심사평가원',
      data: hiraData.institutionStats.map((i: any, idx: number) => ({
        label: `${i.institutionType} (${i.count?.toLocaleString()}명)`,
        value: i.ratio || 0,
        color: instColors[idx % instColors.length],
      })),
    })
  }

  // ── 5. 한국 시장 구성 (급여/비급여/약품, 막대 차트) ──
  if (claimAmount > 0) {
    const claimBillion = Math.round(claimAmount / 1_0000_0000)
    const nonCoveredBillion = Math.round(claimBillion * 0.25)
    const drugMarketBillion = Math.round(claimBillion * 0.35)
    const totalBillion = Math.round(claimBillion * 1.6)

    charts.push({
      type: 'bar',
      title: '한국 시장 구성 (HIRA 2023, 단위: 억 원)',
      source: '건강보험심사평가원 기반 자체 추정',
      unit: '억 원',
      data: [
        { label: '요양급여비용', value: claimBillion, color: '#0d9488' },
        { label: '비급여 추정', value: nonCoveredBillion, color: '#f59e0b' },
        { label: '의약품 시장', value: drugMarketBillion, color: '#6366f1' },
        { label: '추정 총 시장규모', value: totalBillion, color: '#ef4444' },
      ],
    })
  }

  // ── 6. 글로벌 비교 (단위 통일: 억 원 환산, 별도 차트) ──
  if (globalData && claimAmount > 0) {
    const usdToKrw = 1350
    const gbpToKrw = 1720

    const koreaClaimBillion = Math.round(claimAmount / 1_0000_0000)
    const koreaMarketBillion = Math.round(koreaClaimBillion * 1.6)

    const cmsSpending = globalData.cms?.drugSpending?.reduce(
      (sum: number, d: any) => sum + (d.totalSpending || 0), 0) || 0
    const nhsCost = globalData.nhs?.prescriptionSummary?.reduce(
      (sum: number, i: any) => sum + (i.totalCost || i.actualCost || 0), 0) || 0

    const comparisonData: any[] = [
      {
        label: `🇰🇷 한국 (급여비×1.6)`,
        value: koreaMarketBillion,
        color: '#0d9488',
      },
    ]

    if (cmsSpending > 0) {
      const cmsInBillionKrw = Math.round((cmsSpending * usdToKrw) / 1_0000_0000)
      comparisonData.push({
        label: `🇺🇸 미국 Medicare ($${Math.round(cmsSpending).toLocaleString()} → 원화환산)`,
        value: cmsInBillionKrw,
        color: '#6366f1',
      })
    }

    if (nhsCost > 0) {
      const nhsInBillionKrw = Math.round((nhsCost * gbpToKrw) / 1_0000_0000)
      comparisonData.push({
        label: `🇬🇧 영국 NHS (£${Math.round(nhsCost).toLocaleString()} → 원화환산)`,
        value: nhsInBillionKrw,
        color: '#ef4444',
      })
    }

    if (comparisonData.length >= 2) {
      charts.push({
        type: 'bar',
        title: '국가별 공공보험 지출 비교 (원화 환산, 단위: 억 원)',
        source: 'HIRA / CMS Medicare / NHS England (원화 환산 비교)',
        unit: '억 원',
        data: comparisonData,
      })
    }
  }

  // ── 7. 임상시험 Phase 분포 (파이 차트) ──
  if (clinicalTrialsData?.phaseDistribution) {
    const phaseColors: Record<string, string> = {
      'PHASE1': '#84cc16', 'PHASE2': '#f59e0b', 'PHASE3': '#ef4444',
      'PHASE4': '#8b5cf6', 'EARLY_PHASE1': '#a3e635', 'NOT_APPLICABLE': '#94a3b8',
    }
    const phaseData = Object.entries(clinicalTrialsData.phaseDistribution)
      .filter(([_, count]) => (count as number) > 0)
      .map(([phase, count]) => ({
        label: `${phase.replace('PHASE', 'Phase ').replace('_', ' ')} (${count}건)`,
        value: count as number,
        color: phaseColors[phase] || '#94a3b8',
      }))

    if (phaseData.length > 0) {
      charts.push({
        type: 'pie',
        title: '임상시험 Phase별 분포 (ClinicalTrials.gov)',
        source: 'ClinicalTrials.gov',
        data: phaseData,
      })
    }
  }

  return charts
}

/**
 * 기존 extractChartsAndTables 대체:
 * AI 생성 텍스트에서 표만 추출하고, 차트는 실데이터 기반으로 별도 생성
 */
export function extractTablesOnly(content: string) {
  const tables: any[] = []

  const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g
  let tableMatch
  while ((tableMatch = tableRegex.exec(content)) !== null) {
    tables.push({
      raw: tableMatch[0],
      headers: tableMatch[1].split('|').map((h: string) => h.trim()).filter(Boolean),
    })
  }

  return { tables, hasTables: tables.length > 0 }
}
