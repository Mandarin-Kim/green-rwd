import { reportSections, ReportSection } from './report-templates'
import { buildHiraContext, formatHiraContextForPrompt, type HiraReportContext } from './hira-report-enricher'
import { fetchClinicalTrials, formatClinicalTrialsForReport, type ClinicalTrialsData } from './clinicaltrials-api'
import { getSearchParamsBySlug } from './clinicaltrials-mapping'
import { searchPubMed, formatPubMedForPrompt, generateReferencesSection, type PubMedSearchResult } from './pubmed-api'
import { prisma } from './prisma'
import { validateReport, buildDataDrivenCharts, extractTablesOnly, type ValidationResult } from './report-validator'

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
  cachedGlobalData?: any
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
  PREMIUM: 16,  // 후향적 임상 전략 + 참고문헌 포함
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI API Calls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  // Vercel Hobby 60초 제한 대응: 35초 타임아웃 (DB 저장 등 오버헤드 고려)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 35000)

  try {
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
        max_tokens: 2000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT: AI 응답 시간 초과. 자동 재시도합니다.')
    }
    throw err
  }
}

async function callAnthropicClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  // Vercel Hobby 60초 제한 대응: 35초 타임아웃 (DB 저장 등 오버헤드 고려)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 35000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text || ''
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT: AI 응답 시간 초과. 자동 재시도합니다.')
    }
    throw err
  }
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
  globalData?: any,
  retries: number = 2
): Promise<string> {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY?.trim()
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY?.trim()
  if (!hasOpenAIKey && !hasAnthropicKey) {
    console.log(`[Section: ${section.title}] No API keys (OPENAI_API_KEY=${hasOpenAIKey}, ANTHROPIC_API_KEY=${hasAnthropicKey}), generating data-driven fallback`)
    return generateDataDrivenContent(section, drugName, indication, therapeuticArea, hiraRawData, clinicalTrialsData, globalData)
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
  const dataContext = buildDetailedDataContext(hiraContextStr, clinicalTrialsData, drugName, indication, globalData)

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
1. 위에 제공된 HIRA/ClinicalTrials.gov/CMS/PBS/NHS 실측 데이터의 구체적 수치를 반드시 인용하세요
2. 수치 인용 시 출처를 정확히 표기하세요:
   - 한국 데이터: "(건강보험심사평가원, 2023)"
   - 임상시험: "(ClinicalTrials.gov, 2025)"
   - 미국 데이터: "(CMS Medicare Part D, 연도)"
   - 호주 데이터: "(PBS Australia, 연도)"
   - 영국 데이터: "(NHS England PCA, 연도)"
3. ⚠ 매우 중요: "한국 시장 규모"와 "글로벌 시장 규모"를 절대로 혼동하지 마세요!
   - HIRA 데이터 = 한국 시장만. "글로벌"이라고 표기하면 안 됩니다
   - CMS = 미국 Medicare만 (전체 미국 시장의 25~30%)
   - NHS = 영국 잉글랜드 공공처방만 (전체 영국 시장의 60~70%)
   - 각 나라의 공공보험 데이터를 단순 합산하여 "글로벌 시장"이라 하지 마세요
   - 글로벌 시장 규모 언급 시 반드시 "추정"임을 명시하고 산출 근거를 밝히세요
4. 한국 시장 데이터를 중심으로, 글로벌 시장(미국/호주/영국)과 비교 분석
5. 마크다운 표를 최소 2개 이상 포함 (데이터 비교, 추이 등)
6. 전문 시장조사 보고서 수준의 분석 깊이 (단, 특정 시장조사 기관명이나 경쟁사 서비스명을 절대 언급하지 마세요)
7. 최소 3000자 이상, 구체적 수치와 근거 기반으로 작성
8. 단순 나열이 아닌 인사이트와 시사점을 도출하세요
9. 데이터 출처는 공공 데이터 기관(HIRA, ClinicalTrials.gov, PubMed, CMS, PBS, NHS 등)만 명시하고, 민간 시장조사 기관명은 사용하지 마세요
10. 각 섹션 끝에 반드시 "### 📊 데이터 출처" 소제목으로 해당 섹션에서 참조한 데이터의 출처와 기준을 정리하세요. 형식:
   - 출처명 | 데이터 항목 | 기준연도 | 비고(산출방법)
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
        return generateDataDrivenContent(section, drugName, indication, therapeuticArea, hiraRawData, clinicalTrialsData, globalData)
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
  indication: string,
  globalData?: any
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

  // ── 글로벌 의료데이터 (CMS Medicare / PBS Australia / NHS UK) ──
  if (globalData) {
    const globalParts: string[] = []

    // 🇺🇸 CMS Medicare (미국)
    if (globalData.cms?.drugSpending?.length > 0) {
      const cms = globalData.cms
      const totalSpending = cms.drugSpending.reduce((sum: number, d: any) => sum + (d.totalSpending || 0), 0)
      const totalBeneficiaries = cms.drugSpending.reduce((sum: number, d: any) => sum + (d.totalBeneficiaries || 0), 0)
      globalParts.push(`
■ 🇺🇸 미국 CMS Medicare Part D 실측 데이터
  - 약물: ${drugName}
  - 총 Medicare 지출액: $${Math.round(totalSpending).toLocaleString()} (USD)
  - 총 수혜자 수: ${totalBeneficiaries.toLocaleString()}명
  - 수혜자 1인당 평균 비용: $${totalBeneficiaries > 0 ? Math.round(totalSpending / totalBeneficiaries).toLocaleString() : 'N/A'}
  - 상세 품목:
${cms.drugSpending.slice(0, 10).map((d: any) =>
  `    · ${d.brandName || d.drugName || ''} (${d.genericName || ''}) - 지출 $${Math.round(d.totalSpending || 0).toLocaleString()}, 수혜자 ${(d.totalBeneficiaries || 0).toLocaleString()}명`
).join('\n')}
  ⚠ 주의: 이 데이터는 미국 Medicare(65세 이상 + 장애인)에 한정됩니다. 미국 전체 시장은 이보다 약 3~4배 큽니다.`)
    }

    // 🇦🇺 PBS Australia (호주)
    if (globalData.pbs?.items?.length > 0) {
      const pbs = globalData.pbs
      globalParts.push(`
■ 🇦🇺 호주 PBS(Pharmaceutical Benefits Scheme) 실측 데이터
  - 약물: ${drugName}
  - PBS 등재 품목 수: ${pbs.items.length}건
  - 상세:
${pbs.items.slice(0, 10).map((item: any) =>
  `    · ${item.brandName || item.tradeName || ''} (${item.genericName || item.drugName || ''}) - 정부보조가 AUD $${item.governmentPrice || item.dpmaPrice || 'N/A'}, 환자부담 AUD $${item.patientCopayment || item.patientPrice || 'N/A'}`
).join('\n')}
  ⚠ 주의: PBS 등재 품목에 한정됩니다. 비등재 약물은 포함되지 않습니다.`)
    }

    // 🇬🇧 NHS UK (영국)
    if (globalData.nhs?.prescriptionSummary?.length > 0) {
      const nhs = globalData.nhs
      const totalNhsCost = nhs.prescriptionSummary.reduce((sum: number, i: any) => sum + (i.totalCost || i.actualCost || 0), 0)
      const totalNhsItems = nhs.prescriptionSummary.reduce((sum: number, i: any) => sum + (i.prescriptionCount || i.items || 0), 0)
      globalParts.push(`
■ 🇬🇧 영국 NHS 처방 데이터 (잉글랜드)
  - 약물: ${drugName}
  - 총 처방 비용: £${Math.round(totalNhsCost).toLocaleString()} (GBP)
  - 총 처방건수: ${totalNhsItems.toLocaleString()}건
  - 건당 평균 비용: £${totalNhsItems > 0 ? (totalNhsCost / totalNhsItems).toFixed(2) : 'N/A'}
  - 상세:
${nhs.prescriptionSummary.slice(0, 10).map((item: any) =>
  `    · ${item.bnfName || item.drugName || ''} - 비용 £${Math.round(item.totalCost || item.actualCost || 0).toLocaleString()}, 처방 ${(item.prescriptionCount || item.items || 0).toLocaleString()}건`
).join('\n')}
  ⚠ 주의: NHS 잉글랜드 공공의료 처방에 한정됩니다. 사보험/웨일스/스코틀랜드는 별도입니다.`)
    }

    if (globalParts.length > 0) {
      parts.push(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
글로벌 의료데이터 실측 비교 자료 (${new Date().getFullYear()}년 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

중요: 아래는 각 나라의 공공보험 데이터입니다.
- 한국(HIRA) = 국민건강보험 전체 (거의 전국민)
- 미국(CMS) = Medicare 수혜자만 (전체의 약 25~30%)
- 호주(PBS) = PBS 등재 품목만
- 영국(NHS) = 잉글랜드 공공처방만

따라서 "글로벌 시장 규모"는 이 데이터들을 단순 합산하면 안 되며,
각 나라의 전체 시장은 공공보험 데이터의 약 2~4배로 추정됩니다.

${globalParts.join('\n')}

위 글로벌 데이터는 실제 API 조회 결과입니다.
한국 시장과 비교 분석 시 반드시 활용하되, 각 데이터의 범위(커버리지)를 정확히 명시하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }
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
  globalData?: any,
): string {
  const generators: Record<string, () => string> = {
    'executive-summary': () => genExecutiveSummary(drugName, indication, therapeuticArea, hiraData, ctData),
    'market-overview': () => genMarketOverview(drugName, indication, therapeuticArea, hiraData, ctData),
    'epidemiology': () => genEpidemiology(drugName, indication, therapeuticArea, hiraData, ctData),
    'market-size-forecast': () => genMarketSizeForecast(drugName, indication, therapeuticArea, hiraData, ctData, globalData),
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
    'retrospective-clinical-strategy': () => genRetrospectiveClinicalStrategy(drugName, indication, therapeuticArea, hiraData, ctData),
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

function genMarketSizeForecast(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null, globalData?: any): string {
  const claimAmount = hira?.claimAmount || 0
  const patientCount = hira?.patientCount || 0
  // 한국 시장 = HIRA 급여비 × 1.6 (비급여+약품 포함)
  const koreaMarketSize = claimAmount > 0 ? Math.round(claimAmount * 1.6) : 0
  const koreaMarketBillion = koreaMarketSize > 0 ? Math.round(koreaMarketSize / 1_0000_0000) : 0

  // ── 글로벌 실측 데이터 추출 ──
  const cmsSpending = globalData?.cms?.drugSpending?.reduce(
    (sum: number, d: any) => sum + (d.totalSpending || 0), 0) || 0
  const cmsBeneficiaries = globalData?.cms?.drugSpending?.reduce(
    (sum: number, d: any) => sum + (d.totalBeneficiaries || 0), 0) || 0
  const nhsCost = globalData?.nhs?.prescriptionSummary?.reduce(
    (sum: number, i: any) => sum + (i.totalCost || i.actualCost || 0), 0) || 0
  const nhsItems = globalData?.nhs?.prescriptionSummary?.reduce(
    (sum: number, i: any) => sum + (i.prescriptionCount || i.items || 0), 0) || 0
  const pbsCount = globalData?.pbs?.items?.length || 0

  // 환율 기준 (근사치, 실제 변동 고려)
  const usdToKrw = 1350 // USD → KRW
  const gbpToKrw = 1700 // GBP → KRW

  // 미국 전체 시장 추정: Medicare는 전체의 약 25~30% → ×3.5
  const usEstimatedTotal = cmsSpending > 0 ? Math.round(cmsSpending * 3.5) : 0
  const usEstimatedTotalKrw = usEstimatedTotal > 0 ? Math.round(usEstimatedTotal * usdToKrw) : 0
  // 영국 전체 시장 추정: NHS 잉글랜드 공공 처방은 전체의 약 60~70% → ×1.5
  const ukEstimatedTotal = nhsCost > 0 ? Math.round(nhsCost * 1.5) : 0
  const ukEstimatedTotalKrw = ukEstimatedTotal > 0 ? Math.round(ukEstimatedTotal * gbpToKrw) : 0

  // 성장률 추정 (치료영역에 따라 다름)
  const cagr = area.includes('종양') || area.includes('항암') ? 8.5
    : area.includes('대사') || area.includes('비만') ? 12.0
    : area.includes('면역') ? 9.2
    : area.includes('신경') ? 7.8
    : area.includes('디지털') ? 18.5
    : 7.5

  // ── 글로벌 비교 테이블 생성 ──
  const hasGlobalData = cmsSpending > 0 || nhsCost > 0 || pbsCount > 0

  const globalComparisonSection = hasGlobalData ? `
## 글로벌 시장 규모 비교 (국가별 공공보험 데이터 기준)

> ⚠ **중요**: 아래 수치는 각 나라의 **공공보험 데이터**에서 조회한 실측치입니다.
> 각 나라의 전체 시장(민간보험+자비 포함)은 공공보험 데이터보다 2~4배 큽니다.

| 국가 | 공공보험 실측 지출 | 커버리지 범위 | 추정 전체 시장 (환산) | 비고 |
|------|------------------|-------------|-------------------|------|
| 🇰🇷 한국 | ${fmtKrw(claimAmount)} | 국민건강보험 (전국민 97%) | **${fmtKrw(koreaMarketSize)}** | HIRA 2023 실측 × 1.6 |
${cmsSpending > 0 ? `| 🇺🇸 미국 | $${fmtNum(Math.round(cmsSpending))} (≈${fmtKrw(Math.round(cmsSpending * usdToKrw))}) | Medicare Part D (65세+, 약 25~30%) | **≈${fmtKrw(usEstimatedTotalKrw)}** | CMS 실측 × 3.5 |` : '| 🇺🇸 미국 | 데이터 미수집 | - | - | Step 4 실행 필요 |'}
${nhsCost > 0 ? `| 🇬🇧 영국 | £${fmtNum(Math.round(nhsCost))} (≈${fmtKrw(Math.round(nhsCost * gbpToKrw))}) | NHS 잉글랜드 (공공처방 60~70%) | **≈${fmtKrw(ukEstimatedTotalKrw)}** | NHS 실측 × 1.5 |` : '| 🇬🇧 영국 | 데이터 미수집 | - | - | Step 4 실행 필요 |'}
${pbsCount > 0 ? `| 🇦🇺 호주 | PBS 등재 ${pbsCount}품목 | PBS (등재 약물만) | *(약가 데이터 별도)* | 품목별 가격 참조 |` : '| 🇦🇺 호주 | 데이터 미수집 | - | - | Step 4 실행 필요 |'}

${cmsSpending > 0 ? `
### 한국 vs 미국 시장 비교

| 비교 항목 | 🇰🇷 한국 | 🇺🇸 미국 (Medicare) | 배율 |
|----------|---------|-------------------|------|
| 공공보험 지출 | ${fmtKrw(claimAmount)} | $${fmtNum(Math.round(cmsSpending))} (≈${fmtKrw(Math.round(cmsSpending * usdToKrw))}) | ${claimAmount > 0 ? `약 ${Math.round((cmsSpending * usdToKrw) / claimAmount)}배` : '-'} |
| 대상 환자수 | ${patientCount > 0 ? fmtNum(patientCount) + '명' : '-'} | ${cmsBeneficiaries > 0 ? fmtNum(cmsBeneficiaries) + '명' : '-'} | ${patientCount > 0 && cmsBeneficiaries > 0 ? `약 ${(cmsBeneficiaries / patientCount).toFixed(1)}배` : '-'} |
| 1인당 비용 | ${patientCount > 0 ? fmtKrw(Math.round(claimAmount / patientCount)) : '-'} | ${cmsBeneficiaries > 0 ? `$${fmtNum(Math.round(cmsSpending / cmsBeneficiaries))}` : '-'} | ${patientCount > 0 && cmsBeneficiaries > 0 ? `약 ${((cmsSpending / cmsBeneficiaries * usdToKrw) / (claimAmount / patientCount)).toFixed(1)}배` : '-'} |

> 미국 Medicare 1인당 비용이 한국보다 높은 것은 미국의 높은 약가 수준을 반영합니다.
` : ''}
` : `
## 글로벌 시장 규모

> 글로벌 의료데이터(Step 4)를 수집하면 미국(CMS), 영국(NHS), 호주(PBS) 실측 데이터와 비교 분석됩니다.
> 현재는 한국 시장 데이터만 표시됩니다.
`

  return `# 시장 규모 및 예측 (Market Size & Forecast)

## 🇰🇷 한국 시장 규모 (2023년 기준)

건강보험심사평가원 실측 데이터를 기반으로 산출한 **한국 내수 시장** 규모입니다.

| 항목 | 금액 | 산출 방법 |
|------|------|----------|
| 요양급여비용 총액 | ${fmtKrw(claimAmount)} | HIRA 심사결정 기준 |
| 비급여 추정 (약 20~30%) | ${claimAmount > 0 ? fmtKrw(Math.round(claimAmount * 0.25)) : '-'} | 급여비 대비 추정 |
| 의약품 시장 추정 (약 35~40%) | ${claimAmount > 0 ? fmtKrw(Math.round(claimAmount * 0.35)) : '-'} | 급여비 대비 추정 |
| **추정 한국 시장 규모** | **${fmtKrw(koreaMarketSize)}** | **급여비 × 1.6** |

${globalComparisonSection}

## 한국 시장 성장 예측 (2023~2030년)

CAGR ${cagr}% 기준 시나리오 분석 (한국 시장):

${koreaMarketBillion > 0 ? `
| 연도 | 기본 시나리오 | 낙관 시나리오 | 비관 시나리오 |
|------|-------------|-------------|-------------|
| 2023 (실측) | ${fmtNum(koreaMarketBillion)}억 원 | ${fmtNum(koreaMarketBillion)}억 원 | ${fmtNum(koreaMarketBillion)}억 원 |
| 2024 | ${fmtNum(Math.round(koreaMarketBillion * (1 + cagr/100)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * (1 + (cagr+2)/100)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * (1 + (cagr-3)/100)))}억 원 |
| 2025 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + cagr/100, 2)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + (cagr+2)/100, 2)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + (cagr-3)/100, 2)))}억 원 |
| 2027 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + cagr/100, 4)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + (cagr+2)/100, 4)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + (cagr-3)/100, 4)))}억 원 |
| 2030 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + cagr/100, 7)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + (cagr+2)/100, 7)))}억 원 | ${fmtNum(Math.round(koreaMarketBillion * Math.pow(1 + (cagr-3)/100, 7)))}억 원 |

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

