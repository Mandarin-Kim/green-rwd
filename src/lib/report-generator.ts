import { reportSections, ReportSection } from './report-templates'
import { buildHiraContext, formatHiraContextForPrompt, type HiraReportContext } from './hira-report-enricher'
import { fetchClinicalTrials, formatClinicalTrialsForReport, type ClinicalTrialsData } from './clinicaltrials-api'
import { getSearchParamsBySlug } from './clinicaltrials-mapping'
import { searchPubMed, formatPubMedForPrompt, generateReferencesSection, type PubMedSearchResult } from './pubmed-api'
import { prisma } from './prisma'

export type ReportTier = 'BASIC' | 'PRO' | 'PREMIUM'

interface GenerateReportParams {
  catalogId: string
  slug?: string
  title: string
  drugName: string
  indication: string
  therapeuticArea: string
  tier: ReportTier
  cachedHiraData?: any
  cachedClinicalTrialsData?: any
  cachedPubMedData?: any
  onProgress?: (progress: number, sectionTitle: string) => void
}

interface GeneratedSection {
  id: string
  title: string
  content: string
  wordCount: number
  hasCharts: boolean
  hasTables: boolean
  charts: any[]
  tables: any[]
  order: number
}

const TIER_SECTION_COUNT: Record<ReportTier, number> = {
  BASIC: 5,
  PRO: 10,
  PREMIUM: 15,
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI API Calls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAnthropicClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section Generation with Retry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function generateSectionWithRetry(
  section: ReportSection,
  drugName: string,
  indication: string,
  therapeuticArea: string,
  hiraContextStr: string,
  clinicalTrialsData: ClinicalTrialsData | null,
  hiraRawData: any,
  pubMedContextStr: string,
  retries: number = 2
): Promise<string> {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY?.trim()
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY?.trim()
  if (!hasOpenAIKey && !hasAnthropicKey) {
    console.log(`[Section: ${section.title}] No API keys (OPENAI_API_KEY=${hasOpenAIKey}, ANTHROPIC_API_KEY=${hasAnthropicKey}), generating data-driven fallback`)
    return generateDataDrivenContent(section, drugName, indication, therapeuticArea, hiraRawData, clinicalTrialsData)
  }

  // 사용 가능한 AI 선택 (선호 provider → 대체 provider 순서)
  // 핵심 수정: 키가 하나만 있어도 모든 섹션이 AI로 생성되도록
  const preferredProvider = section.aiProvider
  let primaryAI: typeof callOpenAI
  let fallbackAI: typeof callOpenAI | null = null

  if (preferredProvider === 'openai' && hasOpenAIKey) {
    primaryAI = callOpenAI
    if (hasAnthropicKey) fallbackAI = callAnthropicClaude
  } else if (preferredProvider === 'anthropic' && hasAnthropicKey) {
    primaryAI = callAnthropicClaude
    if (hasOpenAIKey) fallbackAI = callOpenAI
  } else if (hasOpenAIKey) {
    // 선호 provider 키가 없으면 다른 provider 사용
    console.log(`[Section: ${section.title}] ${preferredProvider} key missing, using OpenAI instead`)
    primaryAI = callOpenAI
  } else {
    console.log(`[Section: ${section.title}] ${preferredProvider} key missing, using Anthropic instead`)
    primaryAI = callAnthropicClaude
  }

  // AI에 실제 데이터를 구체적으로 주입
  const dataContext = buildDetailedDataContext(hiraContextStr, clinicalTrialsData, drugName, indication)

  // PubMed 논문 인용 지시 (논문 데이터가 있을 때만)
  const citationInstruction = pubMedContextStr ? `
8. 아래 제공된 PubMed 논문을 본문에서 [1], [2] 등의 인라인 번호로 인용하세요
9. 각 섹션 끝에 "### 참고문헌" 소제목으로 해당 섹션에서 인용한 논문 목록을 정리하세요
10. 형식: [번호] 저자 (연도). "제목". 저널명. DOI 또는 PMID
11. 섹션당 최소 5개 이상의 논문을 인용하세요` : ''

  const userPrompt = `
약물/치료제: ${drugName}
적응증: ${indication}
치료 영역: ${therapeuticArea}

${dataContext}

${pubMedContextStr}

위 실측 데이터를 기반으로 "${section.title}" 섹션을 작성해주세요.

작성 원칙:
1. 위에 제공된 HIRA/ClinicalTrials.gov 실측 데이터의 구체적 수치를 반드시 인용하세요
2. 수치 인용 시 출처를 "(건강보험심사평가원, 2023)" 또는 "(ClinicalTrials.gov, 2025)" 형식으로 표기
3. 한국 시장 데이터를 중심으로, 글로벌 시장과 비교 분석
4. 마크다운 표를 최소 2개 이상 포함 (데이터 비교, 추이 등)
5. 전문 시장조사 보고서 수준의 분석 깊이 (단, 특정 시장조사 기관명이나 경쟁사 서비스명을 절대 언급하지 마세요)
6. 최소 3000자 이상, 구체적 수치와 근거 기반으로 작성
7. 단순 나열이 아닌 인사이트와 시사점을 도출하세요
8. 데이터 출처는 공공 데이터 기관(HIRA, ClinicalTrials.gov, PubMed, CMS, PBS, NHS 등)만 명시하고, 민간 시장조사 기관명은 사용하지 마세요
${citationInstruction}
`

  // PubMed 논문이 있으면 systemPrompt에 인용 지시 추가
  const enhancedSystemPrompt = pubMedContextStr
    ? section.systemPrompt + `\n\n[학술 논문 인용 원칙]\n- 본문에서 관련 내용 서술 시 PubMed 논문을 [1], [2] 등의 번호로 인라인 인용하세요.\n- 각 섹션 끝에 "### 참고문헌" 소제목으로 인용한 논문 목록을 APA 스타일로 정리하세요.\n- 섹션당 최소 5개 이상의 논문을 인용하여 학술적 신뢰도를 높이세요.\n- 형식: [번호] 저자 (연도). "제목". 저널명. DOI 또는 PMID`
    : section.systemPrompt

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 1차: primary AI 시도
      const content = await primaryAI(enhancedSystemPrompt, userPrompt)
      if (content && content.length > 200) {
        console.log(`[Section: ${section.title}] AI 생성 성공 (${content.length}자)`)
        return content
      }
      throw new Error('Generated content too short')
    } catch (error) {
      console.error(`[Section: ${section.title}] primary attempt ${attempt}/${retries} failed:`, error)

      // 2차: fallback AI가 있으면 시도
      if (fallbackAI && attempt === 1) {
        try {
          console.log(`[Section: ${section.title}] Trying fallback AI provider...`)
          const content = await fallbackAI(enhancedSystemPrompt, userPrompt)
          if (content && content.length > 200) {
            console.log(`[Section: ${section.title}] Fallback AI 생성 성공 (${content.length}자)`)
            return content
          }
        } catch (fallbackError) {
          console.error(`[Section: ${section.title}] fallback AI also failed:`, fallbackError)
        }
      }

      if (attempt === retries) {
        console.log(`[Section: ${section.title}] All AI attempts failed, using data-driven fallback`)
        return generateDataDrivenContent(section, drugName, indication, therapeuticArea, hiraRawData, clinicalTrialsData)
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return ''
}

/**
 * AI 프롬프트에 주입할 상세 데이터 컨텍스트 빌드
 */
function buildDetailedDataContext(
  hiraContextStr: string,
  clinicalTrialsData: ClinicalTrialsData | null,
  drugName: string,
  indication: string
): string {
  const parts: string[] = []

  if (hiraContextStr) {
    parts.push(hiraContextStr)
  }

  if (clinicalTrialsData) {
    parts.push(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ClinicalTrials.gov 실측 데이터 (${new Date().getFullYear()}년 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 전체 등록 임상시험: ${clinicalTrialsData.totalCount}건

■ 임상단계별 분류:
${Object.entries(clinicalTrialsData.phaseBreakdown)
  .map(([phase, count]) => `  - ${phase}: ${count}건`)
  .join('\n')}

■ 진행상태별 분류:
${Object.entries(clinicalTrialsData.statusBreakdown)
  .map(([status, count]) => `  - ${status}: ${count}건`)
  .join('\n')}

■ 주요 임상시험 (최신 10건):
${clinicalTrialsData.topStudies.map(s =>
  `  - [${s.nctId}] ${s.title} | ${s.phase} | ${s.status} | Sponsor: ${s.sponsor} | 등록환자: ${s.enrollment}명`
).join('\n')}

위 ClinicalTrials.gov 데이터는 실제 조회 결과입니다. 보고서에 반드시 활용하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  }

  return parts.join('\n\n')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Data-Driven Fallback Content (AI 없이도 실데이터 기반)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDataDrivenContent(
  section: ReportSection,
  drugName: string,
  indication: string,
  therapeuticArea: string,
  hiraData: any,
  ctData: ClinicalTrialsData | null,
): string {
  const generators: Record<string, () => string> = {
    'executive-summary': () => genExecutiveSummary(drugName, indication, therapeuticArea, hiraData, ctData),
    'market-overview': () => genMarketOverview(drugName, indication, therapeuticArea, hiraData, ctData),
    'epidemiology': () => genEpidemiology(drugName, indication, therapeuticArea, hiraData, ctData),
    'market-size-forecast': () => genMarketSizeForecast(drugName, indication, therapeuticArea, hiraData, ctData),
    'market-segmentation': () => genMarketSegmentation(drugName, indication, therapeuticArea, hiraData, ctData),
    'competitive-landscape': () => genCompetitiveLandscape(drugName, indication, therapeuticArea, hiraData, ctData),
    'company-profiles': () => genCompanyProfiles(drugName, indication, therapeuticArea, hiraData, ctData),
    'pipeline-analysis': () => genPipelineAnalysis(drugName, indication, therapeuticArea, hiraData, ctData),
    'regulatory-landscape': () => genRegulatoryLandscape(drugName, indication, therapeuticArea, hiraData, ctData),
    'regional-analysis': () => genRegionalAnalysis(drugName, indication, therapeuticArea, hiraData, ctData),
    'market-drivers-restraints': () => genDriversRestraints(drugName, indication, therapeuticArea, hiraData, ctData),
    'pest-analysis': () => genPestAnalysis(drugName, indication, therapeuticArea, hiraData, ctData),
    'porters-five-forces': () => genPortersFiveForces(drugName, indication, therapeuticArea, hiraData, ctData),
    'patient-segmentation-rwd': () => genPatientSegmentation(drugName, indication, therapeuticArea, hiraData, ctData),
    'strategic-recommendations': () => genStrategicRecommendations(drugName, indication, therapeuticArea, hiraData, ctData),
  }

  const generator = generators[section.id]
  if (generator) return generator()

  // 기본 fallback
  return genGenericSection(section, drugName, indication, therapeuticArea, hiraData, ctData)
}

// ── 유틸리티 함수 ──

function fmtNum(n: number | undefined | null): string {
  if (!n) return '0'
  return n.toLocaleString?.() || String(n)
}

function fmtKrw(amount: number | undefined | null): string {
  if (!amount) return '데이터 없음'
  if (amount >= 1_0000_0000_0000) return `${(amount / 1_0000_0000_0000).toFixed(1)}조 원`
  if (amount >= 1_0000_0000) return `약 ${Math.round(amount / 1_0000_0000).toLocaleString()}억 원`
  if (amount >= 1_0000) return `약 ${Math.round(amount / 1_0000).toLocaleString()}만 원`
  return `${amount.toLocaleString()}원`
}

function fmtMarketKrw(amount: number | undefined | null): string {
  if (!amount) return '데이터 산출 중'
  const estimated = Math.round(amount * 1.6) // 급여비 기반 시장규모 추정
  return fmtKrw(estimated)
}

function getGenderTable(hiraData: any): string {
  if (!hiraData?.genderStats?.length) return ''
  return `
| 성별 | 환자 수 | 비율 |
|------|---------|------|
${hiraData.genderStats.map((g: any) => `| ${g.gender} | ${fmtNum(g.count)}명 | ${g.ratio}% |`).join('\n')}`
}

function getAgeTable(hiraData: any): string {
  if (!hiraData?.ageDistribution?.length) return ''
  return `
| 연령대 | 환자 수 | 비율 |
|--------|---------|------|
${hiraData.ageDistribution.map((a: any) => `| ${a.ageGroup} | ${fmtNum(a.count)}명 | ${a.ratio}% |`).join('\n')}`
}

function getRegionTable(hiraData: any): string {
  if (!hiraData?.regionStats?.length) return ''
  const top = hiraData.regionStats.slice(0, 8)
  return `
| 지역 | 환자 수 | 비율 |
|------|---------|------|
${top.map((r: any) => `| ${r.region} | ${fmtNum(r.count)}명 | ${r.ratio}% |`).join('\n')}`
}

function getTrialPhaseTable(ctData: ClinicalTrialsData | null): string {
  if (!ctData?.phaseBreakdown) return ''
  return `
| 임상단계 | 시험 건수 | 비율 |
|----------|----------|------|
${Object.entries(ctData.phaseBreakdown)
  .sort(([a], [b]) => {
    const order: Record<string, number> = { 'EARLY_PHASE1': 0, 'PHASE1': 1, 'PHASE2': 2, 'PHASE3': 3, 'PHASE4': 4 }
    return (order[a] || 99) - (order[b] || 99)
  })
  .map(([phase, count]) => `| ${phase} | ${count}건 | ${((count / ctData.totalCount) * 100).toFixed(1)}% |`)
  .join('\n')}`
}

function getTrialTopTable(ctData: ClinicalTrialsData | null): string {
  if (!ctData?.topStudies?.length) return ''
  return `
| NCT ID | 시험명 | 단계 | 상태 | Sponsor | 등록환자 |
|--------|--------|------|------|---------|----------|
${ctData.topStudies.map(s =>
  `| ${s.nctId} | ${s.title.length > 60 ? s.title.substring(0, 57) + '...' : s.title} | ${s.phase} | ${s.status} | ${s.sponsor.length > 20 ? s.sponsor.substring(0, 17) + '...' : s.sponsor} | ${s.enrollment > 0 ? fmtNum(s.enrollment) + '명' : '-'} |`
).join('\n')}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BASIC 5개 섹션 생성기
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function genExecutiveSummary(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  const patientCount = hira?.patientCount || 0
  const claimAmount = hira?.claimAmount || 0

  return `# 경영진 요약 (Executive Summary)

## 핵심 요약

본 보고서는 한국 ${area} 시장에서 ${indication} 치료를 위한 ${drug} 관련 시장을 종합 분석합니다. 건강보험심사평가원(HIRA) 실측 데이터와 ClinicalTrials.gov 글로벌 임상시험 데이터를 기반으로 시장 규모, 환자 특성, 경쟁 환경, 그리고 향후 성장 전망을 분석했습니다.

## 주요 수치 (Key Metrics)

| 항목 | 수치 | 출처 |
|------|------|------|
| 한국 총 환자 수 | ${patientCount > 0 ? fmtNum(patientCount) + '명' : '산출 중'} | 건강보험심사평가원, 2023 |
| 요양급여비용 총액 | ${claimAmount > 0 ? fmtKrw(claimAmount) : '산출 중'} | 건강보험심사평가원, 2023 |
| 추정 시장 규모 (급여+비급여+약품) | ${claimAmount > 0 ? fmtMarketKrw(claimAmount) : '산출 중'} | 자체 추정 |
| 글로벌 임상시험 수 | ${ct ? fmtNum(ct.totalCount) + '건' : '조회 중'} | ClinicalTrials.gov, 2025 |
${ct ? `| Phase 3 임상시험 | ${ct.phaseBreakdown['PHASE3'] || 0}건 | ClinicalTrials.gov, 2025 |` : ''}

## 시장 동인 (Market Drivers)

${area} 시장의 성장을 이끄는 주요 동인은 다음과 같습니다:

**1. 고령화에 따른 환자 수 증가**: 한국의 65세 이상 인구 비율이 2025년 약 20%를 넘어서면서 ${indication} 환자 수가 지속적으로 증가하고 있습니다.${hira?.ageDistribution?.length > 0 ? ` HIRA 데이터에 따르면 ${hira.ageDistribution[hira.ageDistribution.length - 1]?.ageGroup || '고령'} 연령대의 환자 비율이 ${hira.ageDistribution[hira.ageDistribution.length - 1]?.ratio || 0}%로 가장 높습니다.` : ''}

**2. 활발한 신약 개발**: ClinicalTrials.gov 기준 ${drug} 관련 임상시험이 ${ct ? `총 ${fmtNum(ct.totalCount)}건` : '다수'} 진행 중이며, 새로운 작용기전의 치료제가 지속 출시되고 있습니다.

**3. 건강보험 급여 확대**: 정부의 보장성 강화 정책에 따라 ${indication} 관련 급여 범위가 확대되면서 환자 접근성이 개선되고 있습니다.

**4. 디지털 헬스케어 성장**: AI 기반 진단, 원격의료, 디지털 치료제(DTx) 등 디지털 헬스케어 혁신이 ${area} 시장에 새로운 성장 동력을 제공하고 있습니다.

## 전략적 시사점

${patientCount > 0 ? `한국 내 ${fmtNum(patientCount)}명의 ${indication} 환자 기반은` : `${indication} 환자 기반은`} 제약사의 타겟 마케팅과 임상시험 리크루팅에 중요한 기회를 제공합니다. 특히 건강보험심사평가원 데이터를 활용한 정밀 환자 세그먼테이션은 효율적인 시장 접근 전략 수립의 핵심입니다.

*데이터 출처: 건강보험심사평가원 보건의료빅데이터(2023), ClinicalTrials.gov(2025)*
`
}

function genMarketOverview(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  const claimAmount = hira?.claimAmount || 0
  const patientCount = hira?.patientCount || 0
  const estimatedMarket = claimAmount > 0 ? Math.round(claimAmount * 1.6) : 0

  return `# 시장 개요 (Market Overview)

## 시장 정의 및 범위

${indication} 치료 시장은 ${drug}를 포함한 약물 치료, 수술적 치료, 보조 치료를 포괄하며, 본 보고서에서는 주로 약물 시장(pharmaceutical market)을 분석 범위로 합니다. 한국 시장은 건강보험 급여 체계 하에서 운영되는 특수성이 있으며, 요양급여비용과 비급여 비용, 약국 외 직접 구매 비용을 포함한 종합적 시장 규모를 산출합니다.

## 한국 시장 규모

건강보험심사평가원 실측 데이터를 기반으로 분석한 한국 시장 현황입니다.

| 지표 | 수치 | 비고 |
|------|------|------|
| 진료 환자 수 | ${patientCount > 0 ? fmtNum(patientCount) + '명' : '산출 중'} | HIRA 2023년 기준 |
| 요양급여비용 총액 | ${fmtKrw(claimAmount)} | 심사결정 기준 |
| 추정 시장규모 (전체) | ${fmtKrw(estimatedMarket)} | 급여비×1.6 (비급여+약품 포함 추정) |
| 총 내원일수 | ${hira?.visitCount ? fmtNum(hira.visitCount) + '일' : '산출 중'} | 외래+입원 |
${patientCount > 0 && claimAmount > 0 ? `| 환자당 연간 평균 비용 | ${fmtKrw(Math.round(claimAmount / patientCount))} | 급여비 기준 |` : ''}

## 성별 환자 분포
${getGenderTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

## 글로벌 임상시험 현황

ClinicalTrials.gov에 등록된 ${drug} / ${indication} 관련 글로벌 임상시험은 **총 ${ct ? fmtNum(ct.totalCount) : '(조회 중)'}건**입니다.

${getTrialPhaseTable(ct) || '*(ClinicalTrials.gov 데이터 동기화 후 자동 업데이트)*'}

이 중 Phase 3 단계의 임상시험은 시장에 직접적인 영향을 미치며, 향후 2~5년 내 신약 출시로 이어질 가능성이 높습니다.${ct?.phaseBreakdown?.['PHASE3'] ? ` 현재 ${ct.phaseBreakdown['PHASE3']}건의 Phase 3 시험이 진행 중입니다.` : ''}

## 시장 가치 사슬 (Value Chain)

한국 ${indication} 치료 시장의 가치 사슬은 다음과 같이 구성됩니다:

| 단계 | 주요 플레이어 | 역할 |
|------|-------------|------|
| R&D / 신약 개발 | 글로벌 제약사, 국내 바이오텍 | 신약 후보물질 발굴 및 임상시험 |
| 제조 / 생산 | 원료의약품 업체, CMO/CDMO | GMP 기반 의약품 생산 |
| 허가 / 약가 | 식약처(MFDS), 건보공단, 심평원 | 시판허가, 약가결정, 급여등재 |
| 유통 | 도매상, 병원약국, 약국체인 | 의약품 유통 및 공급 |
| 처방 / 진료 | 상급종합병원, 전문병원, 의원 | 환자 진단 및 치료제 처방 |
| 환자 지원 | 건강보험, 실손보험, 환자단체 | 비용 지원 및 정보 제공 |

## 주요 시장 이벤트 타임라인

한국 ${area} 시장의 최근 주요 이벤트:

- **2020~2021**: COVID-19 팬데믹으로 원격의료 확대, 디지털 헬스 가속화
- **2022**: 건강보험 보장성 강화 정책 지속, 비대면 진료 제도화 논의
- **2023**: ${indication} 관련 환자 수 ${patientCount > 0 ? fmtNum(patientCount) + '명 기록' : '증가 추세 지속'} (HIRA 기준)
- **2024**: 신약 허가 및 급여 등재 확대, 바이오시밀러 시장 성장
- **2025**: ${ct ? `${fmtNum(ct.totalCount)}건의 글로벌 임상시험 진행 중` : '다수의 신규 임상시험 진행'}

*데이터 출처: 건강보험심사평가원 보건의료빅데이터(2023), ClinicalTrials.gov(2025)*
`
}

function genEpidemiology(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  const patientCount = hira?.patientCount || 0

  return `# 역학 분석 (Epidemiology)

## 한국 환자 수 현황

건강보험심사평가원(HIRA) 2023년 실측 데이터를 기반으로 한국 내 ${indication} 관련 환자 역학 분석 결과입니다.

### 주요 역학 지표

| 지표 | 수치 | 출처 |
|------|------|------|
| 연간 진료 환자 수 | ${patientCount > 0 ? fmtNum(patientCount) + '명' : '산출 중'} | HIRA, 2023 |
| 총 내원일수 | ${hira?.visitCount ? fmtNum(hira.visitCount) + '일' : '산출 중'} | HIRA, 2023 |
${patientCount > 0 ? `| 인구 10만명당 유병률 | 약 ${Math.round(patientCount / 515).toLocaleString()}명 | 추정 (인구 5,150만명 기준) |` : ''}
${hira?.claimAmount ? `| 환자당 평균 진료비 | ${fmtKrw(Math.round(hira.claimAmount / (patientCount || 1)))} | HIRA, 2023 |` : ''}

### 성별 분포

${indication} 환자의 성별 분포는 다음과 같습니다.
${getGenderTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}
${hira?.genderStats?.length >= 2 ? `
**분석**: ${hira.genderStats[0].gender} 환자가 ${hira.genderStats[0].ratio}%로 ${hira.genderStats[1].gender}(${hira.genderStats[1].ratio}%) 대비 ${hira.genderStats[0].ratio > hira.genderStats[1].ratio ? '높은' : '낮은'} 비율을 보이고 있습니다. 이는 ${indication}의 질병 특성과 성별에 따른 위험 인자 차이를 반영합니다.` : ''}

### 연령대별 분포

${indication} 환자의 연령대별 분포는 질환의 특성을 잘 보여줍니다.
${getAgeTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}
${hira?.ageDistribution?.length > 0 ? `
**분석**: 연령대별로 보면 ${hira.ageDistribution.sort((a: any, b: any) => (b.count || 0) - (a.count || 0))[0]?.ageGroup || ''} 연령대의 환자 수가 가장 많으며(${hira.ageDistribution[0]?.ratio}%), 고령층으로 갈수록 환자 비율이 증가하는 패턴을 보입니다. 이는 한국의 급속한 고령화가 ${indication} 환자 수 증가의 주요 동인임을 시사합니다.` : ''}

### 지역별 환자 분포

국내 시도별 ${indication} 환자 분포입니다.
${getRegionTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}
${hira?.regionStats?.length > 0 ? `
**분석**: ${hira.regionStats[0]?.region || ''}이 가장 높은 환자 수(${hira.regionStats[0]?.ratio}%)를 보이며, 이는 인구 밀집도와 의료 접근성을 반영합니다. 수도권(서울·경기·인천)에 전체 환자의 상당 부분이 집중되어 있어, 타겟 마케팅 시 수도권 대형병원 중심의 전략이 효과적일 수 있습니다.` : ''}

## 글로벌 임상시험 동향

ClinicalTrials.gov 등록 기준, ${drug} / ${indication} 관련 글로벌 임상시험 현황입니다.

${ct ? `
**총 등록 임상시험**: ${fmtNum(ct.totalCount)}건

${getTrialPhaseTable(ct)}

### 주요 진행 중인 임상시험
${getTrialTopTable(ct)}

**시사점**: ${ct.totalCount}건의 활발한 임상시험은 ${indication} 치료 영역에서의 높은 혁신 활동을 보여줍니다.${ct.phaseBreakdown['PHASE3'] ? ` 특히 Phase 3 단계 ${ct.phaseBreakdown['PHASE3']}건은 향후 2~4년 내 시장에 영향을 미칠 신규 치료 옵션입니다.` : ''}
` : '*(ClinicalTrials.gov 데이터 동기화 후 자동 업데이트)*'}

## 미충족 의료 수요 (Unmet Medical Needs)

${indication} 영역의 주요 미충족 의료 수요:

1. **장기 치료 효과 개선**: 기존 치료제의 장기간 효능 유지 및 내성 극복
2. **부작용 최소화**: 안전성 프로파일이 개선된 차세대 치료제 수요
3. **조기 진단 강화**: 초기 단계에서의 진단률 향상을 통한 치료 성과 개선
4. **환자 순응도 제고**: 투약 편의성 향상 (경구제, 장기지속형 등)
5. **취약계층 접근성**: 고령자, 저소득층의 치료 접근성 개선

*데이터 출처: 건강보험심사평가원 보건의료빅데이터(2023), ClinicalTrials.gov(2025)*
`
}

function genMarketSizeForecast(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  const claimAmount = hira?.claimAmount || 0
  const patientCount = hira?.patientCount || 0
  const marketSize = claimAmount > 0 ? Math.round(claimAmount * 1.6) : 0
  const marketBillion = marketSize > 0 ? Math.round(marketSize / 1_0000_0000) : 0

  // 성장률 추정 (치료영역에 따라 다름)
  const cagr = area.includes('종양') || area.includes('항암') ? 8.5
    : area.includes('대사') || area.includes('비만') ? 12.0
    : area.includes('면역') ? 9.2
    : area.includes('신경') ? 7.8
    : area.includes('디지털') ? 18.5
    : 7.5

  return `# 시장 규모 및 예측 (Market Size & Forecast)

## 한국 시장 규모 (2023년 기준)

건강보험심사평가원 실측 데이터를 기반으로 산출한 시장 규모입니다.

| 항목 | 금액 | 산출 방법 |
|------|------|----------|
| 요양급여비용 총액 | ${fmtKrw(claimAmount)} | HIRA 심사결정 기준 |
| 비급여 추정 (약 20~30%) | ${claimAmount > 0 ? fmtKrw(Math.round(claimAmount * 0.25)) : '-'} | 급여비 대비 추정 |
| 의약품 시장 추정 (약 35~40%) | ${claimAmount > 0 ? fmtKrw(Math.round(claimAmount * 0.35)) : '-'} | 급여비 대비 추정 |
| **추정 총 시장 규모** | **${fmtKrw(marketSize)}** | **급여비 × 1.6** |

## 시장 규모 예측 (2023~2030년)

CAGR ${cagr}% 기준 시나리오 분석:

${marketBillion > 0 ? `
| 연도 | 기본 시나리오 | 낙관 시나리오 | 비관 시나리오 |
|------|-------------|-------------|-------------|
| 2023 (실측) | ${fmtNum(marketBillion)}억 원 | ${fmtNum(marketBillion)}억 원 | ${fmtNum(marketBillion)}억 원 |
| 2024 | ${fmtNum(Math.round(marketBillion * (1 + cagr/100)))}억 원 | ${fmtNum(Math.round(marketBillion * (1 + (cagr+2)/100)))}억 원 | ${fmtNum(Math.round(marketBillion * (1 + (cagr-3)/100)))}억 원 |
| 2025 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + cagr/100, 2)))}억 원 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + (cagr+2)/100, 2)))}억 원 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + (cagr-3)/100, 2)))}억 원 |
| 2027 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + cagr/100, 4)))}억 원 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + (cagr+2)/100, 4)))}억 원 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + (cagr-3)/100, 4)))}억 원 |
| 2030 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + cagr/100, 7)))}억 원 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + (cagr+2)/100, 7)))}억 원 | ${fmtNum(Math.round(marketBillion * Math.pow(1 + (cagr-3)/100, 7)))}억 원 |

> **기본 시나리오**: CAGR ${cagr}% (현행 성장 추세 유지)
> **낙관 시나리오**: CAGR ${cagr + 2}% (신약 출시 가속, 보장성 확대)
> **비관 시나리오**: CAGR ${cagr - 3}% (약가 인하 압력, 제네릭 확대)
` : '*(HIRA 데이터 동기화 후 시장규모 예측 자동 생성)*'}

## 성장 동인 분석

**1. 환자 풀(Patient Pool) 확대**: ${patientCount > 0 ? `현재 ${fmtNum(patientCount)}명의 환자 기반에서` : ''} 고령화와 진단률 향상에 따라 연간 3~5% 환자 수 증가 예상

**2. 신약 출시 효과**: ${ct ? `현재 ${fmtNum(ct.totalCount)}건의 임상시험 진행 중이며, Phase 3 ${ct.phaseBreakdown?.['PHASE3'] || 0}건에서 향후 신약 출시 기대` : '다수의 글로벌 임상시험에서 신약 출시 기대'}

**3. 급여 확대**: 기존 비급여 치료의 급여 전환, 선별급여 확대로 시장 접근성 향상

**4. 프리미엄 치료 수요 증가**: 바이오의약품, 면역치료 등 고가 치료제에 대한 수요 증가로 환자당 치료 비용 상승

## 리스크 요인

| 리스크 | 영향도 | 설명 |
|--------|-------|------|
| 약가 인하 정책 | 높음 | 정부의 약가 인하 압력, 실거래가 제도 |
| 제네릭/바이오시밀러 진입 | 중간~높음 | 특허 만료에 따른 가격 경쟁 심화 |
| 건보 재정 압박 | 중간 | 건강보험 재정 적자 시 급여 축소 가능성 |
| 글로벌 공급망 이슈 | 낮음~중간 | 원료의약품 수급 불안정 |

*데이터 출처: 건강보험심사평가원(2023), ClinicalTrials.gov(2025), 자체 시장 추정 모델*
`
}

function genMarketSegmentation(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# 시장 세분화 (Market Segmentation)

## 치료제 유형별 세분화

${indication} 시장은 치료제 유형에 따라 다음과 같이 세분화됩니다:

| 세그먼트 | 주요 약물 | 시장 특성 |
|----------|---------|----------|
| 오리지널 의약품 | ${drug} 등 | 프리미엄 가격, 혁신 치료 |
| 제네릭 의약품 | 특허 만료 제품 복제 | 가격 경쟁, 급여 선호 |
| 바이오시밀러 | 바이오의약품 복제 | 성장세, 비용 절감 |
| 기타 (OTC, 한방 등) | 일반의약품, 건기식 | 보조적 치료 |

## 의료기관 유형별 분석

${hira?.institutionStats?.length > 0 ? `
건강보험심사평가원 데이터에 따른 의료기관 유형별 환자 분포:

| 의료기관 유형 | 환자 수 | 비율 |
|-------------|---------|------|
${hira.institutionStats.map((i: any) => `| ${i.institutionType} | ${fmtNum(i.count)}명 | ${i.ratio}% |`).join('\n')}

**시사점**: ${hira.institutionStats[0]?.institutionType || '상급종합병원'}이 환자 비율 ${hira.institutionStats[0]?.ratio || 0}%로 가장 높아, ${indication} 치료는 주로 전문의료기관에서 이루어지고 있습니다.
` : '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

## 지역별 세분화
${getRegionTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

## 연령대별 세분화
${getAgeTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

## 지불자별 세분화

한국 시장의 독특한 지불 구조:

| 지불자 유형 | 비율 (추정) | 설명 |
|-----------|-----------|------|
| 건강보험 급여 | 약 60~65% | 건보 급여 항목, 본인부담금 포함 |
| 실손보험 | 약 15~20% | 민영 실손보험 급여 |
| 본인 부담 | 약 15~20% | 비급여, 선택 진료 |
| 기타 | 약 5% | 산재보험, 자동차보험 등 |

## 임상시험 기반 시장 세분화

${ct ? `ClinicalTrials.gov 데이터 기반, 향후 시장에 진입할 치료제의 임상단계별 분포:

${getTrialPhaseTable(ct)}

Phase 2/3 단계의 임상시험이 다수 진행 중이며, 이는 향후 2~5년 내 새로운 시장 세그먼트가 형성될 가능성을 시사합니다.` : '*(ClinicalTrials.gov 데이터 동기화 후 자동 업데이트)*'}

*데이터 출처: 건강보험심사평가원(2023), ClinicalTrials.gov(2025)*
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRO/PREMIUM 섹션 생성기 (간략 버전)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function genCompetitiveLandscape(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  const sponsors = ct?.topStudies?.map(s => s.sponsor).filter((v, i, a) => a.indexOf(v) === i) || []
  return `# 경쟁 환경 분석 (Competitive Landscape)

## 주요 경쟁사 현황

${indication} 시장에서 활동하는 글로벌 주요 기업 분석입니다.

${ct && sponsors.length > 0 ? `
### ClinicalTrials.gov 기준 활발한 임상시험 수행 기업

ClinicalTrials.gov에 등록된 최신 임상시험의 Sponsor를 분석하면, ${indication} 영역에서 가장 활발한 R&D 활동을 하는 기업을 파악할 수 있습니다:

${sponsors.map((s, i) => `${i + 1}. **${s}**`).join('\n')}

### 주요 진행 중인 임상시험
${getTrialTopTable(ct)}
` : ''}

## 시장 점유율 분석

| 순위 | 기업 | 주요 제품 | 포지셔닝 |
|------|------|---------|----------|
| 1 | 글로벌 빅파마 A | ${drug} 오리지널 | 시장 선도 |
| 2 | 글로벌 빅파마 B | 경쟁 제품 | 시장 도전 |
| 3 | 국내 제약사 A | 제네릭/바이오시밀러 | 가격 경쟁 |
| 4 | 국내 제약사 B | 개량신약 | 틈새 시장 |

## 한국 시장 특수성

한국 시장은 건강보험 급여 제도, 실거래가 제도, DUR(의약품사용적정성) 시스템 등 독특한 규제 환경 하에서 경쟁이 이루어집니다. ${hira?.patientCount ? `${fmtNum(hira.patientCount)}명의 환자 기반` : '환자 기반'}을 확보하기 위한 학술 마케팅과 급여 등재 전략이 핵심 경쟁 요소입니다.

*데이터 출처: ClinicalTrials.gov(2025), HIRA(2023)*
`
}

function genCompanyProfiles(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  const sponsors = ct?.topStudies?.map(s => s.sponsor).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5) || []
  return `# 기업 프로파일 (Company Profiles)

## ClinicalTrials.gov 기반 주요 기업

${ct ? `${indication} 관련 총 ${fmtNum(ct.totalCount)}건의 글로벌 임상시험에서 확인된 주요 Sponsor 기업입니다.` : ''}

${sponsors.map((s, i) => `
### ${i + 1}. ${s}
- **임상시험 활동**: ${ct?.topStudies?.filter(t => t.sponsor === s).map(t => `${t.nctId} (${t.phase}, ${t.status})`).join(', ') || ''}
- **한국 시장 진출 현황**: 분석 중
- **전략적 포지셔닝**: ${indication} 영역 ${i < 2 ? '선도' : '도전'}기업
`).join('\n')}

${!sponsors.length ? `현재 ClinicalTrials.gov 데이터 동기화 진행 중입니다.` : ''}

*데이터 출처: ClinicalTrials.gov(2025)*
`
}

function genPipelineAnalysis(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# 파이프라인 분석 (Pipeline Analysis)

## 글로벌 R&D 파이프라인 현황

ClinicalTrials.gov 기준 ${drug} / ${indication} 관련 파이프라인 분석입니다.

${ct ? `
### 임상단계별 파이프라인 분포

**총 ${fmtNum(ct.totalCount)}건**의 임상시험이 등록되어 있습니다.

${getTrialPhaseTable(ct)}

### 진행 상태별 분류

| 상태 | 건수 | 비율 |
|------|------|------|
${Object.entries(ct.statusBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([status, count]) => `| ${status} | ${count}건 | ${((count / ct.totalCount) * 100).toFixed(1)}% |`)
  .join('\n')}

### 주요 임상시험 상세
${getTrialTopTable(ct)}
` : '*(ClinicalTrials.gov 데이터 동기화 후 자동 업데이트)*'}

## 기술 트렌드

${area} 영역의 주요 기술 개발 트렌드:

1. **차세대 작용기전 (MOA)**: 새로운 타겟을 겨냥한 혁신 치료제 개발
2. **바이오의약품**: 항체치료제, ADC, 이중항체 등
3. **정밀의료**: 바이오마커 기반 환자 선별 및 맞춤 치료
4. **디지털 치료제**: 소프트웨어 기반 치료 보조

*데이터 출처: ClinicalTrials.gov(2025)*
`
}

function genRegulatoryLandscape(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# 규제 환경 (Regulatory Landscape)

## 한국 규제 환경

### 식약처(MFDS) 허가 절차
${indication} 관련 의약품의 한국 시판 허가 절차:

| 단계 | 소요기간 | 설명 |
|------|---------|------|
| IND 신청 | 약 30일 | 임상시험계획 승인 |
| 임상시험 (Phase 1~3) | 3~7년 | ${ct ? `현재 글로벌 ${fmtNum(ct.totalCount)}건 진행 중` : ''} |
| NDA/BLA 신청 | 약 12~18개월 | 시판허가 심사 |
| 약가/급여 등재 | 약 6~12개월 | 건보 급여 결정 |

### 건강보험 급여 체계
${hira?.claimAmount ? `
현재 ${indication} 관련 요양급여비용이 **${fmtKrw(hira.claimAmount)}**에 달하며, 이는 건강보험 재정에서 상당한 비중을 차지합니다.` : ''}

### 약가 결정 제도
- **실거래가 조사제도**: 병원·약국 실구매가 기반 약가 조정
- **선별급여**: 비용효과성 기준 환자 본인부담률 차등 적용
- **위험분담제**: 고가 신약에 대한 조건부 급여

*데이터 출처: 식약처, 건강보험심사평가원(2023)*
`
}

function genRegionalAnalysis(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# 지역별 시장 분석 (Regional Analysis)

## 한국 시도별 분석

건강보험심사평가원 실측 데이터 기반 국내 지역별 ${indication} 환자 분포:
${getRegionTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

${hira?.regionStats?.length > 0 ? `
**분석**: 수도권(서울·경기·인천)에 전체 환자의 약 ${
  Math.round(
    (hira.regionStats.filter((r: any) => ['서울', '경기', '인천'].some(name => r.region?.includes(name)))
      .reduce((sum: number, r: any) => sum + (r.ratio || 0), 0))
  )
}%가 집중되어 있습니다. 이는 인구 밀집도, 의료 인프라 집중도와 높은 상관관계를 보입니다.` : ''}

## 글로벌 지역별 시장 비교

| 지역 | 시장 특성 | 한국 기업 진출 현황 |
|------|---------|-----------------|
| 북미 (미국/캐나다) | 최대 시장, 혁신 약가 | 다수 진출 |
| EU5 (독일/프랑스/영국/이탈리아/스페인) | 참조 약가 시스템 | 선별적 진출 |
| 일본 | 한국과 유사한 보험 체계 | 적극 진출 |
| 중국 | 급성장 시장, VBP 정책 | 확대 중 |
| 한국 | ${hira?.patientCount ? fmtNum(hira.patientCount) + '명 환자 기반' : '성장 중'} | 내수 기반 |

*데이터 출처: HIRA(2023), ClinicalTrials.gov(2025)*
`
}

function genDriversRestraints(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# 시장 동인 및 저해요인 (Drivers & Restraints)

## 성장 동인 (Drivers)

| 동인 | 영향도 | 기간 | 근거 |
|------|-------|------|------|
| 고령화에 따른 환자 증가 | 높음 | 장기 | ${hira?.patientCount ? `현재 ${fmtNum(hira.patientCount)}명, 연 3~5% 증가 추정` : '지속 증가 추세'} |
| 신약 파이프라인 확대 | 높음 | 중기 | ${ct ? `글로벌 ${fmtNum(ct.totalCount)}건 임상시험 진행` : '다수 임상시험 진행'} |
| 건강보험 보장성 강화 | 중간 | 중기 | 정부 정책 기조 |
| 진단 기술 발전 | 중간 | 장기 | AI 진단, 바이오마커 |
| 환자 인식 향상 | 중간 | 장기 | 조기 진단, 적극 치료 |

## 저해 요인 (Restraints)

| 저해 요인 | 영향도 | 기간 | 근거 |
|----------|-------|------|------|
| 약가 인하 압력 | 높음 | 지속 | 실거래가 제도, 가격 재평가 |
| 제네릭/바이오시밀러 경쟁 | 높음 | 중기 | 특허 만료 제품 증가 |
| 건보 재정 부담 | 중간 | 장기 | 고령화로 재정 압박 |
| 규제 불확실성 | 중간 | 지속 | 정권 교체에 따른 정책 변화 |

*데이터 출처: HIRA(2023), ClinicalTrials.gov(2025)*
`
}

function genPestAnalysis(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# PEST 분석

## Political (정치적 요인)
- 건강보험 보장성 강화 정책 지속 추진
- 의약품 규제 선진화 (ICH 가이드라인 적용)
- 바이오헬스 국가전략 산업 육성

## Economic (경제적 요인)
- ${hira?.claimAmount ? `${indication} 관련 건보 지출 ${fmtKrw(hira.claimAmount)}` : '건강보험 지출 증가'}
- 1인당 의료비 지출 OECD 평균 수렴 중
- 바이오제약 산업 수출 성장

## Social (사회적 요인)
- 초고령사회 진입 (2025년 65세 이상 20%+)
- ${hira?.patientCount ? `${indication} 환자 ${fmtNum(hira.patientCount)}명` : '환자 수 증가 추세'}
- 건강에 대한 관심 증가, 예방의료 확대

## Technological (기술적 요인)
- ${ct ? `글로벌 ${fmtNum(ct.totalCount)}건의 활발한 임상시험` : '신약 개발 활발'}
- AI/디지털 헬스케어 기술 융합
- 정밀의료(Precision Medicine) 확대

*데이터 출처: HIRA(2023), ClinicalTrials.gov(2025)*
`
}

function genPortersFiveForces(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# Porter's Five Forces 분석

| Force | 강도 | 핵심 결정 요인 |
|-------|------|--------------|
| 기존 경쟁 (Rivalry) | ★★★★☆ (4/5) | ${ct ? `${fmtNum(ct.totalCount)}건 임상시험` : '다수'}, 다국적 제약사 경쟁 |
| 신규 진입 위협 (New Entrants) | ★★☆☆☆ (2/5) | 높은 R&D 비용, 규제 장벽 |
| 대체재 위협 (Substitutes) | ★★★☆☆ (3/5) | 제네릭/바이오시밀러, 디지털치료제 |
| 공급자 교섭력 (Supplier Power) | ★★★☆☆ (3/5) | 원료의약품 공급 집중도 |
| 구매자 교섭력 (Buyer Power) | ★★★★☆ (4/5) | 건보공단 단일보험자, 강한 가격교섭력 |

*데이터 출처: 자체 분석, ClinicalTrials.gov(2025)*
`
}

function genPatientSegmentation(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# 환자 세그먼테이션 및 RWD 분석

## HIRA 실측 데이터 기반 환자 분류

### 성별 분포
${getGenderTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

### 연령대별 분포
${getAgeTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

### 지역별 분포
${getRegionTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

## 의료 비용 분석
${hira?.patientCount && hira?.claimAmount ? `
| 지표 | 수치 |
|------|------|
| 총 환자 수 | ${fmtNum(hira.patientCount)}명 |
| 연간 총 급여비 | ${fmtKrw(hira.claimAmount)} |
| 환자당 연 평균 급여비 | ${fmtKrw(Math.round(hira.claimAmount / hira.patientCount))} |
| 총 내원일수 | ${fmtNum(hira.visitCount)}일 |
| 환자당 평균 내원일수 | ${(hira.visitCount / hira.patientCount).toFixed(1)}일 |
` : '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

## 임상시험 리크루팅 타겟 분석
${ct ? `글로벌 ${fmtNum(ct.totalCount)}건의 임상시험 중 한국에서 진행 가능한 시험에 대해, HIRA 환자 데이터를 활용한 리크루팅이 가능합니다.` : ''}

*데이터 출처: HIRA(2023), ClinicalTrials.gov(2025)*
`
}

function genStrategicRecommendations(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# 전략적 권고사항 (Strategic Recommendations)

## 시장 진입 전략

1. **HIRA 데이터 기반 타겟팅**: ${hira?.patientCount ? `${fmtNum(hira.patientCount)}명 환자 기반` : '환자 기반'}에서 세분화된 타겟 마케팅 실행
${hira?.regionStats?.length > 0 ? `2. **지역별 우선순위**: ${hira.regionStats[0]?.region}(${hira.regionStats[0]?.ratio}%) → ${hira.regionStats[1]?.region || ''}(${hira.regionStats[1]?.ratio || ''}%) 순서로 집중` : '2. **지역별 우선순위**: 수도권 대형병원 중심 → 지방 거점병원 확대'}
3. **임상시험 연계**: ${ct ? `글로벌 ${fmtNum(ct.totalCount)}건 임상시험과 연계한 리크루팅 서비스` : '글로벌 임상시험과 연계한 리크루팅 서비스'}

## 그린리본 플랫폼 활용 전략

| 전략 | 실행 방안 | 기대 효과 |
|------|---------|----------|
| 타겟 마케팅 | HIRA RWD 기반 환자 세그먼트별 메시지 | 전환율 향상 |
| 임상시험 리크루팅 | 환자 풀에서 적격 환자 매칭 | 리크루팅 기간 단축 |
| 시장 인텔리전스 | 경쟁사 동향, 처방 패턴 분석 | 전략적 의사결정 지원 |

*데이터 출처: HIRA(2023), ClinicalTrials.gov(2025)*
`
}

function genGenericSection(section: ReportSection, drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  return `# ${section.title}

## ${drug} - ${indication} 시장 분석

${hira?.patientCount ? `건강보험심사평가원 2023년 데이터 기준, ${indication} 관련 총 환자 수는 **${fmtNum(hira.patientCount)}명**이며, 요양급여비용은 **${fmtKrw(hira.claimAmount)}**입니다.` : ''}

${ct ? `ClinicalTrials.gov 기준, 관련 글로벌 임상시험은 **총 ${fmtNum(ct.totalCount)}건**이 등록되어 있습니다.` : ''}

${getGenderTable(hira)}
${getAgeTable(hira)}

*데이터 출처: 건강보험심사평가원(2023), ClinicalTrials.gov(2025)*
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Extract charts and tables from content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractChartsAndTables(content: string) {
  const charts: any[] = []
  const tables: any[] = []

  const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g
  let tableMatch
  while ((tableMatch = tableRegex.exec(content)) !== null) {
    tables.push({
      raw: tableMatch[0],
      headers: tableMatch[1].split('|').map((h: string) => h.trim()).filter(Boolean),
    })
  }

  const numberPatterns = content.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(%|억|조|만)/g)
  if (numberPatterns && numberPatterns.length >= 3) {
    charts.push({
      type: 'bar',
      title: '주요 수치',
      data: numberPatterns.slice(0, 6).map((p: string, i: number) => ({
        label: `항목 ${i + 1}`,
        value: parseFloat(p.replace(/[^0-9.]/g, '')),
      })),
    })
  }

  return { charts, tables, hasCharts: charts.length > 0, hasTables: tables.length > 0 }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데이터 수집: DB 캐시 우선 → 없으면 API → 결과 DB 저장
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getHiraData(slug: string, cachedHiraData?: any): Promise<{ contextStr: string; rawData: any }> {
  if (cachedHiraData) {
    console.log(`[ReportGenerator] HIRA 데이터: DB 캐시 사용 (${slug})`)
    try {
      const contextStr = buildHiraContextFromCache(cachedHiraData)
      return { contextStr, rawData: cachedHiraData }
    } catch (e) {
      console.error(`[ReportGenerator] HIRA 캐시 파싱 실패:`, e)
    }
  }

  if (!slug) return { contextStr: '', rawData: null }

  try {
    console.log(`[ReportGenerator] HIRA 데이터 API 조회 중: ${slug}`)
    const hiraContext = await buildHiraContext(slug)
    if (hiraContext) {
      const contextStr = formatHiraContextForPrompt(hiraContext)
      saveCacheToDb(slug, 'hiraData', hiraContext.rawData).catch(e =>
        console.error(`[ReportGenerator] HIRA 캐시 저장 실패:`, e)
      )
      return { contextStr, rawData: hiraContext.rawData }
    }
  } catch (error) {
    console.error(`[ReportGenerator] HIRA 데이터 조회 실패:`, error)
  }

  return { contextStr: '', rawData: null }
}

export async function getClinicalTrialsData(slug: string, cachedClinicalTrialsData?: any): Promise<{ contextStr: string; data: ClinicalTrialsData | null }> {
  if (cachedClinicalTrialsData) {
    console.log(`[ReportGenerator] ClinicalTrials 데이터: DB 캐시 사용 (${slug})`)
    try {
      const data = cachedClinicalTrialsData as ClinicalTrialsData
      const contextStr = formatClinicalTrialsForReport(data)
      return { contextStr, data }
    } catch (e) {
      console.error(`[ReportGenerator] ClinicalTrials 캐시 파싱 실패:`, e)
    }
  }

  if (!slug) return { contextStr: '', data: null }

  try {
    const searchParams = getSearchParamsBySlug(slug)
    if (searchParams) {
      console.log(`[ReportGenerator] ClinicalTrials.gov API 조회 중: ${slug}`)
      const data = await fetchClinicalTrials(searchParams.drug, searchParams.condition)
      if (data) {
        const contextStr = formatClinicalTrialsForReport(data)
        saveCacheToDb(slug, 'clinicalTrialsData', data).catch(e =>
          console.error(`[ReportGenerator] ClinicalTrials 캐시 저장 실패:`, e)
        )
        return { contextStr, data }
      }
    }
  } catch (error) {
    console.error(`[ReportGenerator] ClinicalTrials 데이터 조회 실패:`, error)
  }

  return { contextStr: '', data: null }
}

export async function saveCacheToDb(slug: string, field: 'hiraData' | 'clinicalTrialsData' | 'pubMedData', data: any) {
  await prisma.reportCatalog.updateMany({
    where: { slug },
    data: { [field]: data, dataSyncedAt: new Date() },
  })
  console.log(`[ReportGenerator] ${field} DB 캐시 저장 완료: ${slug}`)
}

export async function getPubMedData(
  slug: string,
  drugName: string,
  indication: string,
  cachedPubMedData?: any
): Promise<{ contextStr: string; data: PubMedSearchResult | null }> {
  // DB 캐시 우선
  if (cachedPubMedData) {
    console.log(`[ReportGenerator] PubMed 데이터: DB 캐시 사용 (${slug})`)
    try {
      const data = cachedPubMedData as PubMedSearchResult
      const contextStr = formatPubMedForPrompt(data)
      return { contextStr, data }
    } catch (e) {
      console.error(`[ReportGenerator] PubMed 캐시 파싱 실패:`, e)
    }
  }

  // API 조회
  try {
    console.log(`[ReportGenerator] PubMed API 조회 중: ${indication} + ${drugName}`)
    const data = await searchPubMed(indication, drugName, 20)
    if (data && data.articles.length > 0) {
      const contextStr = formatPubMedForPrompt(data)
      // DB 캐시 저장
      if (slug) {
        saveCacheToDb(slug, 'pubMedData', data).catch(e =>
          console.error(`[ReportGenerator] PubMed 캐시 저장 실패:`, e)
        )
      }
      return { contextStr, data }
    }
  } catch (error) {
    console.error(`[ReportGenerator] PubMed 데이터 조회 실패:`, error)
  }

  return { contextStr: '', data: null }
}

function buildHiraContextFromCache(cachedData: any): string {
  if (!cachedData || !cachedData.patientCount) return ''

  const sections = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'HIRA 건강보험심사평가원 실측 데이터 (DB 캐시)',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `■ HIRA 실측 데이터 (건강보험심사평가원 2023년 기준)`,
    `  - 총 환자수: ${fmtNum(cachedData.patientCount)}명`,
    `  - 요양급여비용 총액: ${fmtKrw(cachedData.claimAmount)}`,
    `  - 총 내원일수: ${fmtNum(cachedData.visitCount)}일`,
  ]

  if (cachedData.genderStats?.length > 0) {
    sections.push('', `■ 성별 환자 분포`)
    for (const g of cachedData.genderStats) {
      sections.push(`  - ${g.gender}: ${fmtNum(g.count)}명 (${g.ratio}%)`)
    }
  }

  if (cachedData.ageDistribution?.length > 0) {
    sections.push('', `■ 연령대별 환자 분포`)
    for (const a of cachedData.ageDistribution) {
      sections.push(`  - ${a.ageGroup}: ${fmtNum(a.count)}명 (${a.ratio}%)`)
    }
  }

  if (cachedData.regionStats?.length > 0) {
    sections.push('', `■ 지역별 환자 분포 (상위 5개 시도)`)
    for (const r of cachedData.regionStats.slice(0, 5)) {
      sections.push(`  - ${r.region}: ${fmtNum(r.count)}명 (${r.ratio}%)`)
    }
  }

  sections.push(
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '위 HIRA 데이터를 보고서의 근거 데이터로 반드시 활용하세요.',
    '수치 인용 시 "(건강보험심사평가원, 2023)" 으로 출처 표기하세요.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  )

  return sections.join('\n')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main report generation function
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateReport(params: GenerateReportParams): Promise<GeneratedSection[]> {
  const {
    title, slug, drugName, indication, therapeuticArea, tier,
    cachedHiraData, cachedClinicalTrialsData, cachedPubMedData, onProgress,
  } = params
  const sectionCount = TIER_SECTION_COUNT[tier]
  const sectionsToGenerate = reportSections.slice(0, sectionCount)
  const generatedSections: GeneratedSection[] = []

  console.log(`[ReportGenerator] Starting: ${title}, Tier: ${tier}, Sections: ${sectionCount}`)
  console.log(`[ReportGenerator] DB 캐시: HIRA=${!!cachedHiraData}, ClinicalTrials=${!!cachedClinicalTrialsData}, PubMed=${!!cachedPubMedData}`)

  // 데이터 수집 (병렬) - PubMed 추가
  const [hiraResult, ctResult, pubMedResult] = await Promise.all([
    getHiraData(slug || '', cachedHiraData),
    getClinicalTrialsData(slug || '', cachedClinicalTrialsData),
    getPubMedData(slug || '', drugName, indication, cachedPubMedData),
  ])

  const fullContextStr = [hiraResult.contextStr, ctResult.contextStr].filter(Boolean).join('\n\n')
  const pubMedContextStr = pubMedResult.contextStr || ''

  for (let i = 0; i < sectionsToGenerate.length; i++) {
    const section = sectionsToGenerate[i]
    const progress = Math.round(((i + 1) / sectionsToGenerate.length) * 100)

    if (onProgress) onProgress(progress, section.title)

    console.log(`[ReportGenerator] Generating section ${i + 1}/${sectionCount}: ${section.title}`)

    const content = await generateSectionWithRetry(
      section,
      drugName,
      indication,
      therapeuticArea,
      fullContextStr,
      ctResult.data,
      hiraResult.rawData,
      pubMedContextStr
    )
    const { charts, tables, hasCharts, hasTables } = extractChartsAndTables(content)

    generatedSections.push({
      id: `section-${i + 1}`,
      title: section.title,
      content,
      wordCount: content.length,
      hasCharts,
      hasTables,
      charts,
      tables,
      order: i + 1,
    })
  }

  // 마지막에 통합 참고문헌 섹션 추가 (PubMed 데이터가 있을 때)
  if (pubMedResult.data && pubMedResult.data.articles.length > 0) {
    const referencesContent = generateReferencesSection(pubMedResult.data)
    const sectionIdx = generatedSections.length + 1
    generatedSections.push({
      id: `section-${sectionIdx}`,
      title: '참고문헌 (References)',
      content: referencesContent,
      wordCount: referencesContent.length,
      hasCharts: false,
      hasTables: false,
      charts: [],
      tables: [],
      order: sectionIdx,
    })
    console.log(`[ReportGenerator] 참고문헌 섹션 추가 (${pubMedResult.data.articles.length}건 논문)`)
  }

  console.log(`[ReportGenerator] Completed: ${generatedSections.length} sections generated`)
  return generatedSections
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 단일 섹션 생성 (타임아웃 방지용 분할 생성)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 보고서의 특정 섹션 1개만 생성
 * Vercel Hobby 60초 제한 대응: 프론트엔드에서 섹션별로 순차 호출
 */
export async function generateSingleSection(params: {
  slug: string
  title: string
  drugName: string
  indication: string
  therapeuticArea: string
  tier: ReportTier
  sectionIndex: number
  cachedHiraData?: any
  cachedClinicalTrialsData?: any
  cachedPubMedData?: any
}): Promise<{ section: GeneratedSection; isLast: boolean; totalSections: number }> {
  const {
    slug, title, drugName, indication, therapeuticArea, tier,
    sectionIndex, cachedHiraData, cachedClinicalTrialsData, cachedPubMedData,
  } = params

  const sectionCount = TIER_SECTION_COUNT[tier]
  const sectionsToGenerate = reportSections.slice(0, sectionCount)
  // 참고문헌 섹션을 포함한 총 섹션 수 (PubMed 데이터가 있으면 +1)
  const hasPubMed = cachedPubMedData?.articles?.length > 0
  const totalSections = hasPubMed ? sectionCount + 1 : sectionCount

  console.log(`[SingleSection] Generating section ${sectionIndex + 1}/${totalSections} for ${title} (${tier})`)

  // 참고문헌 섹션 생성 (마지막 인덱스)
  if (hasPubMed && sectionIndex === sectionCount) {
    const referencesContent = generateReferencesSection(cachedPubMedData)
    return {
      section: {
        id: `section-${sectionIndex + 1}`,
        title: '참고문헌 (References)',
        content: referencesContent,
        wordCount: referencesContent.length,
        hasCharts: false,
        hasTables: false,
        charts: [],
        tables: [],
        order: sectionIndex + 1,
      },
      isLast: true,
      totalSections,
    }
  }

  if (sectionIndex >= sectionCount) {
    // 마지막 섹션 이후 → 완료 신호
    return {
      section: {
        id: 'done',
        title: 'done',
        content: '',
        wordCount: 0,
        hasCharts: false,
        hasTables: false,
        charts: [],
        tables: [],
        order: sectionIndex + 1,
      },
      isLast: true,
      totalSections,
    }
  }

  // 데이터 컨텍스트 준비
  const [hiraResult, ctResult, pubMedResult] = await Promise.all([
    getHiraData(slug, cachedHiraData),
    getClinicalTrialsData(slug, cachedClinicalTrialsData),
    getPubMedData(slug, drugName, indication, cachedPubMedData),
  ])

  const fullContextStr = [hiraResult.contextStr, ctResult.contextStr].filter(Boolean).join('\n\n')
  const pubMedContextStr = pubMedResult.contextStr || ''

  const sectionDef = sectionsToGenerate[sectionIndex]
  const content = await generateSectionWithRetry(
    sectionDef,
    drugName,
    indication,
    therapeuticArea,
    fullContextStr,
    ctResult.data,
    hiraResult.rawData,
    pubMedContextStr
  )
  const { charts, tables, hasCharts, hasTables } = extractChartsAndTables(content)

  const isLast = hasPubMed
    ? false  // PubMed 있으면 다음에 참고문헌 섹션이 남음
    : sectionIndex === sectionCount - 1

  return {
    section: {
      id: `section-${sectionIndex + 1}`,
      title: sectionDef.title,
      content,
      wordCount: content.length,
      hasCharts,
      hasTables,
      charts,
      tables,
      order: sectionIndex + 1,
    },
    isLast,
    totalSections,
  }
}

/** 티어별 섹션 수 조회 (프론트엔드용) */
export function getSectionCount(tier: ReportTier): number {
  return TIER_SECTION_COUNT[tier]
}
