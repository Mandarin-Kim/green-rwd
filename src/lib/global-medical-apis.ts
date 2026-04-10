/**
 * Global Medical Data APIs Integration (v2 - 2026 Updated)
 *
 * 4개 글로벌 의료 데이터 API 연동:
 * 1. CMS Medicare (USA) - data.cms.gov (새 data-api/v1 엔드포인트)
 * 2. PBS Australia - data.pbs.gov.au / data-api.health.gov.au (v3 API)
 * 3. NHS UK - OpenPrescribing.net (BNF 코드 기반 처방 통계)
 * 4. FDA OpenFDA (신규) - api.fda.gov (약물 라벨, 부작용, 승인 정보)
 *
 * 변경 이력:
 * - CMS: 레거시 Socrata API (yvpj-pmj2, 77gb-8z53) → 새 data-api/v1 + data.json 디스커버리
 * - PBS: v3/item 404 → 새 items 엔듘포인트 + health.gov.au 마이그레이션
 * - FDA: 신규 추가 (drug/label, drug/event, drug/drugsfda)
 */

import { translateToEnglish, getInternationalSearchTerms } from './drug-name-translator'

// ═══════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════

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

/** FDA OpenFDA - 약물 라벨 정보 */
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

/** FDA OpenFDA - 부작용 보고 집계 */
export interface FDAAdverseEvent {
  reactionName: string
  count: number
}

/** FDA OpenFDA - 약물 승인 정보 */
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

/** 글로벌 의료 데이터 통합 응답 */
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

// ═══════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════

const REQUEST_TIMEOUT = 15000 // 15초 (글로벌 API는 느릴 수 있음)

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

/** 안전한 fetch wrapper - 에러 시 null 반환 */
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

// ═══════════════════════════════════════════
// 1. CMS Medicare (USA)
// ═══════════════════════════════════════════

/**
 * CMS Medicare 약물 지출 데이터 조회
 *
 * 전략:
 * 1차: data.cms.gov 새 data-api/v1 엔드포인트 (data.json 디스커버리)
 * 2차: data.cms.gov 직접 데이터 페이지 API
 * 3차: 레거시 Socrata 호환 엔듘포인트 (일부 데이터셋은 아직 작동)
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

  // ── 전략 1: 새 data-api/v1 엔드포인트 ──
  // data.json에서 Medicare Part D Spending by Drug 데이터셋의 UUID를 찾아 사용
  try {
    const dataJsonUrl = 'https://data.cms.gov/data.json'
    console.log(`[CMS API] Strategy 1: Discovering dataset via data.json`)

    const djRes = await safeFetch(dataJsonUrl, {}, 12000)
    if (djRes?.ok) {
      const catalog = await djRes.json()
      const datasets = catalog?.dataset || []

      // "Medicare Part D Spending by Drug" 데이터셋 찾기
      const partDDataset = datasets.find((ds: any) => {
        const title = (ds.title || '').toLowerCase()
        return title.includes('medicare part d') && title.includes('spending') && title.includes('drug')
          && !title.includes('quarterly') && !title.includes('dashboard')
      })

      if (partDDataset?.distribution) {
        // API format의 distribution에서 accessURL 추출
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

            // filter 파라미터로 약물명 검색
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

            // 브랜드명으로 못 찾으면 성분명으로 시도
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

  // ── 전략 2: 직접 데이터 페이지 URL ──
  if (drugSpending.length === 0) {
    try {
      console.log(`[CMS API] Strategy 2: Direct data page API`)

      for (const term of searchTerms) {
        if (drugSpending.length > 0) break

        // CMS 데이터 페이지의 JSON API 직접 호출
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

  // ── 전략 3: 레거시 Socrata 호환 (일부 데이터셋은 아직 작동할 수 있음) ──
  if (drugSpending.length === 0) {
    try {
      console.log(`[CMS API] Strategy 3: Legacy Socrata compatible`)

      for (const term of searchTerms) {
        if (drugSpending.length > 0) break

        const whereClause = encodeURIComponent(
          `upper(brnd_name) like '%${term}%' OR upper(gnrc_name) like '%${term}%'`
        )
        // 기존 yvpj-pmj2 대신 최신 데이터셋 ID 시도
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
            // deprecated 응답 체크
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
    success: true, // API 호출 시도 자체는 성공 (결과 0건이어도)
  }
}

/** CMS 응답 데이터를 통합 형식으로 변환 */
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

// ═══════════════════════════════════════════
// 2. PBS Australia
// ═══════════════════════════════════════════