### 📊 데이터 출처
| 출처 | 데이터 항목 | 기준연도 | 비고 |
|------|-----------|---------|------|
| 건강보험심사평가원 (HIRA) | 요양급여비용, 환자수 | 2023 | 한국 시장 실측 |
${cmsSpending > 0 ? '| CMS Medicare Part D | 약물 지출, 수혜자수 | 최신 | 미국 공공보험 (65세+) |' : ''}
${nhsCost > 0 ? '| NHS BSA PCA | 처방 비용, 처방건수 | 최신 | 영국 잉글랜드 공공처방 |' : ''}
${pbsCount > 0 ? '| PBS Australia | 등재 약가, 급여정보 | 최신 | 호주 PBS 등재 품목 |' : ''}
| ClinicalTrials.gov | 임상시험 현황 | ${new Date().getFullYear()} | 글로벌 전체 |
| 자체 추정 모델 | 시장 규모 추정 | - | 급여비 × 배수 |
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
  const patientCount = hira?.patientCount || 0
  const claimAmount = hira?.claimAmount || 0
  const avgCostPerPatient = patientCount > 0 ? Math.round(claimAmount / patientCount) : 0

  return `# 경쟁 환경 분석 (Competitive Landscape)

## ${indication} 치료제 경쟁 현황

본 섹션은 **${indication}** 적응증에서 **${drug}**과 직접 경쟁하는 치료제들의 상세 비교 분석입니다.

### 제품별 핵심 비교 지표

| 비교 항목 | ${drug} (분석 대상) | 경쟁약 A | 경쟁약 B | 경쟁약 C |
|----------|-------------------|---------|---------|---------|
| **성분명(Generic)** | ${drug} | - | - | - |
| **제조사** | - | - | - | - |
| **허가 적응증** | ${indication} | - | - | - |
| **작용기전(MOA)** | - | - | - | - |
| **투여방법** | - | - | - | - |
| **투여주기** | - | - | - | - |
| **핵심 임상 효능** | - | - | - | - |
| **주요 부작용** | - | - | - | - |
| **한국 급여가** | - | - | - | - |
| **시장 점유율 (추정)** | - | - | - | - |
| **특허 만료일** | - | - | - | - |
| **★ 강점** | - | - | - | - |
| **★ 약점** | - | - | - | - |

> ⚠ 위 표는 AI 보고서 생성(Step 5) 시 ClinicalTrials.gov, HIRA 실측 데이터, 글로벌 의료데이터를 기반으로 자동 채워집니다.

${ct && sponsors.length > 0 ? `
### ClinicalTrials.gov 기준 활발한 임상시험 수행 기업

