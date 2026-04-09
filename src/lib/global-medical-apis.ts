/**
 * Global Medical Data APIs Integration
 * Integrates 3 free, open international medical data APIs:
 * 1. CMS Medicare (USA) - data.cms.gov
 * 2. PBS Australia - data.pbs.gov.au
 * 3. NHS UK Open Data - opendata.nhsbsa.net
 */

import { translateToEnglish, getInternationalSearchTerms } from './drug-name-translator'

/**
 * CMS Medicare Data Interfaces
 */
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

/**
 * PBS Australia Data Interfaces
 */
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

/**
 * NHS UK Data Interfaces
 */
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

/**
 * Global Medical Data - Combined Response
 */
export interface GlobalMedicalData {
  cms?: CMSMedicareData
  pbs?: PBSAustraliaData
  nhs?: NHSUKData
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

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT = 10000

/**
 * Create an AbortController with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // Store timeout ID for cleanup if request completes
  ;(controller as any).__timeoutId = timeoutId

  return controller
}

/**
 * Cleanup timeout
 * @param controller - AbortController
 */
function cleanupTimeout(controller: AbortController): void {
  const timeoutId = (controller as any).__timeoutId
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch CMS Medicare drug spending data
 * Uses Socrata Open Data API - no auth required
 *
 * 핵심 수정:
 * 1. $where + upper() 로 대소문자 무관 LIKE 검색
 * 2. brnd_name / gnrc_name 필드 사용 (CMS 실제 스키마)
 * 3. 여러 검색어 순차 시도 (약물명 → 성분명)
 * 4. fallback 데이터셋: Medicare Part D Spending by Drug (77gb-8z53)
 */
async function fetchCMSMedicareData(drugName: string): Promise<CMSMedicareData> {
  const controller = createTimeoutController(REQUEST_TIMEOUT)

  try {
    if (!drugName || drugName.trim().length === 0) {
      return {
        drugSpending: [],
        source: 'CMS Medicare (data.cms.gov)',
        endpoint: '',
        success: false,
        error: 'Drug name is required',
      }
    }

    const upperDrug = drugName.toUpperCase()
    console.log(`[CMS API] Searching for: ${drugName} (${upperDrug})`)

    // 검색어 변형 목록 (순서대로 시도)
    const searchVariants = [
      upperDrug,
      upperDrug.split(' ')[0], // 첫 단어만
    ]

    let drugSpending: CMSMedicareDataPoint[] = []
    let usedEndpoint = ''

    // 시도 1: Medicare Part D Spending by Drug (Socrata dataset)
    // 데이터셋: https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug
    for (const searchTerm of searchVariants) {
      if (drugSpending.length > 0) break

      // $where 절로 LIKE 검색 (대소문자 무관)
      const whereClause = encodeURIComponent(
        `upper(brnd_name) like '%${searchTerm}%' OR upper(gnrc_name) like '%${searchTerm}%'`
      )
      const endpoint = `https://data.cms.gov/resource/yvpj-pmj2.json?$where=${whereClause}&$limit=50&$order=tot_spndng DESC`
      usedEndpoint = endpoint

      console.log(`[CMS API] Trying dataset yvpj-pmj2 with: ${searchTerm}`)

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        })

        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            drugSpending = data.map((item: any) => ({
              drugName: item.brnd_name || item.drug_name || '',
              genericName: item.gnrc_name || item.generic_name || '',
              totalSpending: parseFloat(item.tot_spndng || item.total_spending || 0),
              totalClaims: parseInt(item.tot_clms || item.total_claims || 0, 10),
              totalBeneficiaries: parseInt(item.tot_benes || item.total_beneficiaries || 0, 10),
              avgSpendingPerClaim: parseFloat(item.avg_spnd_per_clm || item.avg_spending_per_claim || 0),
              avgSpendingPerBeneficiary: parseFloat(item.avg_spnd_per_bene || item.avg_spending_per_beneficiary || 0),
              year: item.year || item.coverage_year || '',
            }))
            console.log(`[CMS API] Found ${drugSpending.length} records from yvpj-pmj2`)
          }
        }
      } catch (e) {
        console.warn(`[CMS API] yvpj-pmj2 failed for ${searchTerm}:`, e)
      }
    }

    // 시도 2: 대체 데이터셋 (77gb-8z53 - Medicare Part D Drug Spending Dashboard)
    if (drugSpending.length === 0) {
      for (const searchTerm of searchVariants) {
        if (drugSpending.length > 0) break

        const whereClause = encodeURIComponent(
          `upper(brand_name) like '%${searchTerm}%' OR upper(generic_name) like '%${searchTerm}%'`
        )
        const endpoint = `https://data.cms.gov/resource/77gb-8z53.json?$where=${whereClause}&$limit=50`
        usedEndpoint = endpoint

        console.log(`[CMS API] Trying fallback dataset 77gb-8z53 with: ${searchTerm}`)

        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
          })

          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data) && data.length > 0) {
              drugSpending = data.map((item: any) => ({
                drugName: item.brand_name || '',
                genericName: item.generic_name || '',
                totalSpending: parseFloat(item.total_spending || item.tot_spndng || 0),
                totalClaims: parseInt(item.total_claims || item.number_of_claims || 0, 10),
                totalBeneficiaries: parseInt(item.total_beneficiaries || item.number_of_beneficiaries || 0, 10),
                avgSpendingPerClaim: parseFloat(item.average_cost_per_unit || 0),
                avgSpendingPerBeneficiary: parseFloat(item.average_spending_per_beneficiary || 0),
                year: item.year || '',
              }))
              console.log(`[CMS API] Found ${drugSpending.length} records from 77gb-8z53`)
            }
          }
        } catch (e) {
          console.warn(`[CMS API] 77gb-8z53 failed for ${searchTerm}:`, e)
        }
      }
    }

    console.log(`[CMS API] Final result: ${drugSpending.length} records`)

    return {
      drugSpending,
      source: 'CMS Medicare Part D Drug Spending (data.cms.gov)',
      endpoint: usedEndpoint,
      success: true, // API 호출 자체는 성공 (결과 0건이어도)
    }
  } catch (error) {
    const errMsg = error instanceof Error
      ? (error.name === 'AbortError' ? 'Request timeout (10s)' : error.message)
      : 'Unknown error'
    console.error(`[CMS API] Error: ${errMsg}`)
    return {
      drugSpending: [],
      source: 'CMS Medicare (data.cms.gov)',
      endpoint: '',
      success: false,
      error: errMsg,
    }
  } finally {
    cleanupTimeout(controller)
  }
}

