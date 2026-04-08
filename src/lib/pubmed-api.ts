/**
 * PubMed API Client (NCBI E-utilities)
 *
 * PubMed에서 질환/약물 관련 논문을 검색하여 보고서에 인용할 수 있도록 합니다.
 * - esearch: 검색어로 PMID 목록 조회
 * - esummary: PMID로 논문 메타데이터(제목, 저자, 저널, DOI 등) 조회
 *
 * 무료 API이며, API Key 없이도 사용 가능 (초당 3건 제한)
 * API Key 있으면 초당 10건으로 상향
 */

export interface PubMedArticle {
  pmid: string
  title: string
  authors: string       // "Kim J, Park S, Lee H et al." 형태
  journal: string       // 저널명 약어
  year: string          // 발행 연도
  doi: string | null    // DOI (있으면)
  pubDate: string       // "2024 Jan" 형태
  citedBy?: number      // 피인용수 (esummary에서 가져올 수 있으면)
}

export interface PubMedSearchResult {
  totalCount: number
  articles: PubMedArticle[]
  query: string
}

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const TIMEOUT_MS = 10_000

/**
 * PubMed에서 질환+약물 관련 논문을 검색합니다.
 * @param condition 질환명 (예: "diabetes mellitus type 2")
 * @param drug 약물명 (예: "metformin")
 * @param maxResults 최대 결과 수 (기본 20)
 */
export async function searchPubMed(
  condition: string,
  drug: string,
  maxResults: number = 20
): Promise<PubMedSearchResult | null> {
  try {
    // 1단계: 검색어 구성 - 최근 5년 + 관련성 높은 리뷰/메타분석 우선
    const query = buildSearchQuery(condition, drug)
    console.log(`[PubMed] 검색 시작: "${query}" (max: ${maxResults})`)

    // 2단계: ESearch로 PMID 목록 가져오기
    const pmids = await eSearch(query, maxResults)
    if (!pmids || pmids.length === 0) {
      console.log(`[PubMed] 검색 결과 없음, 넓은 검색 시도`)
      // 약물 제외하고 질환만으로 재검색
      const broadPmids = await eSearch(buildBroadQuery(condition), maxResults)
      if (!broadPmids || broadPmids.length === 0) {
        console.log(`[PubMed] 넓은 검색에서도 결과 없음`)
        return null
      }
      const articles = await eSummary(broadPmids)
      return { totalCount: broadPmids.length, articles, query: condition }
    }

    // 3단계: ESummary로 논문 상세 정보 가져오기
    const articles = await eSummary(pmids)
    console.log(`[PubMed] ${articles.length}건 논문 메타데이터 조회 완료`)

    return { totalCount: pmids.length, articles, query }
  } catch (error) {
    console.error(`[PubMed] 검색 실패:`, error)
    return null
  }
}

/**
 * 검색어 구성: 질환 + 약물 + 최근 5년 + 영어 논문
 */
function buildSearchQuery(condition: string, drug: string): string {
  const currentYear = new Date().getFullYear()
  const minYear = currentYear - 5
  const parts: string[] = []

  // 질환명
  parts.push(`(${condition}[Title/Abstract])`)

  // 약물명 (있으면)
  if (drug && drug.trim()) {
    parts.push(`(${drug}[Title/Abstract])`)
  }

  // 최근 5년
  parts.push(`("${minYear}"[Date - Publication] : "${currentYear}"[Date - Publication])`)

  // 영어 논문
  parts.push(`(English[Language])`)

  return parts.join(' AND ')
}

/**
 * 넓은 검색: 질환명만 + 리뷰/메타분석 + 최근 5년
 */
function buildBroadQuery(condition: string): string {
  const currentYear = new Date().getFullYear()
  const minYear = currentYear - 5
  return `(${condition}[Title/Abstract]) AND ("${minYear}"[Date - Publication] : "${currentYear}"[Date - Publication]) AND (Review[Publication Type] OR Meta-Analysis[Publication Type]) AND (English[Language])`
}

/**
 * NCBI ESearch API - 검색어로 PMID 목록 조회
 */
async function eSearch(query: string, maxResults: number): Promise<string[]> {
  const apiKey = process.env.NCBI_API_KEY || ''
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: String(maxResults),
    sort: 'relevance',
    retmode: 'json',
    ...(apiKey ? { api_key: apiKey } : {}),
  })

  const url = `${PUBMED_BASE}/esearch.fcgi?${params}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`ESearch API error: ${response.status}`)
    }

    const data = await response.json()
    const idList = data?.esearchresult?.idlist || []
    console.log(`[PubMed] ESearch: ${idList.length}건 PMID 조회됨 (총 ${data?.esearchresult?.count || 0}건 중)`)
    return idList
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

/**
 * NCBI ESummary API - PMID로 논문 메타데이터 조회
 */
async function eSummary(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return []

  const apiKey = process.env.NCBI_API_KEY || ''
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
    ...(apiKey ? { api_key: apiKey } : {}),
  })

  const url = `${PUBMED_BASE}/esummary.fcgi?${params}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`ESummary API error: ${response.status}`)
    }

    const data = await response.json()
    const result = data?.result || {}

    const articles: PubMedArticle[] = []
    for (const pmid of pmids) {
      const article = result[pmid]
      if (!article || article.error) continue

      articles.push({
        pmid,
        title: cleanTitle(article.title || ''),
        authors: formatAuthors(article.authors || []),
        journal: article.source || article.fulljournalname || '',
        year: extractYear(article.pubdate || article.epubdate || ''),
        doi: extractDoi(article.elocationid || '', article.articleids || []),
        pubDate: article.pubdate || '',
      })
    }

    return articles
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