ClinicalTrials.gov에 등록된 ${indication} 관련 임상시험의 스폰서 분석:

${sponsors.map((s, i) => `${i + 1}. **${s}** — ${ct?.topStudies?.filter(t => t.sponsor === s).length || 0}건 임상시험 수행`).join('\n')}

### 주요 진행 중인 임상시험
${getTrialTopTable(ct)}
` : ''}

## 제품별 SWOT 분석

### ${drug} SWOT

| 구분 | 내용 |
|------|------|
| **Strengths** | ${indication} 치료에서의 임상 근거, 한국 급여 등재 현황 |
| **Weaknesses** | 경쟁약 대비 한계점 (투여 불편, 부작용, 가격 등) |
| **Opportunities** | 적응증 확대, 병용요법, 신규 환자군 발굴 |
| **Threats** | 특허만료/바이오시밀러, 차세대 치료제, 약가인하 |

## 한국 시장 경쟁 구도

${patientCount > 0 ? `한국 내 ${indication} 환자 **${fmtNum(patientCount)}명** (HIRA 2023)의 처방 시장을 두고 글로벌 및 국내 제약사가 경쟁하고 있습니다.` : ''}
${avgCostPerPatient > 0 ? `환자당 평균 연간 급여비용은 **${fmtKrw(avgCostPerPatient)}**으로, 총 시장 규모는 약 **${fmtKrw(Math.round(claimAmount * 1.6))}** (급여비×1.6, 비급여 포함 추정)입니다.` : ''}

### 한국 시장 경쟁 특수성
- 건강보험 급여 제도: 급여 등재 여부가 시장 접근의 핵심
- 실거래가 제도: 가격 경쟁이 시장 점유율에 직접적 영향
- DUR(의약품사용적정성) 시스템: 처방 패턴에 대한 제도적 제약
- 학술 마케팅: KOL(Key Opinion Leader) 관리가 처방 점유율 핵심

*데이터 출처: ClinicalTrials.gov(2025), HIRA(2023)*
`
}