/**
 * PBS 호주 약물 데이터 조회
 *
 * 전략:
 * 1차: 새 health.gov.au PBS API v3 (2025년 마이그레이션)
 * 2차: data.pbs.gov.au v3 API (items 엔드포인트)
 * 3차: PBS 공개 검색 API
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

  // ── 전략 1: 새 health.gov.au PBS API v3 ──
  try {
    console.log(`[PBS API] Strategy 1: health.gov.au PBS API v3`)

    // 새 엔드포인트: data-api.health.gov.au/pbs/api/v3/items
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

  // ── 전략 2: data.pbs.gov.au v3 API ──
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
            // XML 응답 파싱
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

  // ── 전략 3: PBS 검색 API ──
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

/** PBS API 응답에서 items 배열 추출 (다양한 응답 구조 대응) */
function extractPBSItems(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data?.data && Array.isArray(data.data)) return data.data
  if (data?.items && Array.isArray(data.items)) return data.items
  if (data?.results && Array.isArray(data.results)) return data.results
  if (data?._embedded?.items) return data._embedded.items
  if (data?._embedded?.['item-overviews']) return data._embedded['item-overviews']
  return []
}

/** PBS 데이터를 통합 형식으로 변환 */
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

/** PBS XML 응답에서 기본 정보 추출 */
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

// ═══════════════════════════════════════════
// 3. NHS UK (OpenPrescribing.net)
// ═══════════════════════════════════════════

/**
 * NHS UK 처방 데이터 조회
 * OpenPrescribing.net API → BNF 코드 가색 → 처방 통계
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

  // 시도 1: OpenPrescribing.net BNF 코드 검색 → 처방 통계
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

        // BNF 검색은 성공했지만 처방 데이터가 없으면
        if (prescriptionSummary.length === 0) {
          prescriptionSummary = results.slice(0, 20).map((item: any) => ({
            chemicalSubstance: item.name || item.title || '',
            totalItems: 0,
            totalQuantity: 0,
            totalNetIngredientCost: 0,
            period: 'BNF 등재 확인',
          }))
        }
      }
    }
  } catch (e) {
    console.warn(`[NHS API] OpenPrescribing failed:`, e instanceof Error ? e.message : e)
  }

  // 시도 2: NHSBSA CKAN datastore_search (fallback)
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

// ═══════════════════════════════════════════
// 4. FDA OpenFDA (신규)
// ═══════════════════════════════════════════

/**
 * FDA OpenFDA 약물 데이터 조회
 *
 * 3가지 엔듘포인트 병렬 호출:
 * 1. drug/label - 약물 라벨 정보 (효능, 부작용, 용법 등)
 * 2. drug/event - 부작용 보고 집계
 * 3. drug/drugsfda - 약물 승인 정보
 */