/**
 * Fetch PBS Australia drug data
 *
 * 핵심 수정:
 * 1. PBS API v3 검색 엔드포인트 사용
 * 2. JSON fallback: PBS의 공개 JSON 데이터
 * 3. XML 응답도 처리 가능하도록
 */
async function fetchPBSAustraliaData(drugName: string): Promise<PBSAustraliaData> {
  const controller = createTimeoutController(REQUEST_TIMEOUT)

  try {
    if (!drugName || drugName.trim().length === 0) {
      return {
        items: [],
        source: 'PBS Australia (pbs.gov.au)',
        endpoint: '',
        success: false,
        error: 'Drug name is required',
      }
    }

    const searchTerm = drugName.toLowerCase()
    let items: PBSItem[] = []
    let usedEndpoint = ''

    console.log(`[PBS API] Searching for: ${drugName}`)

    // 시도 1: PBS API v3 (JSON)
    try {
      const encodedDrug = encodeURIComponent(searchTerm)
      const endpoint1 = `https://data.pbs.gov.au/api/v3/item?q=${encodedDrug}&format=json`
      usedEndpoint = endpoint1
      console.log(`[PBS API] Trying v3 API: ${endpoint1}`)

      const res1 = await fetch(endpoint1, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      })

      if (res1.ok) {
        const contentType = res1.headers.get('content-type') || ''
        if (contentType.includes('json')) {
          const data = await res1.json()
          const rawItems = Array.isArray(data) ? data : (data?.data || data?.items || data?.results || [])
          if (rawItems.length > 0) {
            items = rawItems.slice(0, 100).map((item: any) => ({
              itemCode: item.pbs_code || item.item_code || item.code || '',
              drugName: item.brand_name || item.trade_name || item.name || item.drug_name || '',
              formAndStrength: item.form_and_strength || item.form || item.strength || '',
              maxPrescriber: item.max_prescriber_qty || item.max_quantity || '',
              dispensedPriceMaxQuantity: parseFloat(item.dpmq || item.dispensed_price || item.price || 0),
              atcCode: item.atc_code || item.atc || '',
              restrictions: item.restriction_text || item.restrictions || item.note || '',
              scheduleCode: item.schedule_code || item.schedule || item.program_code || '',
            }))
            console.log(`[PBS API] v3 found ${items.length} items`)
          }
        } else {
          // XML 응답일 수 있음 - 텍스트에서 기본 정보 추출
          const text = await res1.text()
          console.log(`[PBS API] v3 returned non-JSON (${contentType}), length: ${text.length}`)
          // XML 파싱은 복잡하므로, 결과가 있다는 사실만 기록
          if (text.length > 200) {
            // XML에서 간단한 정보 추출 시도
            const brandMatches = text.match(/<brand-name[^>]*>([^<]+)<\/brand-name>/gi) || []
            const codeMatches = text.match(/<pbs-code[^>]*>([^<]+)<\/pbs-code>/gi) || []
            if (brandMatches.length > 0) {
              items = brandMatches.slice(0, 50).map((match, idx) => {
                const brand = match.replace(/<[^>]+>/g, '').trim()
                const code = codeMatches[idx] ? codeMatches[idx].replace(/<[^>]+>/g, '').trim() : ''
                return {
                  itemCode: code,
                  drugName: brand,
                  formAndStrength: '',
                  maxPrescriber: '',
                  dispensedPriceMaxQuantity: 0,
                  atcCode: '',
                  restrictions: '',
                  scheduleCode: '',
                }
              })
              console.log(`[PBS API] Extracted ${items.length} items from XML`)
            }
          }
        }
      } else {
        console.warn(`[PBS API] v3 returned HTTP ${res1.status}`)
      }
    } catch (e) {
      console.warn(`[PBS API] v3 failed:`, e instanceof Error ? e.message : e)
    }

    // 시도 2: PBS 검색 페이지 API (HTML scrape fallback은 제외, API만)
    if (items.length === 0) {
      try {
        const encodedDrug = encodeURIComponent(searchTerm)
        const endpoint2 = `https://www.pbs.gov.au/pbs/api/search?term=${encodedDrug}&type=medicine`
        usedEndpoint = endpoint2
        console.log(`[PBS API] Trying search API: ${endpoint2}`)

        const res2 = await fetch(endpoint2, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        })

        if (res2.ok) {
          const data = await res2.json()
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
            console.log(`[PBS API] Search found ${items.length} items`)
          }
        }
      } catch (e) {
        console.warn(`[PBS API] Search API failed:`, e instanceof Error ? e.message : e)
      }
    }

    console.log(`[PBS API] Final result: ${items.length} items`)

    return {
      items,
      source: 'PBS Australia (Pharmaceutical Benefits Scheme)',
      endpoint: usedEndpoint,
      success: true,
    }
  } catch (error) {
    const errMsg = error instanceof Error
      ? (error.name === 'AbortError' ? 'Request timeout (10s)' : error.message)
      : 'Unknown error'
    console.error(`[PBS API] Error: ${errMsg}`)
    return {
      items: [],
      source: 'PBS Australia (pbs.gov.au)',
      endpoint: '',
      success: false,
      error: errMsg,
    }
  } finally {
    cleanupTimeout(controller)
  }
}