// ── 유틸리티 함수 ──

function cleanTitle(title: string): string {
  // HTML 태그 제거, 마지막 마침표 제거
  return title.replace(/<[^>]*>/g, '').replace(/\.$/, '').trim()
}

function formatAuthors(authors: Array<{ name: string; authtype?: string }>): string {
  if (!authors || authors.length === 0) return 'Unknown'
  if (authors.length <= 3) {
    return authors.map(a => a.name).join(', ')
  }
  return `${authors.slice(0, 3).map(a => a.name).join(', ')} et al.`
}

function extractYear(pubdate: string): string {
  const match = pubdate.match(/(\d{4})/)
  return match ? match[1] : new Date().getFullYear().toString()
}

function extractDoi(elocationId: string, articleIds: Array<{ idtype: string; value: string }>): string | null {
  // elocationid에서 DOI 추출
  if (elocationId) {
    const doiMatch = elocationId.match(/doi:\s*(10\.\S+)/i)
    if (doiMatch) return doiMatch[1]
    if (elocationId.startsWith('10.')) return elocationId
  }

  // articleids에서 DOI 추출
  if (articleIds) {
    const doiEntry = articleIds.find(a => a.idtype === 'doi')
    if (doiEntry?.value) return doiEntry.value
  }

  return null
}

/**
 * PubMed 검색 결과를 AI 프롬프트에 주입할 컨텍스트 문자열로 변환
 */
export function formatPubMedForPrompt(result: PubMedSearchResult): string {
  if (!result || result.articles.length === 0) return ''

  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `PubMed 학술 논문 데이터 (검색: "${result.query}", ${result.totalCount}건)`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
  ]

  result.articles.forEach((article, idx) => {
    const doiLink = article.doi ? `https://doi.org/${article.doi}` : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`
    lines.push(
      `[${idx + 1}] ${article.authors} (${article.year}). "${article.title}". ${article.journal}. ` +
      (article.doi ? `DOI: ${article.doi}` : `PMID: ${article.pmid}`)
    )
  })

  lines.push(
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '위 논문들을 보고서 본문에서 [1], [2] 등의 번호로 인용하세요.',
    '각 섹션 본문에서 관련 내용을 언급할 때 해당 논문 번호를 인라인으로 삽입하세요.',
    '섹션 끝에 "### 참고문헌" 소제목으로 인용된 논문 목록을 정리하세요.',
    '형식: [번호] 저자 (연도). "제목". 저널명. DOI 또는 PMID',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  )

  return lines.join('\n')
}

/**
 * 보고서용 참고문헌 목록 마크다운 생성
 * (AI가 인용하지 못한 경우의 fallback + 보고서 마지막 섹션용)
 */
export function generateReferencesSection(result: PubMedSearchResult): string {
  if (!result || result.articles.length === 0) return ''

  const lines: string[] = [
    '## 참고문헌 (References)',
    '',
    `본 보고서는 PubMed에 등재된 ${result.totalCount}건의 관련 학술 논문 중 주요 연구를 인용하였습니다.`,
    '',
  ]

  result.articles.forEach((article, idx) => {
    const doiLink = article.doi
      ? `[DOI: ${article.doi}](https://doi.org/${article.doi})`
      : `[PMID: ${article.pmid}](https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/)`

    lines.push(`**[${idx + 1}]** ${article.authors} (${article.year}). "${article.title}". *${article.journal}*. ${doiLink}`)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * 섹션별로 관련도 높은 논문을 선별하기 위한 키워드 매핑
 */
export function getSectionKeywords(sectionId: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'executive-summary': ['systematic review', 'meta-analysis', 'market', 'overview'],
    'market-overview': ['market', 'global', 'trends', 'analysis'],
    'epidemiology': ['epidemiology', 'prevalence', 'incidence', 'population', 'cohort'],
    'market-size-forecast': ['market size', 'forecast', 'growth', 'revenue'],
    'market-segmentation': ['classification', 'subtype', 'segmentation'],
    'competitive-landscape': ['comparison', 'efficacy', 'safety', 'head-to-head'],
    'company-profiles': ['pharmaceutical', 'company', 'pipeline'],
    'pipeline-analysis': ['clinical trial', 'phase', 'pipeline', 'development'],
    'regulatory-landscape': ['regulatory', 'FDA', 'EMA', 'approval', 'guideline'],
    'regional-analysis': ['Korea', 'Asia', 'regional', 'geographic'],
    'market-drivers-restraints': ['driver', 'barrier', 'challenge', 'opportunity'],
    'pest-analysis': ['policy', 'economic', 'social', 'technology'],
    'porters-five-forces': ['competition', 'market entry', 'bargaining', 'substitute'],
    'patient-segmentation-rwd': ['real-world', 'patient', 'outcome', 'registry', 'RWD', 'RWE'],
    'strategic-recommendations': ['strategy', 'recommendation', 'future', 'prospect'],
  }
  return keywordMap[sectionId] || ['review', 'analysis']
}
