/**
 * Global Medical Data APIs Integration (v2 - 2026 Updated)
 *
 * 4ê° ê¸ë¡ë² ìë£ ë°ì´í° API ì°ë:
 * 1. CMS Medicare (USA) - data.cms.gov (ì data-api/v1 ìëí¬ì¸í¸)
 * 2. PBS Australia - data.pbs.gov.au / data-api.health.gov.au (v3 API)
 * 3. NHS UK - OpenPrescribing.net (BNF ì½ë ê¸°ë° ì²ë°© íµê³)
 * 4. FDA OpenFDA (ì ê·) - api.fda.gov (ì½ë¬¼ ë¼ë²¨, ë¶ìì©, ì¹ì¸ ì ë³´)
 *
 * ë³ê²½ ì´ë ¥:
 * - CMS: ë ê±°ì Socrata API (yvpj-pmj2, 77gb-8z53) â ì data-api/v1 + data.json ëì¤ì»¤ë²ë¦¬
 * - PBS: v3/item 404 â ì items ìëí¬ì¸í¸ + health.gov.au ë§ì´ê·¸ë ì´ì
 * - FDA: ì ê· ì¶ê° (drug/label, drug/event, drug/drugsfda)
 */

import { translateToEnglish, getInternationalSearchTerms } from './drug-name-translator'

// âââââââââââââââââââââââââââââââââââââââââââ
// Interfaces
// âââââââââââââââââââââââââââââââââââââââââââ

export interface CMSMedicareDataPoint {
  drugName: string
  genericName: string
  totalSpending: number
  totalClaims: number
  totalBeneficiaries: number
  avgSpendingPerClaim: number
  avgSpendingPerBeneficiary: number
  year: string
}

export interface CMSMedicareData {
  drugSpending: CMSMedicareDataPoint[]
  source: string
  endpoint: string
  success: boolean
  error?: string
}

export interface PBSItem {
  itemCode: string
  drugName: string
  formAndStrength: string
  maxPrescriber: string
  dispensedPriceMaxQuantity: number
  atcCode: string
  restrictions: string
  scheduleCode: string
}

export interface PBSAustraliaData {
  items: PBSItem[]
  source: string
  endpoint: string
  success: boolean
  error?: string
}

export interface NHSPrescriptionSummary {
  chemicalSubstance: string
  totalItems: number
  totalQuantity: number
  totalNetIngredientCost: number
  period: string
}

export interface NHSUKData {
  prescriptionSummary: NHSPrescriptionSummary[]
  source: string
  endpoint: string
  success: boolean
  error?: string
}

/** FDA OpenFDA - ì½ë¬¼ ë¼ë²¨ ì ë³´ */
export interface FDADrugLabel {
  brandName: string
  genericName: string
  manufacturer: string
  route: string[]
  productType: string
  indications: string
  warnings: string
  dosage: string
  applicationNumber: string
}

/** FDA OpenFDA - ë¶ìì© ë³´ê³  ì§ê³ */
export interface FDAAdverseEvent {
  reactionName: string
  count: number
}

/** FDA OpenFDA - ì½ë¬¼ ì¹ì¸ ì ë³´ */
export interface FDADrugApproval {
  applicationNumber: string
  brandName: string
  genericName: string
  sponsorName: string
  productType: string
  marketingStatus: string
  approvalDate: string
  activeIngredients: string[]
}

export interface FDAOpenFDAData {
  labels: FDADrugLabel[]
  adverseEvents: FDAAdverseEvent[]
  approvals: FDADrugApproval[]
  source: string
  endpoint: string
  success: boolean
  error?: string
}

/** ê¸ë¡ë² ìë£ ë°ì´í° íµí© ìëµ */
export interface GlobalMedicalData {
  cms?: CMSMedicareData
  pbs?: PBSAustraliaData
  nhs?: NHSUKData
  fda?: FDAOpenFDAData
  fetchedAt: string
  searchQuery: {
    drugName: string
    indication: string
    drugNameEn: string
    indicationEn: string
  }
  success: boolean
  successCount: number
  totalAttempts: number
}

// âââââââââââââââââââââââââââââââââââââââââââ
// Utility Functions
// âââââââââââââââââââââââââââââââââââââââââââ

const REQUEST_TIMEOUT = 15000 // 15ì´ (ê¸ë¡ë² APIë ëë¦´ ì ìì)

function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  ;(controller as any).__timeoutId = timeoutId
  return controller
}

function cleanupTimeout(controller: AbortController): void {
  const timeoutId = (controller as any).__timeoutId
  if (timeoutId) clearTimeout(timeoutId)
}