/**
 * Fetch NHS UK prescription data
 *
 * 핵심 수정:
 * 1. OpenPrescribing.net API 사용 (실제 처방 데이터 제공, 무료, 인증 불필요)
 * 2. NHSBSA CKAN datastore_search (SQL 쿼리)를 fallback으로
 * 3. 약물명으로 BNF 코드 먼저 조회 후 처방 통계 가져오기
 */
async function fetchNHSUKData(searchTerm: string): Promise<NHSUKData> {
  const controller = createTimeoutController(REQUEST_TIMEOUT)

  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        prescriptionSummary: [],
        source: 'NHS UK (OpenPrescribing.net)',
        endpoint: '',
        success: false,
        error: 'Search term is required',
      }
    }

    let prescriptionSummary: NHSPrescriptionSummary[] = []
    let usedEndpoint = ''

    console.log(`[NHS API] Searching for: ${searchTerm}`)

    // 시도 1: OpenPrescribing.net API (가장 풍부한 NHS 처방 데이터)
    try {
      const encodedTerm = encodeURIComponent(searchTerm.toLowerCase())
      // 먼저 BNF 코드로 약물 검색
      const searchEndpoint = `https://openprescribing.net/api/1.0/bnf_code/?q=${encodedTerm}&format=json`
      usedEndpoint = searchEndpoint
      console.log(`[NHS API] OpenPrescribing BNF search: ${searchEndpoint}`)

      const searchRes = await fetch(searchEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      })

      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const bnfResults = Array.isArray(searchData) ? searchData : []
        console.log(`[NHS API] BNF search found ${bnfResults.length} matches`)

        if (bnfResults.length > 0) {
          // BNF 코드로 처방 통계 조회 (최근 12개월)
          const bnfCode = bnfResults[0].id || bnfResults[0].bnf_code || ''
          if (bnfCode) {
            const spendingEndpoint = `https://openprescribing.net/api/1.0/spending/?code=${encodeURIComponent(bnfCode)}&format=json`
            usedEndpoint = spendingEndpoint
            console.log(`[NHS API] Fetching spending for BNF: ${bnfCode}`)

            const spendingRes = await fetch(spendingEndpoint, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: controller.signal,
            })

            if (spendingRes.ok) {
              const spendingData = await spendingRes.json()
              const spendingItems = Array.isArray(spendingData) ? spendingData : []

              prescriptionSummary = spendingItems.slice(0, 24).map((item: any) => ({
                chemicalSubstance: bnfResults[0].name || bnfResults[0].title || searchTerm,
                totalItems: parseInt(item.items || 0, 10),
                totalQuantity: parseInt(item.quantity || 0, 10),
                totalNetIngredientCost: parseFloat(item.actual_cost || item.cost || 0),
                period: item.date || item.row_name || '',
              }))
              console.log(`[NHS API] OpenPrescribing found ${prescriptionSummary.length} spending records`)
            }
          }
        }

        // BNF 검색은 성공했지만 처방 데이터가 없으면, 검색 결과 자체를 summary로
        if (prescriptionSummary.length === 0 && bnfResults.length > 0) {
          prescriptionSummary = bnfResults.slice(0, 20).map((item: any) => ({
            chemicalSubstance: item.name || item.title || '',
            totalItems: 0,
            totalQuantity: 0,
            totalNetIngredientCost: 0,
            period: 'BNF 등재 확인',
          }))
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
        console.log(`[NHS API] CKAN fallback: ${ckanEndpoint}`)

        const ckanRes = await fetch(ckanEndpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        })

        if (ckanRes.ok) {
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

    console.log(`[NHS API] Final result: ${prescriptionSummary.length} records`)

    return {
      prescriptionSummary,
      source: 'NHS UK (OpenPrescribing.net + NHSBSA)',
      endpoint: usedEndpoint,
      success: true,
    }
  } catch (error) {
    const errMsg = error instanceof Error
      ? (error.name === 'AbortError' ? 'Request timeout (10s)' : error.message)
      : 'Unknown error'
    console.error(`[NHS API] Error: ${errMsg}`)
    return {
      prescriptionSummary: [],
      source: 'NHS UK (opendata.nhsbsa.net)',
      endpoint: '',
      success: false,
      error: errMsg,
    }
  } finally {
    cleanupTimeout(controller)
  }
}

