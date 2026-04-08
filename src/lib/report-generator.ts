import { reportSections, ReportSection } from './report-templates'

export type ReportTier = 'BASIC' | 'PRO' | 'PREMIUM'

interface GenerateReportParams {
  catalogId: string
  title: string
  drugName: string
  indication: string
  therapeuticArea: string
  tier: ReportTier
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
  retries: number = 3
): Promise<string> {
  const userPrompt = `
약물/치료제: ${drugName}
적응증: ${indication}
치료 영역: ${therapeuticArea}

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
        return generateFallbackContent(section, drugName, indication, therapeuticArea)
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  return ''
}

// Fallback content when AI fails
function generateFallbackContent(
  section: ReportSection,
  drugName: string,
  indication: string,
  therapeuticArea: string
): string {
  return `# ${section.title}

## ${drugName} - ${indication} 시장 분석

### 개요
${therapeuticArea} 영역의 ${indication} 치료를 위한 ${drugName}에 대한 분석입니다.

본 섹션은 현재 데이터 수집 및 분석이 진행 중이며, 곧 업데이트될 예정입니다.

### 주요 포인트
- 한국 ${therapeuticArea} 시장은 지속적으로 성장하고 있습니다
- ${indication} 관련 치료 수요가 증가하고 있습니다
- ${drugName}의 시장 포지셔닝에 대한 상세 분석이 필요합니다

### 데이터 출처
- 건강보험심사평가원 (HIRA)
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

// Main report generation function
export async function generateReport(params: GenerateReportParams): Promise<GeneratedSection[]> {
  const { title, drugName, indication, therapeuticArea, tier, onProgress } = params
  const sectionCount = TIER_SECTION_COUNT[tier]
  const sectionsToGenerate = reportSections.slice(0, sectionCount)
  const generatedSections: GeneratedSection[] = []

  console.log(`[ReportGenerator] Starting generation: ${title}, Tier: ${tier}, Sections: ${sectionCount}`)

  for (let i = 0; i < sectionsToGenerate.length; i++) {
    const section = sectionsToGenerate[i]
    const progress = Math.round(((i + 1) / sectionsToGenerate.length) * 100)

    if (onProgress) {
      onProgress(progress, section.title)
    }

    console.log(`[ReportGenerator] Generating section ${i + 1}/${sectionCount}: ${section.title}`)

    const content = await generateSectionWithRetry(section, drugName, indication, therapeuticArea)
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

    // Rate limiting: wait between API calls
    if (i < sectionsToGenerate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log(`[ReportGenerator] Completed: ${generatedSections.length} sections generated`)
  return generatedSections
}