/** ìì í fetch wrapper - ìë¬ ì null ë°í */
async function safeFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT
): Promise<Response | null> {
  const controller = createTimeoutController(timeoutMs)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Green-RWD/2.0 Medical Research Platform',
        ...options.headers,
      },
    })
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[safeFetch] ${url} failed: ${msg}`)
    return null
  } finally {
    cleanupTimeout(controller)
  }
}

// âââââââââââââââââââââââââââââââââââââââââââ
// 1. CMS Medicare (USA)
// âââââââââââââââââââââââââââââââââââââââââââ

/**
 * CMS Medicare ì½ë¬¼ ì§ì¶ ë°ì´í° ì¡°í
 *
 * ì ëµ:
 * 1ì°¨: data.cms.gov ì data-api/v1 ìëí¬ì¸í¸ (data.json ëì¤ì»¤ë²ë¦¬)
 * 2ì°¨: data.cms.gov ì§ì  ë°ì´í° íì´ì§ API
 * 3ì°¨: ë ê±°ì Socrata í¸í ìëí¬ì¸í¸ (ì¼ë¶ ë°ì´í°ìì ìì§ ìë)
 */
async function fetchCMSMedicareData(drugName: string): Promise<CMSMedicareData> {
  const emptyResult: CMSMedicareData = {
    drugSpending: [],
    source: 'CMS Medicare Part D Drug Spending (data.cms.gov)',
    endpoint: '',
    success: false,
  }

  if (!drugName?.trim()) {
    return { ...emptyResult, error: 'Drug name is required' }
  }

  const upperDrug = drugName.toUpperCase().trim()
  const searchTerms = [upperDrug, upperDrug.split(' ')[0]]
  let drugSpending: CMSMedicareDataPoint[] = []
  let usedEndpoint = ''

  console.log(`[CMS API] Searching for: ${drugName} (terms: ${searchTerms.join(', ')})`)

  // ââ ì ëµ 1: ì data-api/v1 ìëí¬ì¸í¸ ââ
  // data.jsonìì Medicare Part D Spending by Drug ë°ì´í°ìì UUIDë¥¼ ì°¾ì ì¬ì©
  try {
    const dataJsonUrl = 'https://data.cms.gov/data.json'
    console.log(`[CMS API] Strategy 1: Discovering dataset via data.json`)

    const djRes = await safeFetch(dataJsonUrl, {}, 12000)
    if (djRes?.ok) {
      const catalog = await djRes.json()
      const datasets = catalog?.dataset || []

      // "Medicare Part D Spending by Drug" ë°ì´í°ì ì°¾ê¸°
      const partDDataset = datasets.find((ds: any) => {
        const title = (ds.title || '').toLowerCase()
        return title.includes('medicare part d') && title.includes('spending') && title.includes('drug')
          && !title.includes('quarterly') && !title.includes('dashboard')
      })

      if (partDDataset?.distribution) {
        // API formatì distributionìì accessURL ì¶ì¶
        const apiDist = partDDataset.distribution.find((d: any) =>
          (d.format || '').toLowerCase() === 'api' ||
          (d.mediaType || '').includes('json') ||
          (d.accessURL || '').includes('data-api')
        )

        if (apiDist?.accessURL) {
          const baseApiUrl = apiDist.accessURL
          console.log(`[CMS API] Found dataset API URL: ${baseApiUrl}`)

          for (const term of searchTerms) {
            if (drugSpending.length > 0) break

            // filter íë¼ë¯¸í°ë¡ ì½ë¬¼ëª ê²ì
            const filterUrl = `${baseApiUrl}?filter[Brnd_Name]=${encodeURIComponent(term)}&size=50`
            usedEndpoint = filterUrl

            const res = await safeFetch(filterUrl)
            if (res?.ok) {
              const data = await res.json()
              const items = Array.isArray(data) ? data : (data?.data || [])
              if (items.length > 0) {
                drugSpending = items.map(mapCMSDataPoint)
                console.log(`[CMS API] Strategy 1 found ${drugSpending.length} records via brand name`)
              }
            }

            // ë¸ëëëªì¼ë¡ ëª» ì°¾ì¼ë©´ ì±ë¶ëªì¼ë¡ ìë
            if (drugSpending.length === 0) {
              const filterUrl2 = `${baseApiUrl}?filter[Gnrc_Name]=${encodeURIComponent(term)}&size=50`
              usedEndpoint = filterUrl2

              const res2 = await safeFetch(filterUrl2)
              if (res2?.ok) {
                const data2 = await res2.json()
                const items2 = Array.isArray(data2) ? data2 : (data2?.data || [])
                if (items2.length > 0) {
                  drugSpending = items2.map(mapCMSDataPoint)
                  console.log(`[CMS API] Strategy 1 found ${drugSpending.length} records via generic name`)
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[CMS API] Strategy 1 failed:`, e instanceof Error ? e.message : e)
  }

  // ââ ì ëµ 2: ì§ì  ë°ì´í° íì´ì§ URL ââ
  if (drugSpending.length === 0) {
    try {
      console.log(`[CMS API] Strategy 2: Direct data page API`)

      for (const term of searchTerms) {
        if (drugSpending.length > 0) break

        // CMS ë°ì´í° íì´ì§ì JSON API ì§ì  í¸ì¶
        const directUrl = `https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicare-part-d-spending-by-drug/data?query=${encodeURIComponent(term)}&size=50`
        usedEndpoint = directUrl

        const res = await safeFetch(directUrl)
        if (res?.ok) {
          const text = await res.text()
          try {
            const data = JSON.parse(text)
            const items = Array.isArray(data) ? data : (data?.data || data?.results || [])
            if (items.length > 0) {
              drugSpending = items.map(mapCMSDataPoint)
              console.log(`[CMS API] Strategy 2 found ${drugSpending.length} records`)
            }
          } catch {
            console.warn(`[CMS API] Strategy 2: Response is not valid JSON`)
          }
        }
      }
    } catch (e) {
      console.warn(`[CMS API] Strategy 2 failed:`, e instanceof Error ? e.message : e)
    }
  }

  // ââ ì ëµ 3: ë ê±°ì Socrata í¸í (ì¼ë¶ ë°ì´í°ìì ìì§ ìëí  ì ìì) ââ
  if (drugSpending.length === 0) {
    try {
      console.log(`[CMS API] Strategy 3: Legacy Socrata compatible`)

      for (const term of searchTerms) {
        if (drugSpending.length > 0) break

        const whereClause = encodeURIComponent(
          `upper(brnd_name) like '%${term}%' OR upper(gnrc_name) like '%${term}%'`
        )
        // ê¸°ì¡´ yvpj-pmj2 ëì  ìµì  ë°ì´í°ì ID ìë
        const endpoints = [
          `https://data.cms.gov/resource/yvpj-pmj2.json?$where=${whereClause}&$limit=50&$order=tot_spndng DESC`,
          `https://data.cms.gov/resource/77gb-8z53.json?$where=${whereClause}&$limit=50`,
        ]

        for (const endpoint of endpoints) {
          if (drugSpending.length > 0) break
          usedEndpoint = endpoint

          const res = await safeFetch(endpoint, {}, 8000)
          if (res?.ok) {
            const data = await res.json()
            // deprecated ìëµ ì²´í¬
            if (data?.code === 'deprecated' || data?.error === true) {
              console.warn(`[CMS API] Socrata endpoint deprecated: ${endpoint}`)
              continue
            }
            if (Array.isArray(data) && data.length > 0) {
              drugSpending = data.map(mapCMSDataPoint)
              console.log(`[CMS API] Strategy 3 found ${drugSpending.length} records from Socrata`)
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[CMS API] Strategy 3 failed:`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`[CMS API] Final: ${drugSpending.length} records`)

  return {
    drugSpending,
    source: 'CMS Medicare Part D Drug Spending (data.cms.gov)',
    endpoint: usedEndpoint,
    success: true, // API í¸ì¶ ìë ìì²´ë ì±ê³µ (ê²°ê³¼ 0ê±´ì´ì´ë)
  }
}

/** CMS ìëµ ë°ì´í°ë¥¼ íµí© íìì¼ë¡ ë³í */
function mapCMSDataPoint(item: any): CMSMedicareDataPoint {
  return {
    drugName: item.Brnd_Name || item.brnd_name || item.brand_name || item.drug_name || '',
    genericName: item.Gnrc_Name || item.gnrc_name || item.generic_name || '',
    totalSpending: parseFloat(item.Tot_Spndng || item.tot_spndng || item.total_spending || 0),
    totalClaims: parseInt(item.Tot_Clms || item.tot_clms || item.total_claims || 0, 10),
    totalBeneficiaries: parseInt(item.Tot_Benes || item.tot_benes || item.total_beneficiaries || 0, 10),
    avgSpendingPerClaim: parseFloat(item.Avg_Spnd_Per_Clm || item.avg_spnd_per_clm || item.avg_spending_per_claim || 0),
    avgSpendingPerBeneficiary: parseFloat(item.Avg_Spnd_Per_Bene || item.avg_spnd_per_bene || item.avg_spending_per_beneficiary || 0),
    year: item.Yr || item.year || item.coverage_year || '',
  }
}

// âââââââââââââââââââââââââââââââââââââââââââ
// 2. PBS Australia
// âââââââââââââââââââââââââââââââââââââââââââ

/**
 * PBS í¸ì£¼ ì½ë¬¼ ë°ì´í° ì¡°í
 *
 * ì ëµ:
 * 1ì°¨: ì health.gov.au PBS API v3 (2025ë ë§ì´ê·¸ë ì´ì)
 * 2ì°¨: data.pbs.gov.au v3 API (items ìëí¬ì¸í¸)
 * 3ì°¨: PBS ê³µê° ê²ì API
 */
async function fetchPBSAustraliaData(drugName: string): Promise<PBSAustraliaData> {
  const emptyResult: PBSAustraliaData = {
    items: [],
    source: 'PBS Australia (Pharmaceutical Benefits Scheme)',
    endpoint: '',
    success: false,
  }

  if (!drugName?.trim()) {
    return { ...emptyResult, error: 'Drug name is required' }
  }

  const searchTerm = drugName.toLowerCase().trim()
  let items: PBSItem[] = []
  let usedEndpoint = ''

  console.log(`[PBS API] Searching for: ${drugName}`)

  // ââ ì ëµ 1: ì health.gov.au PBS API v3 ââ
  try {
    console.log(`[PBS API] Strategy 1: health.gov.au PBS API v3`)

    // ì ìëí¬ì¸í¸: data-api.health.gov.au/pbs/api/v3/items
    const endpoints = [
      `https://data-api.health.gov.au/pbs/api/v3/items?filter=${encodeURIComponent(searchTerm)}&format=json`,
      `https://data-api.health.gov.au/pbs/api/v3/item-overview?filter=${encodeURIComponent(searchTerm)}&format=json`,
    ]

    for (const endpoint of endpoints) {
      if (items.length > 0) break
      usedEndpoint = endpoint

      const res = await safeFetch(endpoint)
      if (res?.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('json')) {
          const data = await res.json()
          const rawItems = extractPBSItems(data)
          if (rawItems.length > 0) {
            items = rawItems.map(mapPBSItem)
            console.log(`[PBS API] Strategy 1 found ${items.length} items`)
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[PBS API] Strategy 1 failed:`, e instanceof Error ? e.message : e)
  }

  // ââ ì ëµ 2: data.pbs.gov.au v3 API ââ
  if (items.length === 0) {
    try {
      console.log(`[PBS API] Strategy 2: data.pbs.gov.au v3`)

      const endpoints = [
        `https://data.pbs.gov.au/api/v3/items?filter=${encodeURIComponent(searchTerm)}&format=json`,
        `https://data.pbs.gov.au/api/v3/item-overview?filter=${encodeURIComponent(searchTerm)}&format=json`,
        `https://data.pbs.gov.au/api/v3/drugs?filter=${encodeURIComponent(searchTerm)}&format=json`,
      ]

      for (const endpoint of endpoints) {
        if (items.length > 0) break
        usedEndpoint = endpoint

        const res = await safeFetch(endpoint)
        if (res?.ok) {
          const contentType = res.headers.get('content-type') || ''
          if (contentType.includes('json')) {
            const data = await res.json()
            const rawItems = extractPBSItems(data)
            if (rawItems.length > 0) {
              items = rawItems.map(mapPBSItem)
              console.log(`[PBS API] Strategy 2 found ${items.length} items`)
            }
          } else if (contentType.includes('xml')) {
            // XML ìëµ íì±
            const text = await res.text()
            items = parsePBSXml(text)
            if (items.length > 0) {
              console.log(`[PBS API] Strategy 2 found ${items.length} items from XML`)
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[PBS API] Strategy 2 failed:`, e instanceof Error ? e.message : e)
    }
  }

  // ââ ì ëµ 3: PBS ê²ì API ââ
  if (items.length === 0) {
    try {
      console.log(`[PBS API] Strategy 3: PBS search API`)

      const searchUrl = `https://www.pbs.gov.au/pbs/search?term=${encodeURIComponent(searchTerm)}&search-type=medicines&_format=json`
      usedEndpoint = searchUrl

      const res = await safeFetch(searchUrl)
      if (res?.ok) {
        const data = await res.json()
        const rawItems = data?.results || data?.medicines || data?.items || []
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          items = rawItems.slice(0, 100).map((item: any) => ({
            itemCode: item.pbs_code || item.code || '',
            drugName: item.brand_name || item.name || item.title || '',
            formAndStrength: item.form || item.strength || '',
            maxPrescriber: '',
            dispensedPriceMaxQuantity: parseFloat(item.price || item.dpmq || 0),
            atcCode: item.atc || '',
            restrictions: item.restriction || '',
            scheduleCode: item.schedule || item.program || '',
          }))
          console.log(`[PBS API] Strategy 3 found ${items.length} items`)
        }
      }
    } catch (e) {
      console.warn(`[PBS API] Strategy 3 failed:`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`[PBS API] Final: ${items.length} items`)

  return {
    items,
    source: 'PBS Australia (Pharmaceutical Benefits Scheme)',
    endpoint: usedEndpoint,
    success: true,
  }
}

/** PBS API ìëµìì items ë°°ì´ ì¶ì¶ (ë¤ìí ìëµ êµ¬ì¡° ëì) */
function extractPBSItems(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data?.data && Array.isArray(data.data)) return data.data
  if (data?.items && Array.isArray(data.items)) return data.items
  if (data?.results && Array.isArray(data.results)) return data.results
  if (data?._embedded?.items) return data._embedded.items
  if (data?._embedded?.['item-overviews']) return data._embedded['item-overviews']
  return []
}

/** PBS ë°ì´í°ë¥¼ íµí© íìì¼ë¡ ë³í */
function mapPBSItem(item: any): PBSItem {
  return {
    itemCode: item.pbs_code || item.item_code || item.code || item.pbs_item_code || '',
    drugName: item.brand_name || item.trade_name || item.name || item.drug_name || item.li_drug_name || '',
    formAndStrength: item.form_and_strength || item.form || item.strength || item.li_form || '',
    maxPrescriber: item.max_prescriber_qty || item.max_quantity || String(item.mpp_qty || ''),
    dispensedPriceMaxQuantity: parseFloat(item.dpmq || item.dispensed_price || item.price || item.dpmq_max_price || 0),
    atcCode: item.atc_code || item.atc || item.atc5_code || '',
    restrictions: item.restriction_text || item.restrictions || item.note || '',
    scheduleCode: item.schedule_code || item.schedule || item.program_code || '',
  }
}

/** PBS XML ìëµìì ê¸°ë³¸ ì ë³´ ì¶ì¶ */
function parsePBSXml(xmlText: string): PBSItem[] {
  const items: PBSItem[] = []
  if (!xmlText || xmlText.length < 200) return items

  const brandMatches = xmlText.match(/<brand-name[^>]*>([^<]+)<\/brand-name>/gi) || []
  const codeMatches = xmlText.match(/<pbs-code[^>]*>([^<]+)<\/pbs-code>/gi) || []
  const formMatches = xmlText.match(/<form-and-strength[^>]*>([^<]+)<\/form-and-strength>/gi) || []

  for (let i = 0; i < Math.min(brandMatches.length, 50); i++) {
    items.push({
      itemCode: codeMatches[i]?.replace(/<[^>]+>/g, '').trim() || '',
      drugName: brandMatches[i]?.replace(/<[^>]+>/g, '').trim() || '',
      formAndStrength: formMatches[i]?.replace(/<[^>]+>/g, '').trim() || '',
      maxPrescriber: '',
      dispensedPriceMaxQuantity: 0,
      atcCode: '',
      restrictions: '',
      scheduleCode: '',
    })
  }
  return items
}

// âââââââââââââââââââââââââââââââââââââââââââ
// 3. NHS UK (OpenPrescribing.net)
// âââââââââââââââââââââââââââââââââââââââââââ

/**
 * NHS UK ì²ë°© ë°ì´í° ì¡°í
 * OpenPrescribing.net API â BNF ì½ë ê²ì â ì²ë°© íµê³
 */
async function fetchNHSUKData(searchTerm: string): Promise<NHSUKData> {
  const emptyResult: NHSUKData = {
    prescriptionSummary: [],
    source: 'NHS UK (OpenPrescribing.net)',
    endpoint: '',
    success: false,
  }

  if (!searchTerm?.trim()) {
    return { ...emptyResult, error: 'Search term is required' }
  }

  let prescriptionSummary: NHSPrescriptionSummary[] = []
  let usedEndpoint = ''

  console.log(`[NHS API] Searching for: ${searchTerm}`)

  // ìë 1: OpenPrescribing.net BNF ì½ë ê²ì â ì²ë°© íµê³
  try {
    const encodedTerm = encodeURIComponent(searchTerm.toLowerCase())
    const searchEndpoint = `https://openprescribing.net/api/1.0/bnf_code/?q=${encodedTerm}&format=json`
    usedEndpoint = searchEndpoint
    console.log(`[NHS API] OpenPrescribing BNF search`)

    const searchRes = await safeFetch(searchEndpoint)
    if (searchRes?.ok) {
      const bnfResults = await searchRes.json()
      const results = Array.isArray(bnfResults) ? bnfResults : []
      console.log(`[NHS API] BNF search found ${results.length} matches`)

      if (results.length > 0) {
        const bnfCode = results[0].id || results[0].bnf_code || ''
        if (bnfCode) {
          const spendingEndpoint = `https://openprescribing.net/api/1.0/spending/?code=${encodeURIComponent(bnfCode)}&format=json`
          usedEndpoint = spendingEndpoint

          const spendingRes = await safeFetch(spendingEndpoint)
          if (spendingRes?.ok) {
            const spendingData = await spendingRes.json()
            const spendingItems = Array.isArray(spendingData) ? spendingData : []

            prescriptionSummary = spendingItems.slice(0, 24).map((item: any) => ({
              chemicalSubstance: results[0].name || results[0].title || searchTerm,
              totalItems: parseInt(item.items || 0, 10),
              totalQuantity: parseInt(item.quantity || 0, 10),
              totalNetIngredientCost: parseFloat(item.actual_cost || item.cost || 0),
              period: item.date || item.row_name || '',
            }))
            console.log(`[NHS API] Found ${prescriptionSummary.length} spending records`)
          }
        }

        // BNF ê²ìì ì±ê³µíì§ë§ ì²ë°© ë°ì´í°ê° ìì¼ë©´
        if (prescriptionSummary.length === 0) {
          prescriptionSummary = results.slice(0, 20).map((item: any) => ({
            chemicalSubstance: item.name || item.title || '',
            totalItems: 0,
            totalQuantity: 0,
            totalNetIngredientCost: 0,
            period: 'BNF ë±ì¬ íì¸',
          }))
        }
      }
    }
  } catch (e) {
    console.warn(`[NHS API] OpenPrescribing failed:`, e instanceof Error ? e.message : e)
  }

  // ìë 2: NHSBSA CKAN datastore_search (fallback)
  if (prescriptionSummary.length === 0) {
    try {
      const encodedTerm = encodeURIComponent(searchTerm)
      const ckanEndpoint = `https://opendata.nhsbsa.net/api/3/action/package_search?q=${encodedTerm}&rows=20`
      usedEndpoint = ckanEndpoint
      console.log(`[NHS API] CKAN fallback`)

      const ckanRes = await safeFetch(ckanEndpoint)
      if (ckanRes?.ok) {
        const ckanData = await ckanRes.json()
        const packages = (ckanData?.result?.results || []) as any[]
        if (packages.length > 0) {
          prescriptionSummary = packages.slice(0, 20).map((pkg: any) => ({
            chemicalSubstance: pkg.title || pkg.name || '',
            totalItems: parseInt(pkg.num_resources || 0, 10),
            totalQuantity: 0,
            totalNetIngredientCost: 0,
            period: pkg.metadata_modified?.slice(0, 10) || '',
          }))
          console.log(`[NHS API] CKAN found ${prescriptionSummary.length} datasets`)
        }
      }
    } catch (e) {
      console.warn(`[NHS API] CKAN failed:`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`[NHS API] Final: ${prescriptionSummary.length} records`)

  return {
    prescriptionSummary,
    source: 'NHS UK (OpenPrescribing.net + NHSBSA)',
    endpoint: usedEndpoint,
    success: true,
  }
}

// âââââââââââââââââââââââââââââââââââââââââââ
// 4. FDA OpenFDA (ì ê·)
// âââââââââââââââââââââââââââââââââââââââââââ

/**
 * FDA OpenFDA ì½ë¬¼ ë°ì´í° ì¡°í
 *
 * 3ê°ì§ ìëí¬ì¸í¸ ë³ë ¬ í¸ì¶:
 * 1. drug/label - ì½ë¬¼ ë¼ë²¨ ì ë³´ (í¨ë¥, ë¶ìì©, ì©ë² ë±)
 * 2. drug/event - ë¶ìì© ë³´ê³  ì§ê³
 * 3. drug/drugsfda - ì½ë¬¼ ì¹ì¸ ì ë³´
 */
async function fetchFDAOpenFDAData(drugName: string): Promise<FDAOpenFDAData> {
  const emptyResult: FDAOpenFDAData = {
    labels: [],
    adverseEvents: [],
    approvals: [],
    source: 'FDA OpenFDA (api.fda.gov)',
    endpoint: 'https://api.fda.gov/drug/',
    success: false,
  }

  if (!drugName?.trim()) {
    return { ...emptyResult, error: 'Drug name is required' }
  }

  const searchTerm = drugName.toLowerCase().trim()
  console.log(`[FDA API] Searching for: ${searchTerm}`)

  let labels: FDADrugLabel[] = []
  let adverseEvents: FDAAdverseEvent[] = []
  let approvals: FDADrugApproval[] = []
  let usedEndpoint = ''

  // ë³ë ¬ í¸ì¶: ë¼ë²¨, ë¶ìì©, ì¹ì¸ ì ë³´
  const [labelResult, eventResult, approvalResult] = await Promise.allSettled([
    fetchFDALabels(searchTerm),
    fetchFDAAdverseEvents(searchTerm),
    fetchFDAApprovals(searchTerm),
  ])

  if (labelResult.status === 'fulfilled' && labelResult.value.length > 0) {
    labels = labelResult.value
    usedEndpoint = 'https://api.fda.gov/drug/label.json'
    console.log(`[FDA API] Labels: ${labels.length} records`)
  }

  if (eventResult.status === 'fulfilled' && eventResult.value.length > 0) {
    adverseEvents = eventResult.value
    console.log(`[FDA API] Adverse events: ${adverseEvents.length} reactions`)
  }

  if (approvalResult.status === 'fulfilled' && approvalResult.value.length > 0) {
    approvals = approvalResult.value
    console.log(`[FDA API] Approvals: ${approvals.length} records`)
  }

  const totalRecords = labels.length + adverseEvents.length + approvals.length
  console.log(`[FDA API] Final: ${totalRecords} total records`)

  return {
    labels,
    adverseEvents,
    approvals,
    source: 'FDA OpenFDA (api.fda.gov)',
    endpoint: usedEndpoint || 'https://api.fda.gov/drug/',
    success: true,
  }
}

/** FDA ì½ë¬¼ ë¼ë²¨ ì¡°í */
async function fetchFDALabels(searchTerm: string): Promise<FDADrugLabel[]> {
  const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(searchTerm)}"+openfda.brand_name:"${encodeURIComponent(searchTerm)}"&limit=10`

  const res = await safeFetch(url, {}, 12000)
  if (!res?.ok) return []

  const data = await res.json()
  const results = data?.results || []

  return results.slice(0, 10).map((item: any) => {
    const openfda = item.openfda || {}
    return {
      brandName: (openfda.brand_name || [])[0] || '',
      genericName: (openfda.generic_name || [])[0] || '',
      manufacturer: (openfda.manufacturer_name || [])[0] || '',
      route: openfda.route || [],
      productType: (openfda.product_type || [])[0] || '',
      indications: truncateText(item.indications_and_usage?.[0] || '', 500),
      warnings: truncateText(item.warnings?.[0] || item.warnings_and_cautions?.[0] || '', 500),
      dosage: truncateText(item.dosage_and_administration?.[0] || '', 500),
      applicationNumber: (openfda.application_number || [])[0] || '',
    }
  })
}

/** FDA ë¶ìì© ë³´ê³  ì§ê³ ì¡°í */
async function fetchFDAAdverseEvents(searchTerm: string): Promise<FDAAdverseEvent[]> {
  const url = `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:"${encodeURIComponent(searchTerm)}"&count=patient.reaction.reactionmeddrapt.exact&limit=20`

  const res = await safeFetch(url, {}, 12000)
  if (!res?.ok) return []

  const data = await res.json()
  const results = data?.results || []

  return results.slice(0, 20).map((item: any) => ({
    reactionName: item.term || '',
    count: parseInt(item.count || 0, 10),
  }))
}

/** FDA ì½ë¬¼ ì¹ì¸ ì ë³´ ì¡°í */
async function fetchFDAApprovals(searchTerm: string): Promise<FDADrugApproval[]> {
  const url = `https://api.fda.gov/drug/drugsfda.json?search=openfda.generic_name:"${encodeURIComponent(searchTerm)}"&limit=10`

  const res = await safeFetch(url, {}, 12000)
  if (!res?.ok) return []

  const data = await res.json()
  const results = data?.results || []

  return results.slice(0, 10).map((item: any) => {
    const openfda = item.openfda || {}
    const products = item.products || []
    const latestProduct = products[0] || {}
    const submissions = item.submissions || []
    const approvalSubmission = submissions.find((s: any) =>
      s.submission_type === 'ORIG' || s.submission_status === 'AP'
    ) || submissions[0] || {}

    return {
      applicationNumber: item.application_number || '',
      brandName: (openfda.brand_name || [])[0] || latestProduct.brand_name || '',
      genericName: (openfda.generic_name || [])[0] || '',
      sponsorName: item.sponsor_name || '',
      productType: (openfda.product_type || [])[0] || '',
      marketingStatus: latestProduct.marketing_status || '',
      approvalDate: approvalSubmission.submission_status_date || '',
      activeIngredients: (latestProduct.active_ingredients || []).map((ai: any) => ai.name || ''),
    }
  })
}

/** ê¸´ íì¤í¸ë¥¼ ìì íê² ìë¥´ê¸° */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || ''
  return text.substring(0, maxLength) + '...'
}

// âââââââââââââââââââââââââââââââââââââââââââ
// íµí© ë°ì´í° ì¡°í í¨ì
// âââââââââââââââââââââââââââââââââââââââââââ

/**
 * ëª¨ë  ê¸ë¡ë² ìë£ ë°ì´í° API ë³ë ¬ í¸ì¶
 * @param drugName - ì½ë¬¼ëª (íêµ­ì´/ìì´)
 * @param indication - ì ìì¦ (íêµ­ì´/ìì´)
 */
export async function fetchGlobalMedicalData(
  drugName: string,
  indication: string
): Promise<GlobalMedicalData> {
  console.log('[Global Medical APIs] Starting fetch...')
  console.log(`[Global Medical APIs] Drug: ${drugName}, Indication: ${indication}`)

  // íêµ­ì´âìì´ ë²ì­
  const terms = getInternationalSearchTerms(drugName || '', indication || '')
  const drugNameEn = terms.drugNameEn
  const indicationEn = terms.indicationEn

  // íêµ­ì´ê° ìë ê²ìì´ë§ ì¶ì¶
  const allSearchTerms = terms.searchTerms.filter(t => !/[\uac00-\ud7af]/.test(t))
  const primarySearchTerm = allSearchTerms[0] || drugNameEn || indicationEn

  console.log(`[Global Medical APIs] Search terms: ${allSearchTerms.join(', ')}`)

  if (!primarySearchTerm || /[\uac00-\ud7af]/.test(primarySearchTerm)) {
    return {
      fetchedAt: new Date().toISOString(),
      searchQuery: {
        drugName: drugName || '',
        indication: indication || '',
        drugNameEn: '',
        indicationEn: '',
      },
      success: false,
      successCount: 0,
      totalAttempts: 0,
    }
  }

  console.log(`[Global Medical APIs] Primary search term: ${primarySearchTerm}`)

  const startTime = Date.now()

  // 4ê° API ë³ë ¬ í¸ì¶
  const [cmsData, pbsData, nhsData, fdaData] = await Promise.all([
    fetchCMSMedicareData(primarySearchTerm).catch(err => {
      console.error('[Global Medical APIs] CMS error:', err)
      return { drugSpending: [], source: 'CMS Medicare', endpoint: '', success: false, error: 'Fetch failed' } as CMSMedicareData
    }),
    fetchPBSAustraliaData(primarySearchTerm).catch(err => {
      console.error('[Global Medical APIs] PBS error:', err)
      return { items: [], source: 'PBS Australia', endpoint: '', success: false, error: 'Fetch failed' } as PBSAustraliaData
    }),
    fetchNHSUKData(primarySearchTerm).catch(err => {
      console.error('[Global Medical APIs] NHS error:', err)
      return { prescriptionSummary: [], source: 'NHS UK', endpoint: '', success: false, error: 'Fetch failed' } as NHSUKData
    }),
    fetchFDAOpenFDAData(primarySearchTerm).catch(err => {
      console.error('[Global Medical APIs] FDA error:', err)
      return { labels: [], adverseEvents: [], approvals: [], source: 'FDA OpenFDA', endpoint: '', success: false, error: 'Fetch failed' } as FDAOpenFDAData
    }),
  ])

  const duration = Date.now() - startTime
  const successCount = [cmsData.success, pbsData.success, nhsData.success, fdaData.success].filter(Boolean).length

  console.log(`[Global Medical APIs] Completed in ${duration}ms. Success: ${successCount}/4`)
  console.log(`[Global Medical APIs] Results: CMS ${cmsData.drugSpending?.length || 0} / PBS ${pbsData.items?.length || 0} / NHS ${nhsData.prescriptionSummary?.length || 0} / FDA labels=${fdaData.labels?.length || 0} events=${fdaData.adverseEvents?.length || 0} approvals=${fdaData.approvals?.length || 0}`)

  return {
    cms: cmsData.success ? cmsData : (cmsData.error ? { ...cmsData } : undefined),
    pbs: pbsData.success ? pbsData : (pbsData.error ? { ...pbsData } : undefined),
    nhs: nhsData.success ? nhsData : (nhsData.error ? { ...nhsData } : undefined),
    fda: fdaData.success ? fdaData : (fdaData.error ? { ...fdaData } : undefined),
    fetchedAt: new Date().toISOString(),
    searchQuery: {
      drugName: drugName || '',
      indication: indication || '',
      drugNameEn,
      indicationEn,
    },
    success: successCount > 0,
    successCount,
    totalAttempts: 4,
  }
}

/**
 * í¹ì  APIë§ ë¨ë í¸ì¶
 */
export async function fetchFromSpecificAPI(
  apiName: 'cms' | 'pbs' | 'nhs' | 'fda',
  searchTerm: string
): Promise<CMSMedicareData | PBSAustraliaData | NHSUKData | FDAOpenFDAData> {
  const term = translateToEnglish(searchTerm)
  if (!term) throw new Error('Invalid search term')

  switch (apiName.toLowerCase()) {
    case 'cms': return fetchCMSMedicareData(term)
    case 'pbs': return fetchPBSAustraliaData(term)
    case 'nhs': return fetchNHSUKData(term)
    case 'fda': return fetchFDAOpenFDAData(term)
    default: throw new Error(`Unknown API: ${apiName}`)
  }
}

/**
 * API ë°ì´í°ì ì ë³´
 */
export const API_DATASETS = {
  cms: {
    name: 'CMS Medicare',
    country: 'USA',
    datasets: [
      { id: 'part-d-spending', name: 'Medicare Part D Drug Spending', description: 'ì½ë¬¼ë³ ì§ì¶ ë°ì´í°' },
    ],
  },
  pbs: {
    name: 'PBS Australia',
    country: 'Australia',
    datasets: [
      { id: 'items', name: 'PBS Drug Items', description: 'PBS ë±ì¬ ì½ë¬¼ ì ë³´' },
    ],
  },
  nhs: {
    name: 'NHS UK',
    country: 'United Kingdom',
    datasets: [
      { id: 'openprescribing', name: 'OpenPrescribing', description: 'NHS ì²ë°© íµê³' },
      { id: 'nhsbsa', name: 'NHSBSA Open Data', description: 'NHSBSA ê³µê° ë°ì´í°' },
    ],
  },
  fda: {
    name: 'FDA OpenFDA',
    country: 'USA',
    datasets: [
      { id: 'drug-label', name: 'Drug Labels', description: 'ì½ë¬¼ ë¼ë²¨ (í¨ë¥/ë¶ìì©/ì©ë²)' },
      { id: 'drug-event', name: 'Adverse Events', description: 'ë¶ìì© ë³´ê³  ë°ì´í°' },
      { id: 'drug-approval', name: 'Drug Approvals', description: 'FDA ì½ë¬¼ ì¹ì¸ ì ë³´' },
    ],
  },
} as const