function genCompanyProfiles(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  // 스폰서별 임상시험 집계
  const sponsorMap: Record<string, { trials: any[]; phases: Set<string> }> = {}
  ct?.topStudies?.forEach((s: any) => {
    const sponsor = s.sponsor || 'Unknown'
    if (!sponsorMap[sponsor]) sponsorMap[sponsor] = { trials: [], phases: new Set() }
    sponsorMap[sponsor].trials.push(s)
    if (s.phase) sponsorMap[sponsor].phases.add(s.phase)
  })
  const topSponsors = Object.entries(sponsorMap)
    .sort(([, a], [, b]) => b.trials.length - a.trials.length)
    .slice(0, 6)

  return `# 기업 프로파일 (Company Profiles)

> ⚠ 본 섹션은 **${indication}** 적응증에서 **${drug}**과 직접 관련된 기업만 다룹니다. 일반적인 글로벌 제약사 소개가 아닙니다.

## ${indication} 영역 핵심 기업 요약

${ct ? `ClinicalTrials.gov에 등록된 **${indication} 관련 ${fmtNum(ct.totalCount)}건**의 임상시험에서 확인된 주요 Sponsor/Collaborator 기업:` : '데이터 동기화 후 자동 업데이트됩니다.'}

${topSponsors.length > 0 ? `
| 순위 | 기업명 | ${indication} 임상시험 수 | 진행 단계 | 주요 전략 |
|------|-------|----------------------|---------|---------|
${topSponsors.map(([name, data], i) => `| ${i + 1} | ${name} | ${data.trials.length}건 | ${Array.from(data.phases).join(', ') || '-'} | ${i < 2 ? '선도기업' : i < 4 ? '도전기업' : '신규진입'} |`).join('\n')}
` : ''}

${topSponsors.map(([name, data], i) => `
### ${i + 1}. ${name}

**${indication} 영역 임상시험 상세:**
${data.trials.slice(0, 3).map((t: any) => `- **${t.nctId}**: ${t.title || '제목 미확인'} (${t.phase || 'Phase 미확인'}, ${t.status || '상태 미확인'})`).join('\n')}
${data.trials.length > 3 ? `- 외 ${data.trials.length - 3}건 추가 임상시험 진행` : ''}

**${indication} 포지셔닝:**
- 임상 단계: ${Array.from(data.phases).join(', ') || '확인 필요'}
- ${drug}과의 경쟁 관계: ${i === 0 ? '주요 경쟁자 (시장 선도)' : i < 3 ? '직접 경쟁자' : '잠재 경쟁자'}
- 한국 시장 활동: 임상시험 ${data.trials.some((t: any) => {
    const loc = t.locations || t.country || ''
    return typeof loc === 'string' && (loc.includes('Korea') || loc.includes('한국'))
  }) ? '한국 포함 진행 중' : '한국 진행 여부 확인 필요'}
`).join('\n')}

${!topSponsors.length ? `현재 ClinicalTrials.gov 데이터 동기화 진행 중입니다. Step 2 완료 후 자동으로 기업 데이터가 채워집니다.` : ''}

## ${indication} 기업 경쟁 구도 요약

${topSponsors.length >= 3 ? `
**시장 선도 그룹**: ${topSponsors.slice(0, 2).map(([n]) => n).join(', ')} — 다수의 임상시험과 넓은 파이프라인
**추격 그룹**: ${topSponsors.slice(2, 4).map(([n]) => n).join(', ') || '분석 중'} — 특정 MOA 또는 니치 전략
${topSponsors.length > 4 ? `**신규 진입**: ${topSponsors.slice(4).map(([n]) => n).join(', ')} — 혁신적 접근법으로 시장 진입 시도` : ''}
` : '데이터 확보 후 경쟁 구도가 자동 분석됩니다.'}

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
  // 임상시험 국가별 분포 추출
  const countryTrials: Record<string, number> = {}
  ct?.topStudies?.forEach((s: any) => {
    const locations = s.locations || s.country || ''
    if (typeof locations === 'string' && locations) {
      const country = locations.split(',')[0]?.trim() || 'Unknown'
      countryTrials[country] = (countryTrials[country] || 0) + 1
    }
  })
  const countryEntries = Object.entries(countryTrials).sort(([, a], [, b]) => b - a).slice(0, 8)

  const metroRatio = hira?.regionStats?.length > 0 ? Math.round(
    hira.regionStats.filter((r: any) => ['서울', '경기', '인천'].some((name: string) => r.region?.includes(name)))
      .reduce((sum: number, r: any) => sum + (r.ratio || 0), 0)
  ) : 0

  return `# 지역별 시장 분석 (Regional Analysis)

## 1. 한국 국내 시도별 ${indication} 환자 분포

건강보험심사평가원 실측 데이터 기반:
${getRegionTable(hira) || '*(HIRA 데이터 동기화 후 자동 업데이트)*'}

${metroRatio > 0 ? `
**수도권 집중도 분석**: 서울·경기·인천에 전체 ${indication} 환자의 약 **${metroRatio}%**가 집중되어 있습니다.
- 이는 ${indication} 전문 진료가 가능한 상급종합병원의 수도권 집중과 높은 상관관계
- ${drug} 처방이 활발한 의료기관도 이 지역에 밀집될 가능성 높음
- 임상시험 기관 선정 시 수도권 대형병원을 1순위로 고려 필요` : ''}

## 2. ${indication}에서의 글로벌 지역별 ${drug} 경쟁 현황

> ⚠ 아래는 **${indication}** 적응증 내 **${drug}** 및 동일 계열 약물의 지역별 시장 특성입니다. (일반적인 제약산업 현황이 아님)

| 지역 | ${indication} 시장 특성 | ${drug} 관련 활동 | 임상시험 |
|------|---------------------|-----------------|---------|
| 북미 (미국) | ${indication} 최대 시장, 높은 약가 | FDA 허가 또는 허가 추진 중 | ${countryTrials['United States'] ? `${countryTrials['United States']}건 진행` : '확인 필요'} |
| EU5 | 참조 약가, HTA 심사 필수 | EMA 허가 또는 각국 급여 협상 | ${countryTrials['France'] || countryTrials['Germany'] || countryTrials['United Kingdom'] ? '복수 건 진행' : '확인 필요'} |
| 일본 | PMDA 별도 허가, NHI 약가 | 한국과 유사한 급여 체계 | ${countryTrials['Japan'] ? `${countryTrials['Japan']}건 진행` : '확인 필요'} |
| 중국 | NMPA 허가, VBP 가격 하락 | 급성장 중이나 가격 압박 | ${countryTrials['China'] ? `${countryTrials['China']}건 진행` : '확인 필요'} |
| 한국 | ${hira?.patientCount ? `HIRA 기준 ${fmtNum(hira.patientCount)}명 환자` : '건보 급여 기반'} | ${drug} 급여 등재 여부가 핵심 | 임상 인프라 강점 |

${countryEntries.length > 0 ? `
### ClinicalTrials.gov 기준 ${indication} 임상시험 국가별 분포

| 국가 | 임상시험 수 |
|------|-----------|
${countryEntries.map(([country, count]) => `| ${country} | ${count}건 |`).join('\n')}
` : ''}

## 3. 한국의 ${indication} 글로벌 포지션

### ${indication} 영역 한국 기업의 구체적 활동
> ⚠ 일반적인 "삼성바이오로직스·셀트리온 북미 진출" 같은 포괄적 내용이 아니라, **${indication}** 적응증에서의 구체적 활동 분석

- **국내 ${indication} 치료 현황**: ${hira?.claimAmount ? `연간 급여비 ${fmtKrw(hira.claimAmount)}, 환자 ${fmtNum(hira?.patientCount || 0)}명` : '분석 중'}
- **${drug} 국내 사용 패턴**: HIRA 처방 데이터 기반 처방 빈도, 주요 사용 기관, 병용처방 현황
- **한국 기업의 ${indication} R&D**: 해당 적응증에 파이프라인을 보유한 국내 기업 분석
- **한국 임상시험 인프라 강점**: ${indication} 환자 접근성, 전자건강기록(EHR) 인프라, 규제 신속성

### 한국 시장의 전략적 가치

| 관점 | 한국 시장 강점 | ${indication} 특수성 |
|------|-------------|-------------------|
| 임상시험 | 빠른 IRB 승인, 우수한 GCP | ${hira?.patientCount ? `${fmtNum(hira.patientCount)}명 환자 풀 활용 가능` : '환자 풀 확보 가능'} |
| RWD/RWE | HIRA 청구 데이터, 건보 전수 데이터 | ${indication} 치료 패턴·비용 분석 가능 |
| 규제 | MFDS 신속심사, 아시아 레퍼런스 | FDA/EMA 브릿지 데이터 활용 |
| 시장 접근 | 단일보험자, 급여 등재 시 전국 적용 | ${drug} 급여 결정 시 신속 확산 |

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
  const phaseDistribution = ct?.phaseBreakdown ? Object.entries(ct.phaseBreakdown)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([phase, count]) => `${phase}: ${count}건`)
    .join(', ') : ''

  return `# 전략적 권고사항 (Strategic Recommendations)

## 1. ${indication} 시장 진입 전략

### 핵심 타겟팅 전략
1. **HIRA RWD 기반 환자 세분화**: ${hira?.patientCount ? `${fmtNum(hira.patientCount)}명의 ${indication} 환자 데이터에서` : `${indication} 환자 데이터에서`} 연령·성별·지역·의료기관 유형별 세그먼트 구성
${hira?.regionStats?.length > 0 ? `2. **지역별 우선순위**: ${hira.regionStats[0]?.region}(${hira.regionStats[0]?.ratio}%) → ${hira.regionStats[1]?.region || ''}(${hira.regionStats[1]?.ratio || ''}%) 순서로 KOL 네트워크 구축` : '2. **지역별 우선순위**: 수도권 대형병원 중심 → 지방 거점병원으로 확대'}
3. **${drug} 포지셔닝**: 경쟁 약물 대비 차별화 포인트(효능·안전성·가격·편의성) 중심 메시지 설계
4. **급여 전략**: 건보 급여 확대 또는 선별급여·위험분담제 활용 방안 수립

### 단기 실행 로드맵 (6~12개월)

| 단계 | 활동 | KPI |
|------|------|-----|
| 1단계 (1~3개월) | KOL 매핑, 처방 패턴 분석 | KOL 30명+ 식별 |
| 2단계 (3~6개월) | 학술 심포지엄, 임상 근거 전파 | 인지도 조사 +20% |
| 3단계 (6~12개월) | 타겟 처방 확대, 시장점유율 모니터링 | M/S +5%p |

## 2. 임상시험 성공 전략

### ${indication} 임상시험 성공률 분석

${ct ? `ClinicalTrials.gov 기준, ${indication} 관련 글로벌 임상시험 **총 ${fmtNum(ct.totalCount)}건** 중:
${phaseDistribution ? `- 단계별 분포: ${phaseDistribution}` : ''}
- Phase 2→3 전환율은 일반적으로 25~35% 수준` : `${indication} 임상시험에 대한 글로벌 분석:`}

### 주요 실패 요인 및 대응 전략

| 실패 요인 | 비율 | 대응 전략 |
|----------|------|----------|
| 유효성 미달 | ~50% | RWD 기반 바이오마커 사전 선별, 적절한 1차 평가변수 설정 |
| 안전성 문제 | ~20% | 한국 HIRA 데이터로 사전 안전성 시그널 탐지 |
| 환자 모집 실패/지연 | ~15% | 그린리본 RWD 플랫폼 활용한 환자 사전 스크리닝 |
| 시험 설계 결함 | ~10% | 후향적 연구(RWE)로 설계 사전 검증 |
| 규제 이슈 | ~5% | MFDS·FDA·EMA 규제 경로 사전 협의 |

### 임상시험 설계 최적화

**${indication} 특화 설계 권고:**
1. **환자 선정 기준 최적화**: HIRA 환자 프로파일(연령·성별·중증도)에 맞춘 I/E criteria 설정${hira?.genderStats ? ` → ${indication} 환자 성비 반영` : ''}
2. **평가변수 설계**: 규제기관 인정 가능한 1차 평가변수 + 환자 중심 결과(PRO) 포함
3. **대조군 선택**: ${drug}의 기존 치료 패턴(HIRA 처방 데이터 기반) 반영한 적절한 비교군
4. **표본 수 산출**: 사전 RWD 분석으로 효과 크기 추정 → 검정력 최적화

### 환자 리크루팅 가속화 전략

| 전략 | 상세 | 기대 효과 |
|------|------|----------|
| RWD 사전 스크리닝 | HIRA 데이터로 적격 환자 풀 사전 식별 | 스크리닝 기간 50% 단축 |
| 디지털 리크루팅 | 환자 포털, SNS 타겟 광고 | 환자 접근성 확대 |
| 기관 네트워크 활용 | ${hira?.institutionStats ? `상위 의료기관 우선 참여` : '다기관 네트워크 구축'} | 등록 속도 가속 |
| KOL 연계 | PI(연구책임자) 네트워크 활용 | 기관 참여 활성화 |

### 규제 전략

- **한국(MFDS)**: 한국형 임상시험 설계로 신속 허가 경로 활용 (혁신의료기기, 신속심사)
- **미국(FDA)**: Breakthrough Therapy, Fast Track, Accelerated Approval 대상 여부 검토
- **유럽(EMA)**: PRIME(PRIority MEdicines) 지정 가능성 검토

## 3. 그린리본 플랫폼 활용 전략

| 전략 | 실행 방안 | 기대 효과 |
|------|---------|----------|
| RWD 기반 타겟 마케팅 | ${indication} 환자 세그먼트별 맞춤 메시지 | 전환율 2~3배 향상 |
| 임상시험 리크루팅 | ${hira?.patientCount ? `${fmtNum(hira.patientCount)}명 환자 풀에서` : '환자 풀에서'} 적격 환자 매칭 | 리크루팅 기간 40~60% 단축 |
| RWE 생성 서비스 | 후향적 연구 데이터 기반 임상 근거 생성 | 허가·급여 근거 보강 |
| 시장 인텔리전스 | 경쟁사 동향, 처방 패턴, 시장 변화 모니터링 | 전략적 의사결정 지원 |

*데이터 출처: HIRA(2023), ClinicalTrials.gov(2025)*
`
}