async function fetchFDAOpenFDAData(drugName: string, indicationTerm?: string): Promise<FDAOpenFDAData> {
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
  console.log(`[FDA API] Searching for: ${searchTerm}, indication: ${indicationTerm || '없음'}`)

  let labels: FDADrugLabel[] = []
  let adverseEvents: FDAAdverseEvent[] = []
  let approvals: FDADrugApproval[] = []
  let usedEndpoint = ''

  // 병렬 호출: 라벨, 부작용, 승인 정보
  // 라벨은 indicationTerm도 전달 (indications_and_usage 폴백 검색 용)
  const [labelResult, eventResult, approvalResult] = await Promise.allSettled([
    fetchFDALabels(searchTerm, indicationTerm),
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

/** FDA 약물 라벨 조회 */
async function fetchFDALabels(searchTerm: string, indicationTerm?: string): Promise<FDADrugLabel[]> {
  const mapLabel = (item: any): FDADrugLabel => {
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
  }

  // 1차: 약물명(generic_name / brand_name)으로 검색
  const url1 = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(searchTerm)}"+openfda.brand_name:"${encodeURIComponent(searchTerm)}"&limit=10`
  const res1 = await safeFetch(url1, {}, 12000)
  if (res1?.ok) {
    const data1 = await res1.json()
    const results1 = data1?.results || []
    if (results1.length > 0) {
      console.log(`[FDA API] Labels (drug name search): ${results1.length} records`)
      return results1.slice(0, 10).map(mapLabel)
    }
  }

  // 2차 fallback: indications_and_usage 필드로 검색 (질환명이 검색어인 경우 대응)
  const fallback = (indicationTerm || searchTerm).toLowerCase()
  const url2 = `https://api.fda.gov/drug/label.json?search=indications_and_usage:"${encodeURIComponent(fallback)}"&limit=10`
  console.log(`[FDA API] Label fallback (indications_and_usage): ${fallback}`)
  const res2 = await safeFetch(url2, {}, 12000)
  if (!res2?.ok) return []
  const data2 = await res2.json()
  const results2 = data2?.results || []
  console.log(`[FDA API] Labels (indication search): ${results2.length} records`)
  return results2.slice(0, 10).map(mapLabel)
}

/** FDA 부작용 보고 집계 조회 */
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

/** FDA 약물 승인 정보 조회 */
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

/** 긴 텍스트를 안전하게 자르기 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || ''
  return text.substring(0, maxLength) + '...'
}

// ═══════════════════════════════════════════
// 통합 데이터 조회 함수
// ═══════════════════════════════════════════

/**
 * 모든 글로벌 의료 데이터 API 병렬 호출
 * @param drugName - 약물명 (한국어/영어)
 * @param indication - 적응증 (한국어/영어)
 */
export async function fetchGlobalMedicalData(
  drugName: string,
  indication: string
): Promise<GlobalMedicalData> {
  console.log('[Global Medical APIs] Starting fetch...')
  console.log(`[Global Medical APIs] Drug: ${drugName}, Indication: ${indication}`)

  // 한국어→영어 번역
  const terms = getInternationalSearchTerms(drugName || '', indication || '')
  const drugNameEn = terms.drugNameEn
  const indicationEn = terms.indicationEn

  // 한국어가 아닌 검색岴만 추출
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

  // CMS/PBS/NHS는 약물명으로 검색 → indicationEn을 제외하고 실제 약물명 우선 사용
  const drugSearchTerm = allSearchTerms.find(t => t.toLowerCase() !== indicationEn.toLowerCase()) || primarySearchTerm
  // FDA 라벨 검색: 약물명 + indicationEn 폴백 함께 사용
  console.log(`[Global Medical APIs] Primary term: ${primarySearchTerm}, Drug term: ${drugSearchTerm}, IndicationEn: ${indicationEn}`)

  const startTime = Date.now()

  // 4개 API 병렬 호출
  const [cmsData, pbsData, nhsData, fdaData] = await Promise.all([
    fetchCMSMedicareData(drugSearchTerm).catch(err => {
      console.error('[Global Medical APIs] CMS error:', err)
      return { drugSpending: [], source: 'CMS Medicare', endpoint: '', success: false, error: 'Fetch failed' } as CMSMedicareData
    }),
    fetchPBSAustraliaData(drugSearchTerm).catch(err => {
      console.error('[Global Medical APIs] PBS error:', err)
      return { items: [], source: 'PBS Australia', endpoint: '', success: false, error: 'Fetch failed' } as PBSAustraliaData
    }),
    fetchNHSUKData(drugSearchTerm).catch(err => {
      console.error('[Global Medical APIs] NHS error:', err)
      return { prescriptionSummary: [], source: 'NHS UK', endpoint: '', success: false, error: 'Fetch failed' } as NHSUKData
    }),
    fetchFDAOpenFDAData(drugSearchTerm, indicationEn || primarySearchTerm).catch(err => {
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
 * 특정 API만 단독 호출
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
 * API 데이터셋 정보
 */
export const API_DATASETS = {
  cms: {
    name: 'CMS Medicare',
    country: 'USA',
    datasets: [
      { id: 'part-d-spending', name: 'Medicare Part D Drug Spending', description: '약문별 지출 데이터' },
    ],
  },
  pbs: {
    name: 'PBS Australia',
    country: 'Australia',
    datasets: [
      { id: 'items', name: 'PBS Drug Items', description: 'PBS 등재 약물 정보' },
    ],
  },
  nhs: {
    name: 'NHS UK',
    country: 'United Kingdom',
    datasets: [
      { id: 'openprescribing', name: 'OpenPrescribing', description: 'NHS 처방 통계' },
      { id: 'nhsbsa', name: 'NHSBSA Open Data', description: 'NHSBSA 공개 데이터' },
    ],
  },
  fda: {
    name: 'FDA OpenFDA',
    country: 'USA',
    datasets: [
      { id: 'drug-label', name: 'Drug Labels', description: '약물 라벨 (효능/부작용/용법)' },
      { id: 'drug-event', name: 'Adverse Events', description: '부작용 보고 데이터' },
      { id: 'drug-approval', name: 'Drug Approvals', description: 'FDA 약물 승인 정보' },
    ],
  },
} as const
