import { reportSections, ReportSection } from './report-templates'
import { buildHiraContext, formatHiraContextForPrompt, type HiraReportContext } from './hira-report-enricher'
import { fetchClinicalTrials, formatClinicalTrialsForReport, type ClinicalTrialsData } from './clinicaltrials-api'
import { getSearchParamsBySlug } from './clinicaltrials-mapping'
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
  // DB에서 가져온 캐시 데이터 (있으면 API 호출 건너뜀)
  cachedHiraData?: any
  cachedClinicalTrialsData?: any
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

// OpenAI GPT-4o API call
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
      model: 'gpt-4o',
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

// Anthropic Claude API call
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
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

// Generate a single section with retry
async function generateSectionWithRetry(
  section: ReportSection,
  drugName: string,
  indication: string,
  therapeuticArea: string,
  hiraContextStr: string = '',
  clinicalTrialsData?: ClinicalTrialsData | null,
  retries: number = 2
): Promise<string> {
  // API 키 없으면 즉시 fallback 반환 (재시도 없음)
  const hasOpenAIKey = process.env.OPENAI_API_KEY?.trim()
  const hasAnthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!hasOpenAIKey && !hasAnthropicKey) {
    console.log(`[Section: ${section.title}] No API keys configured, returning fallback content immediately`)
    return generateFallbackContent(section, drugName, indication, therapeuticArea, clinicalTrialsData)
  }

  const hiraBlock = hiraContextStr
    ? `\n\n${hiraContextStr}\n\n위 HIRA 실측 데이터를 반드시 활용하여 작성하세요. 수치 인용 시 "건강보험심사평가원 자료 기준"으로 출처를 표기하세요.\n`
    : ''

  const userPrompt = `
약물/치료제: ${drugName}
적응증: ${indication}
치료 영역: ${therapeuticArea}
${hiraBlock}
위 정보를 기반으로 "${section.title}" 섹션을 작성해주세요.
한국 제약/바이오 시장 데이터를 중심으로, 글로벌 시장과의 비교도 포함해주세요.
전문 리서치 보고서 수준의 상세하고 데이터 기반의 분석을 제공해주세요.
최소 2000자 이상으로 작성해주세요.
마크다운 형식으로 작성하되, 표와 수치 데이터를 적극 활용해주세요.
`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const callAI = section.aiProvider === 'openai' ? callOpenAI : callAnthropicClaude
      const content = await callAI(section.systemPrompt, userPrompt)
      if (content && content.length > 100) {
        return content
      }
      throw new Error('Generated content too short')
    } catch (error) {
      console.error(`[Section: ${section.title}] attempt ${attempt}/${retries} failed:`, error)
      if (attempt === retries) {
        return generateFallbackContent(section, drugName, indication, therapeuticArea, clinicalTrialsData)
      }
      // 1초 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return ''
}

// Fallback content when AI fails
function generateFallbackContent(
  section: ReportSection,
  drugName: string,
  indication: string,
  therapeuticArea: string,
  clinicalTrialsData?: ClinicalTrialsData | null
): string {
  // 임상시험 정보 (있을 경우) 추가
  let clinicalTrialsSection = ''
  if (clinicalTrialsData) {
    clinicalTrialsSection = `

### 임상시험 현황
현재 ClinicalTrials.gov에 등록된 관련 임상시험: **${clinicalTrialsData.totalCount}건**

**단계별 분류:**
${Object.entries(clinicalTrialsData.phaseBreakdown)
  .map(([phase, count]) => `- ${phase}: ${count}건`)
  .join('\n')}
`
  }

  return `# ${section.title}

## ${drugName} - ${indication} 시장 분석

### 개요
${therapeuticArea} 영역의 ${indication} 치료를 위한 ${drugName}에 대한 분석입니다.

본 섹션은 현재 데이터 수집 및 분석이 진행 중이며, 곧 업데이트될 예정입니다.

### 주요 포인트
- 한국 ${therapeuticArea} 시장은 지속적으로 성장하고 있습니다
- ${indication} 관련 치료 수요가 증가하고 있습니다
- ${drugName}의 시장 포지셔닝에 대한 상세 분석이 필요합니다
${clinicalTrialsSection}

### 데이터 출처
- 건강보험심사평가원 (HIRA)
- ClinicalTrials.gov
- 한국제약바이오협회
- 글로벌 시장조사 기관 (IQVIA, GlobalData)

*본 보고서는 AI 기반으로 생성되었으며, 추가 데이터 확인이 권장됩니다.*
`
}