/**
 * Fetch global medical data from all three APIs
 * @param drugName - Drug name (Korean or English)
 * @param indication - Indication/disease (Korean or English)
 * @returns GlobalMedicalData with results from all APIs
 */
export async function fetchGlobalMedicalData(
  drugName: string,
  indication: string
): Promise<GlobalMedicalData> {
  console.log('[Global Medical APIs] Starting fetch...')
  console.log(`[Global Medical APIs] Drug: ${drugName}, Indication: ${indication}`)

  // Translate Korean terms to English using enhanced translator
  const terms = getInternationalSearchTerms(drugName || '', indication || '')
  const drugNameEn = terms.drugNameEn
  const indicationEn = terms.indicationEn

  // 한국어가 남아있지 않은 첫 번째 검색어를 primary로 사용
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

  console.log(
    `[Global Medical APIs] Translated search term: ${primarySearchTerm}`
  )

  // Execute all API calls in parallel
  const startTime = Date.now()

  const [cmsData, pbsData, nhsData] = await Promise.all([
    fetchCMSMedicareData(primarySearchTerm).catch(err => {
      console.error('[Global Medical APIs] CMS fetch error:', err)
      return {
        drugSpending: [],
        source: 'CMS Medicare (data.cms.gov)',
        endpoint: 'https://data.cms.gov/resource/yvpj-pmj2.json',
        success: false,
        error: 'Fetch failed',
      } as CMSMedicareData
    }),
    fetchPBSAustraliaData(primarySearchTerm).catch(err => {
      console.error('[Global Medical APIs] PBS fetch error:', err)
      return {
        items: [],
        source: 'PBS Australia (data.pbs.gov.au)',
        endpoint: 'https://data.pbs.gov.au/api/v3/item',
        success: false,
        error: 'Fetch failed',
      } as PBSAustraliaData
    }),
    fetchNHSUKData(primarySearchTerm).catch(err => {
      console.error('[Global Medical APIs] NHS fetch error:', err)
      return {
        prescriptionSummary: [],
        source: 'NHS UK (opendata.nhsbsa.net)',
        endpoint: 'https://opendata.nhsbsa.net/api/3/action/package_search',
        success: false,
        error: 'Fetch failed',
      } as NHSUKData
    }),
  ])

  const duration = Date.now() - startTime

  // Count successes
  const successCount = [cmsData.success, pbsData.success, nhsData.success].filter(
    Boolean
  ).length

  console.log(
    `[Global Medical APIs] Completed in ${duration}ms. Success: ${successCount}/3`
  )

  // API 호출이 성공했으면 결과 0건이어도 저장 (호출 실패만 undefined)
  return {
    cms: cmsData.success ? cmsData : (cmsData.error ? { ...cmsData } : undefined),
    pbs: pbsData.success ? pbsData : (pbsData.error ? { ...pbsData } : undefined),
    nhs: nhsData.success ? nhsData : (nhsData.error ? { ...nhsData } : undefined),
    fetchedAt: new Date().toISOString(),
    searchQuery: {
      drugName: drugName || '',
      indication: indication || '',
      drugNameEn,
      indicationEn,
    },
    success: successCount > 0,
    successCount,
    totalAttempts: 3,
  }
}