function genRetrospectiveClinicalStrategy(drug: string, indication: string, area: string, hira: any, ct: ClinicalTrialsData | null): string {
  const patientCount = hira?.patientCount || 0
  const claimAmount = hira?.claimAmount || 0
  const hasGenderData = hira?.genderStats?.length > 0
  const hasAgeData = hira?.ageStats?.length > 0
  const hasRegionData = hira?.regionStats?.length > 0

  return `# 후향적 임상 전략 (Retrospective Clinical Strategy)

> 본 섹션은 **${indication}** 적응증에서 **${drug}**에 대한 Real-World Evidence(RWE) 기반 후향적 임상 연구 전략을 수립합니다.

## 1. RWE(Real-World Evidence) 전략 개요

### 왜 후향적 연구인가?
- **비용 효율성**: 전향적 임상시험 대비 1/10 이하의 비용으로 임상 근거 생성
- **시간 단축**: 이미 축적된 데이터 활용으로 12~18개월 내 결과 도출 가능
- **규제 활용**: FDA/EMA/MFDS 모두 RWE를 의사결정 보조 근거로 인정 추세
- **시장 접근**: 건보 급여 확대, 약가 재평가 시 핵심 근거

### ${indication}에서의 RWE 활용 가치
${patientCount > 0 ? `- HIRA 기준 **${fmtNum(patientCount)}명**의 ${indication} 환자 데이터 활용 가능` : '- 한국 건강보험 전수 데이터 활용 가능'}
${claimAmount > 0 ? `- 연간 **${fmtKrw(claimAmount)}** 규모의 급여비 데이터로 비용-효과 분석 가능` : ''}
${ct ? `- ClinicalTrials.gov ${fmtNum(ct.totalCount)}건의 전향적 임상과 상호보완적 근거 생성` : ''}

## 2. 연구 설계 (Study Design)

### 추천 연구 유형

| 연구 유형 | 목적 | ${drug} 적용 | 우선순위 |
|----------|------|------------|---------|
| 후향적 코호트 연구 | ${drug} 사용 환자 vs 비사용 환자 치료 결과 비교 | 효능·안전성 근거 | ★★★★★ |
| 처방 패턴 분석 | ${indication}에서 ${drug} 처방 현황 파악 | 시장 인사이트 | ★★★★☆ |
| 비용-효과 분석 (CEA) | 대체 치료 대비 경제성 평가 | 급여 근거 | ★★★★★ |
| 약물이용평가 (DUR) | ${drug} 적정 사용 여부 분석 | 안전성 모니터링 | ★★★☆☆ |
| 질병 부담 연구 (BOI) | ${indication}의 경제적·사회적 부담 측정 | 정책 근거 | ★★★★☆ |
| 예측 모델링 | 환자 아웃컴 예측, 반응군 식별 | 정밀의료 | ★★★☆☆ |

### 핵심 연구 프로토콜 (예시)

**연구 제목**: ${indication} 환자에서 ${drug} 사용의 실제 임상 결과: 한국 건강보험 청구 데이터 기반 후향적 코호트 연구

| 프로토콜 항목 | 내용 |
|-------------|------|
| **연구 대상** | ${indication} 진단 환자 중 ${drug} 처방력 있는 환자 |
| **대조군** | 동일 적응증 내 대체 치료제 사용 환자 |
| **연구 기간** | 최근 3~5년 데이터 (후향적) |
| **1차 평가변수** | 치료 반응률, 질병 관련 입원율 |
| **2차 평가변수** | 이상반응 발생률, 의료비용, 약물 지속율 |
| **분석 방법** | PSM(성향점수매칭), Cox regression, Kaplan-Meier |
${patientCount > 0 ? `| **예상 대상자 수** | ${fmtNum(Math.round(patientCount * 0.3))}~${fmtNum(Math.round(patientCount * 0.5))}명 (전체의 30~50%) |` : ''}

## 3. 데이터 소스 및 활용

### 활용 가능한 데이터 소스

| 데이터 소스 | 유형 | ${indication} 활용도 | 접근성 |
|-----------|------|-------------------|--------|
| HIRA 청구 데이터 | 건보 청구 전수 | ${patientCount > 0 ? `${fmtNum(patientCount)}명 환자 데이터` : '전수 데이터'} | 신청 후 제공 |
| 국민건강보험공단 (NHIS) | 자격·건강검진·장기요양 | 환자 기본 특성, 사망 데이터 | 연구 신청 |
| 병원 기반 EMR | 진료기록, 검사결과 | 상세 임상 지표 | 기관 협약 |
| 건강보험심사평가원 표본 코호트 | 1백만 명 표본 | 장기 추적 가능 | 공개 데이터 |
| 질병관리청 KoGES | 유전체+건강정보 | 바이오마커 연구 | 연구 승인 |

### HIRA 데이터 기반 분석 가능 항목

${hasGenderData || hasAgeData || hasRegionData ? `현재 확보된 HIRA 데이터에서 다음 분석이 즉시 가능합니다:` : ''}

| 분석 항목 | 가용성 | 상세 |
|----------|-------|------|
| 환자 인구통계 (성별·연령) | ${hasGenderData && hasAgeData ? '✅ 가능' : '⏳ 동기화 필요'} | ${hasGenderData ? 'HIRA 실측 데이터 확보' : '데이터 확보 후'} |
| 지역별 분포 | ${hasRegionData ? '✅ 가능' : '⏳ 동기화 필요'} | ${hasRegionData ? '시도별 분포 확보' : '데이터 확보 후'} |
| 진료비 분석 | ${claimAmount > 0 ? '✅ 가능' : '⏳ 동기화 필요'} | ${claimAmount > 0 ? `총 ${fmtKrw(claimAmount)}` : '데이터 확보 후'} |
| 처방 패턴 | ⏳ 상세 분석 필요 | 청구 상세 데이터 신청 시 |
| 병용 처방 | ⏳ 상세 분석 필요 | 약품별 청구 내역 필요 |
| 치료 결과 | ⏳ EMR 연계 필요 | 병원 데이터 협약 시 |

## 4. 분석 방법론

### 통계 분석 프레임워크

| 분석 유형 | 방법 | 적용 | 소프트웨어 |
|----------|------|------|-----------|
| 기술통계 | 빈도, 평균, 중앙값, IQR | 환자 특성 기술 | SAS, R |
| 성향점수매칭 (PSM) | Nearest-neighbor, caliper | ${drug} vs 대조군 비교 | R (MatchIt) |
| 생존분석 | Kaplan-Meier, Cox regression | 치료 지속, 생존 | R (survival) |
| 비용분석 | GLM (gamma), 부트스트랩 | CEA, BIA | TreeAge, R |
| 서브그룹 분석 | Interaction term, Forest plot | 반응군 식별 | R, Stata |
| 민감도 분석 | E-value, quantitative bias | 결과 강건성 검증 | R |

## 5. 규제 활용 전략

### RWE를 활용한 규제 경로

| 규제 기관 | RWE 활용 영역 | ${drug}/${indication} 적용 |
|----------|-------------|------------------------|
| MFDS (한국) | 시판후조사, 재심사, 급여 확대 | 급여 적응증 확대 근거 |
| FDA (미국) | Post-market evidence, label expansion | 허가 사항 변경 보조 근거 |
| EMA (유럽) | DARWIN EU, HTA 보조 | 유럽 시장 접근 근거 |
| NICE/HAS (HTA) | 비용-효과성 평가 | 약가·급여 협상 |
| 건보공단 (한국) | 약가 재평가, 위험분담 | 급여 유지·확대 |

## 6. 실행 로드맵

| 단계 | 기간 | 주요 활동 | 산출물 |
|------|------|---------|--------|
| 1. 프로토콜 수립 | 1~2개월 | IRB 신청, 연구 설계 확정 | 연구 프로토콜 |
| 2. 데이터 확보 | 2~4개월 | HIRA/NHIS 데이터 신청·수령 | 분석 데이터셋 |
| 3. 데이터 클리닝 | 1~2개월 | 변수 정의, 코딩, QC | 분석 준비 데이터 |
| 4. 통계 분석 | 2~3개월 | 1차/2차 분석, 서브그룹 | 분석 결과 |
| 5. 논문/보고서 작성 | 2~3개월 | 학술지 투고, 규제 보고서 | 발표 자료 |
| 6. 규제 활용 | 지속 | 급여 신청, 허가 변경 | 규제 문서 |

**총 예상 소요기간**: 8~14개월
**예상 비용**: 1~3억 원 (데이터 규모 및 분석 복잡도에 따라 변동)

## 7. 그린리본 RWD 플랫폼 연계

그린리본 플랫폼이 후향적 임상 연구에서 제공할 수 있는 가치:

| 서비스 | 내용 | 차별점 |
|--------|------|--------|
| 환자 코호트 구축 | HIRA 데이터 기반 ${indication} 환자 코호트 자동 생성 | 수작업 대비 90% 시간 절감 |
| 실시간 모니터링 | 처방 트렌드, 시장 변화 추적 | 연 4회 업데이트 |
| 비교 분석 | ${drug} vs 경쟁약 비교 자동화 | 표준화된 분석 프레임 |
| 보고서 생성 | 규제 제출용 RWE 보고서 자동 생성 | 규제 양식 맞춤 |

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

/**
 * 차트 + 테이블 추출 (개선된 버전)
 *
 * 기존 문제: 텍스트에서 숫자를 정규식으로 뽑아 단위 구분 없이 차트화 → 왜곡
 * 개선: 표만 텍스트에서 추출하고, 차트는 실측 데이터 기반으로 별도 생성
 *
 * @param content - 섹션 텍스트
 * @param hiraData - HIRA 실측 데이터 (optional, 있으면 실데이터 차트 생성)
 * @param globalData - 글로벌 의료데이터 (optional)
 * @param clinicalTrialsData - 임상시험 데이터 (optional)
 */
function extractChartsAndTables(
  content: string,
  hiraData?: any,
  globalData?: any,
  clinicalTrialsData?: any
) {
  // 표만 텍스트에서 추출 (정확한 데이터)
  const { tables, hasTables } = extractTablesOnly(content)

  // 차트는 실측 데이터 기반으로 생성 (텍스트 정규식 추출 X)
  const charts = buildDataDrivenCharts(hiraData, globalData, clinicalTrialsData)

  return { charts, tables, hasCharts: charts.length > 0, hasTables }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데이터 수집: DB 캐시 우선 → 없으면 API → 결과 DB 저장
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getHiraData(slug: string, cachedHiraData?: any, indication?: string): Promise<{ contextStr: string; rawData: any }> {
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
    console.log(`[ReportGenerator] HIRA 데이터 API 조회 중: ${slug} (indication: ${indication || 'N/A'})`)
    const hiraContext = await buildHiraContext(slug, indication)
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

  // 글로벌 데이터도 DB에서 로드 (있으면)
  let cachedGlobalData: any = null
  if (slug) {
    try {
      const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
      cachedGlobalData = (catalog as any)?.globalMedicalData || null
    } catch (e) {
      console.error(`[ReportGenerator] 글로벌 데이터 로드 실패:`, e)
    }
  }

  // 데이터 수집 (병렬) - PubMed 추가
  const [hiraResult, ctResult, pubMedResult] = await Promise.all([
    getHiraData(slug || '', cachedHiraData),
    getClinicalTrialsData(slug || '', cachedClinicalTrialsData),
    getPubMedData(slug || '', drugName, indication, cachedPubMedData),
  ])

  const fullContextStr = [hiraResult.contextStr, ctResult.contextStr].filter(Boolean).join('\n\n')
  const pubMedContextStr = pubMedResult.contextStr || ''

  // 차트는 첫 번째 섹션(경영진 요약)에만 붙이고, 나머지는 표만 추출
  // (모든 섹션에 동일한 차트가 반복되는 것 방지)
  let chartsAssigned = false

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

    // 실데이터 기반 차트: 첫 번째 또는 "시장 규모" 섹션에 배치
    let { charts, tables, hasCharts, hasTables } = extractChartsAndTables(
      content,
      !chartsAssigned ? hiraResult.rawData : undefined,
      !chartsAssigned ? cachedGlobalData : undefined,
      !chartsAssigned ? ctResult.data : undefined
    )
    if (charts.length > 0) chartsAssigned = true

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

  // ── 보고서 검수 (Validation) ──
  console.log(`[ReportGenerator] 보고서 검수 시작...`)
  const validationResult = validateReport(
    generatedSections.map(s => ({
      title: s.title,
      content: s.content,
      charts: s.charts,
    })),
    hiraResult.rawData,
    cachedGlobalData,
    ctResult.data
  )

  // 검수 결과 로깅
  console.log(`[ReportGenerator] 검수 점수: ${validationResult.score}/100 (${validationResult.isValid ? '통과' : '이슈 있음'})`)
  if (validationResult.issues.length > 0) {
    const errors = validationResult.issues.filter(i => i.severity === 'error')
    const warnings = validationResult.issues.filter(i => i.severity === 'warning')
    console.log(`[ReportGenerator] 검수 결과: 에러 ${errors.length}건, 경고 ${warnings.length}건`)
    for (const issue of validationResult.issues) {
      console.log(`[ReportValidator] [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}${issue.location ? ` (${issue.location})` : ''}`)
    }
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

  // 글로벌 데이터도 로드
  let cachedGlobalData: any = null
  try {
    const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
    cachedGlobalData = (catalog as any)?.globalMedicalData || null
  } catch (e) {
    console.error(`[SingleSection] 글로벌 데이터 로드 실패:`, e)
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
  // 첫 번째 섹션(경영진 요약)에만 실데이터 차트 배치
  const isFirstSection = sectionIndex === 0
  const { charts, tables, hasCharts, hasTables } = extractChartsAndTables(
    content,
    isFirstSection ? hiraResult.rawData : undefined,
    isFirstSection ? cachedGlobalData : undefined,
    isFirstSection ? ctResult.data : undefined
  )

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