// Extract charts and tables from content
function extractChartsAndTables(content: string) {
  const charts: any[] = []
  const tables: any[] = []

  // Detect markdown tables
  const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g
  let tableMatch
  while ((tableMatch = tableRegex.exec(content)) !== null) {
    tables.push({
      raw: tableMatch[0],
      headers: tableMatch[1].split('|').map((h: string) => h.trim()).filter(Boolean),
    })
  }

  // Detect chart-like data patterns
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

async function getHiraData(
  slug: string,
  cachedHiraData?: any
): Promise<{ contextStr: string }> {
  // 1) DB 캐시가 있으면 즉시 사용
  if (cachedHiraData) {
    console.log(`[ReportGenerator] HIRA 데이터: DB 캐시 사용 (${slug})`)
    try {
      const context = buildHiraContextFromCache(cachedHiraData)
      return { contextStr: context }
    } catch (e) {
      console.error(`[ReportGenerator] HIRA 캐시 파싱 실패, API 재조회:`, e)
    }
  }

  // 2) 캐시 없으면 API 호출
  if (!slug) return { contextStr: '' }

  try {
    console.log(`[ReportGenerator] HIRA 데이터 API 조회 중: ${slug}`)
    const hiraContext = await buildHiraContext(slug)
    if (hiraContext) {
      const contextStr = formatHiraContextForPrompt(hiraContext)
      console.log(`[ReportGenerator] HIRA 데이터 확보: 환자 ${hiraContext.rawData.patientCount.toLocaleString()}명`)

      // 3) DB에 캐시 저장 (비동기, 실패해도 보고서 생성에 영향 없음)
      saveCacheToDb(slug, 'hiraData', hiraContext.rawData).catch(e =>
        console.error(`[ReportGenerator] HIRA 캐시 저장 실패:`, e)
      )

      return { contextStr }
    }
    console.log(`[ReportGenerator] HIRA 데이터 없음 (${slug})`)
  } catch (error) {
    console.error(`[ReportGenerator] HIRA 데이터 조회 실패:`, error)
  }

  return { contextStr: '' }
}

async function getClinicalTrialsData(
  slug: string,
  cachedClinicalTrialsData?: any
): Promise<{ contextStr: string; data: ClinicalTrialsData | null }> {
  // 1) DB 캐시가 있으면 즉시 사용
  if (cachedClinicalTrialsData) {
    console.log(`[ReportGenerator] ClinicalTrials 데이터: DB 캐시 사용 (${slug})`)
    try {
      const data = cachedClinicalTrialsData as ClinicalTrialsData
      const contextStr = formatClinicalTrialsForReport(data)
      return { contextStr, data }
    } catch (e) {
      console.error(`[ReportGenerator] ClinicalTrials 캐시 파싱 실패, API 재조회:`, e)
    }
  }

  // 2) 캐시 없으면 API 호출
  if (!slug) return { contextStr: '', data: null }

  try {
    const searchParams = getSearchParamsBySlug(slug)
    if (searchParams) {
      console.log(`[ReportGenerator] ClinicalTrials.gov API 조회 중: ${slug}`)
      const data = await fetchClinicalTrials(searchParams.drug, searchParams.condition)
      if (data) {
        const contextStr = formatClinicalTrialsForReport(data)
        console.log(`[ReportGenerator] ClinicalTrials 데이터 확보: ${data.totalCount}건`)

        // 3) DB에 캐시 저장
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

/**
 * DB에 캐시 데이터 저장 (ReportCatalog.hiraData / clinicalTrialsData)
 */
async function saveCacheToDb(slug: string, field: 'hiraData' | 'clinicalTrialsData', data: any) {
  await prisma.reportCatalog.updateMany({
    where: { slug },
    data: {
      [field]: data,
      dataSyncedAt: new Date(),
    },
  })
  console.log(`[ReportGenerator] ${field} DB 캐시 저장 완료: ${slug}`)
}

/**
 * DB에 저장된 HIRA 캐시 데이터로 프롬프트 컨텍스트 생성
 * (API 호출 없이 캐시된 JSON에서 직접 생성)
 */
function buildHiraContextFromCache(cachedData: any): string {
  if (!cachedData || !cachedData.patientCount) return ''

  const sections = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'HIRA 건강보험심사평가원 실측 데이터 (DB 캐시)',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `■ HIRA 실측 데이터 (건강보험심사평가원 2023년 기준)`,
    `  - 총 환자수: ${cachedData.patientCount?.toLocaleString?.() || cachedData.patientCount}명`,
    `  - 요양급여비용 총액: ${formatKrwSimple(cachedData.claimAmount)}`,
    `  - 총 내원일수: ${cachedData.visitCount?.toLocaleString?.() || cachedData.visitCount}일`,
  ]

  if (cachedData.genderStats?.length > 0) {
    sections.push('', `■ 성별 환자 분포`)
    for (const g of cachedData.genderStats) {
      sections.push(`  - ${g.gender}: ${g.count?.toLocaleString?.() || g.count}명 (${g.ratio}%)`)
    }
  }

  if (cachedData.ageDistribution?.length > 0) {
    sections.push('', `■ 연령대별 환자 분포`)
    for (const a of cachedData.ageDistribution) {
      sections.push(`  - ${a.ageGroup}: ${a.count?.toLocaleString?.() || a.count}명 (${a.ratio}%)`)
    }
  }

  if (cachedData.regionStats?.length > 0) {
    sections.push('', `■ 지역별 환자 분포 (상위 5개 시도)`)
    for (const r of cachedData.regionStats.slice(0, 5)) {
      sections.push(`  - ${r.region}: ${r.count?.toLocaleString?.() || r.count}명 (${r.ratio}%)`)
    }
  }

  sections.push(
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '위 HIRA 데이터를 보고서의 근거 데이터로 반드시 활용하세요.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  )

  return sections.join('\n')
}

function formatKrwSimple(amount: number): string {
  if (!amount) return '0원'
  if (amount >= 1_0000_0000_0000) return `${(amount / 1_0000_0000_0000).toFixed(1)}조 원`
  if (amount >= 1_0000_0000) return `${Math.round(amount / 1_0000_0000).toLocaleString()}억 원`
  if (amount >= 1_0000) return `${Math.round(amount / 1_0000).toLocaleString()}만 원`
  return `${amount.toLocaleString()}원`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main report generation function
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateReport(params: GenerateReportParams): Promise<GeneratedSection[]> {
  const {
    title, slug, drugName, indication, therapeuticArea, tier,
    cachedHiraData, cachedClinicalTrialsData, onProgress,
  } = params
  const sectionCount = TIER_SECTION_COUNT[tier]
  const sectionsToGenerate = reportSections.slice(0, sectionCount)
  const generatedSections: GeneratedSection[] = []

  console.log(`[ReportGenerator] Starting generation: ${title}, Tier: ${tier}, Sections: ${sectionCount}`)
  console.log(`[ReportGenerator] DB 캐시: HIRA=${!!cachedHiraData}, ClinicalTrials=${!!cachedClinicalTrialsData}`)

  // ── 데이터 수집 (DB 캐시 우선, 없으면 API → DB 저장) ──
  const [hiraResult, ctResult] = await Promise.all([
    getHiraData(slug || '', cachedHiraData),
    getClinicalTrialsData(slug || '', cachedClinicalTrialsData),
  ])

  const fullContextStr = [hiraResult.contextStr, ctResult.contextStr].filter(Boolean).join('\n\n')

  for (let i = 0; i < sectionsToGenerate.length; i++) {
    const section = sectionsToGenerate[i]
    const progress = Math.round(((i + 1) / sectionsToGenerate.length) * 100)

    if (onProgress) {
      onProgress(progress, section.title)
    }

    console.log(`[ReportGenerator] Generating section ${i + 1}/${sectionCount}: ${section.title}`)

    const content = await generateSectionWithRetry(
      section,
      drugName,
      indication,
      therapeuticArea,
      fullContextStr,
      ctResult.data
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

    // 섹션 간 딜레이 제거 (이전: 2초 대기 → 불필요)
  }

  console.log(`[ReportGenerator] Completed: ${generatedSections.length} sections generated`)
  return generatedSections
}