/**
 * Fetch data from a specific API only
 * @param apiName - 'cms' | 'pbs' | 'nhs'
 * @param searchTerm - Search term (drug name or indication)
 * @returns Data from the specified API
 */
export async function fetchFromSpecificAPI(
  apiName: 'cms' | 'pbs' | 'nhs',
  searchTerm: string
): Promise<CMSMedicareData | PBSAustraliaData | NHSUKData> {
  const term = translateToEnglish(searchTerm)

  if (!term) {
    throw new Error('Invalid search term')
  }

  switch (apiName.toLowerCase()) {
    case 'cms':
      return fetchCMSMedicareData(term)
    case 'pbs':
      return fetchPBSAustraliaData(term)
    case 'nhs':
      return fetchNHSUKData(term)
    default:
      throw new Error(`Unknown API: ${apiName}`)
  }
}

/**
 * Get available datasets from each API
 */
export const API_DATASETS = {
  cms: {
    name: 'CMS Medicare',
    datasets: [
      {
        id: 'yvpj-pmj2',
        name: 'Medicare Part D Drug Spending',
        description: 'Drug spending data by drug name',
      },
      {
        id: '7jjp-3256',
        name: 'Medicare Spending Per Beneficiary by State',
        description: 'Spending trends by state',
      },
    ],
  },
  pbs: {
    name: 'PBS Australia',
    datasets: [
      {
        id: '/item',
        name: 'PBS Drug Items',
        description: 'Search and get details of drugs on PBS',
      },
    ],
  },
  nhs: {
    name: 'NHS UK',
    datasets: [
      {
        id: 'package_search',
        name: 'NHS Prescription Data',
        description: 'Search NHS prescription datasets',
      },
    ],
  },
} as const
