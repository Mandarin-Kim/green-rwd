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
ì½ë¬¼/ì¹ë£ì : ${drugName}
ì ìì¦: ${indication}
ì¹ë£ ìì­: ${therapeuticArea}

ì ì ë³´ë¥¼ ê¸°ë°ì¼ë¡ "${section.title}" ì¹ìì ìì±í´ì£¼ì¸ì.
íêµ­ ì ì½/ë°ì´ì¤ ìì¥ ë°ì´í°ë¥¼ ì¤ì¬ì¼ë¡, ê¸ë¡ë² ìì¥ê³¼ì ë¹êµë í¬í¨í´ì£¼ì¸ì.
ì ë¬¸ ë¦¬ìì¹ ë³´ê³ ì ìì¤ì ìì¸íê³  ë°ì´í° ê¸°ë°ì ë¶ìì ì ê³µí´ì£¼ì¸ì.
ìµì 2000ì ì´ìì¼ë¡ ìì±í´ì£¼ì¸ì.
ë§ík6³®.²jÐ¶bW².w²ró®p²zG²Ç¶Vc®B`°¶Fp°®ª§®t°²3²s®ª§²v²ªÞä¶fs²j§¶VÓ²ó²ã²jP¸)((½È¡±ÐÑÑµÁÐôÄìÑÑµÁÐðôÉÑÉ¥ÌìÑÑµÁÐ¬¬¤ì(ÑÉäì(½¹ÍÐ±±$ôÍÑ¥½¸¹¥AÉ½Ù¥Èôôô½Á¹¤ü±±=Á¹$è±±¹Ñ¡É½Á¥
±Õ(½¹ÍÐ½¹Ñ¹ÐôÝ¥Ð±±$¡ÍÑ¥½¸¹ÍåÍÑµAÉ½µÁÐ°ÕÍÉAÉ½µÁÐ¤(¥¡½¹Ñ¹Ð½¹Ñ¹Ð¹±¹Ñ øÄÀÀ¤ì(ÉÑÕÉ¸½¹Ñ¹Ð(ô(Ñ¡É½Ü¹ÜÉÉ½È ¹ÉÑ½¹Ñ¹ÐÑ½¼Í¡½ÉÐ¤(ôÑ ¡ÉÉ½È¤ì(½¹Í½±¹ÉÉ½È¡mMÑ¥½¸èíÍÑ¥½¸¹Ñ¥Ñ±õtÑÑµÁÐíÑÑµÁÑô¼íÉÑÉ¥Íô¥±é°ÉÉ½È¤(¥¡ÑÑµÁÐôôôÉÑÉ¥Ì¤ì(ÉÑÕÉ¸¹ÉÑ±±­
½¹Ñ¹Ð¡ÍÑ¥½¸°ÉÕ9µ°¥¹¥Ñ¥½¸°Ñ¡rapeuticArea)
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

## ${drugName} - ${indication} ìì¥ ë¶ì

### ê°ì
${therapeuticArea} ìì­ì ${indication} ì¹ë£ë¥¸ ìí ${drugName}ì ëí ë¶ììëë¤.

ë³¸ ì¹ìì íì¬ ë°ì´í° ìì§ ë° ë¶ìì´ ì§í ì¤ì´ë©°, ê³§ ìë°ì´í¸ë  ìì ìëë¤.

### ì£¼ì í¬ì¸í¸
- íêµ­ ${therapeuticArea} ìì¥ì ì§ìì ì¼ë¡ ì±ì¥íê³  ììµëë¤
- ${indication} ê´ë ¨ ì¹ë£ ììê° ì¦ê°íê³  ììµëë¤
- ${drugName}ì ìì¥ í¬ì§ìëì ëí ìì¸ ë¶ìì´ íìí©ëë¤

### ë°ì´í° ì¶ì²
- ê±´ê°ë³´íì¬ì¬íê°ì (HIRA)
- íêµ­ì ì½ë°ì´ì¤íí
- ê¸ë¡ë² ìì¥ì¡°ì¬ ê¸°ê´ (IQVIA, GlobalData)

*ë³¸ ë³´ê³ ìë AI ê¸°ë°ì¼ë¡ ìì±ëìì¼ë©°, ì¶ê° ë°ì´í° íì¸ì´ ê¶ì¥ë©ëë¤.*
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
  const numberPatterns = content.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(%|ìµ|ì¡°|ë§)/g)
  if (numberPatterns && numberPatterns.length >= 3) {
    charts.push({
      type: 'bar',
      title: 'ì£¼ì ìì¹',
      data: numberPatterns.slice(0, 6).map((p: string, i: number) => ({
        label: `í­ëª© ${i + 1}`,
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
