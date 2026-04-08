/**
 * Global Medical Data APIs Integration
 * Integrates 3 free, open international medical data APIs:
 * 1. CMS Medicare (USA) - data.cms.gov
 * 2. PBS Australia - data.pbs.gov.au
 * 3. NHS UK Open Data - opendata.nhsbsa.net
 */

import { translateToEnglish } from './drug-name-translator'

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
 */
async function fetchCMSMedicareData(drugName: string): Promise<CMSMedicareData> {
  const controller = createTimeoutController(REQUEST_TIMEOUT)

  try {
    if (!drugName || drugName.trim().length === 0) {
      return {
        drugSpending: [],
        source: 'CMS Medicare (data.cms.gov)',
        endpoint: 'https://data.cms.gov/resource/yvpj-pmj2.json',
        success: false,
        error: 'Drug name is required',
      }
    }

    // Encode drug name for URL
    const encodedDrugName = encodeURIComponent(drugName)

    // CMS uses Socrata API with SODA (Socrata Open Data API)
    // Using the Medicare Part D Drug Spending dataset
    const endpoint = `https://data.cms.gov/resource/yvpj-pmj2.json?drug_name=${encodedDrugName}&$limit=1000`

    console.log(`[CMS API] Fetching drug data for: ${drugName}`)
    console.log(`[CMS API] Endpoint: ${endpoint}`)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Green-RWD/1.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[CMS API] HTTP ${response.status}: ${response.statusText}`)
      return {
        drugSpending: [],
        source: 'CMS Medicare (data.cms.gov)',
        endpoint,
        success: false,
        error: `HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    // Transform CMS data to our interface
    const drugSpending: CMSMedicareDataPoint[] = Array.isArray(data)
      ? data.map((item: any) => ({
          drugName: item.drug_name || '',
          genericName: item.generic_name || '',
          totalSpending: parseFloat(item.total_spending || 0),
          totalClaims: parseInt(item.total_claims || 0, 10),
          totalBeneficiaries: parseInt(item.total_beneficiaries || 0, 10),
          avgSpendingPerClaim: parseFloat(item.avg_spending_per_claim || 0),
          avgSpendingPerBeneficiary: parseFloat(item.avg_spending_per_beneficiary || 0),
          year: item.year || new Date().getFullYear().toString(),
        }))
      : []

    console.log(`[CMS API] Retrieved ${drugSpending.length} records`)

    return {
      drugSpending,
      source: 'CMS Medicare (data.cms.gov)',
      endpoint,
      success: true,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[CMS API] Request timeout (10s)')
        return {
          drugSpending: [],
          source: 'CMS Medicare (data.cms.gov)',
          endpoint: 'https://data.cms.gov/resource/yvpj-pmj2.json',
          success: false,
          error: 'Request timeout',
        }
      }
      console.error('[CMS API] Error:', error.message)
      return {
        drugSpending: [],
        source: 'CMS Medicare (data.cms.gov)',
        endpoint: 'https://data.cms.gov/resource/yvpj-pmj2.json',
        success: false,
        error: error.message,
      }
    }
    return {
      drugSpending: [],
      source: 'CMS Medicare (data.cms.gov)',
      endpoint: 'https://data.cms.gov/resource/yvpj-pmj2.json',
      success: false,
      error: 'Unknown error',
    }
  } finally {
    cleanupTimeout(controller)
  }
}

/**
 * Fetch PBS Australia drug data
 * Rate limit: 1 request per 20 seconds
 */
async function fetchPBSAustraliaData(drugName: string): Promise<PBSAustraliaData> {
  const controller = createTimeoutController(REQUEST_TIMEOUT)

  try {
    if (!drugName || drugName.trim().length === 0) {
      return {
        items: [],
        source: 'PBS Australia (data.pbs.gov.au)',
        endpoint: 'https://data.pbs.gov.au/api/v3/item',
        success: false,
        error: 'Drug name is required',
      }
    }

    const encodedDrugName = encodeURIComponent(drugName)
    const endpoint = `https://data.pbs.gov.au/api/v3/item?q=${encodedDrugName}`

    console.log(`[PBS API] Fetching drug data for: ${drugName}`)
    console.log(`[PBS API] Endpoint: ${endpoint}`)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Green-RWD/1.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[PBS API] HTTP ${response.status}: ${response.statusText}`)
      return {
        items: [],
        source: 'PBS Australia (data.pbs.gov.au)',
        endpoint,
        success: false,
        error: `HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    // PBS API returns data in a 'data' or 'items' field
    const pbsItems = (data?.data || data?.items || []) as any[]

    const items: PBSItem[] = pbsItems
      .slice(0, 100) // Limit to 100 results
      .map((item: any) => ({
        itemCode: item.code || item.item_code || '',
        drugName: item.brand_name || item.name || '',
        formAndStrength: item.form_and_strength || item.strength || '',
        maxPrescriber: item.max_prescriber_qty || '',
        dispensedPriceMaxQuantity: parseFloat(item.dpmq || item.price || 0),
        atcCode: item.atc_code || item.atc || '',
        restrictions: item.restrictions || '',
        scheduleCode: item.schedule || '',
      }))

    console.log(`[PBS API] Retrieved ${items.length} items`)

    return {
      items,
      source: 'PBS Australia (data.pbs.gov.au)',
      endpoint,
      success: true,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[PBS API] Request timeout (10s)')
        return {
          items: [],
          source: 'PBS Australia (data.pbs.gov.au)',
          endpoint: 'https://data.pbs.gov.au/api/v3/item',
          success: false,
          error: 'Request timeout',
        }
      }
      console.error('[PBS API] Error:', error.message)
      return {
        items: [],
        source: 'PBS Australia (data.pbs.gov.au)',
        endpoint: 'https://data.pbs.gov.au/api/v3/item',
        success: false,
        error: error.message,
      }
    }
    return {
      items: [],
      source: 'PBS Australia (data.pbs.gov.au)',
      endpoint: 'https://data.pbs.gov.au/api/v3/item',
      success: false,
      error: 'Unknown error',
    }
  } finally {
    cleanupTimeout(controller)
  }
}

/**
 * Fetch NHS UK prescription data
 * Uses CKAN API
 */
async function fetchNHSUKData(searchTerm: string): Promise<NHSUKData> {
  const controller = createTimeoutController(REQUEST_TIMEOUT)

  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        prescriptionSummary: [],
        source: 'NHS UK (opendata.nhsbsa.net)',
        endpoint: 'https://opendata.nhsbsa.net/api/3/action/package_search',
        success: false,
        error: 'Search term is required',
      }
    }

    // Using CKAN package_search endpoint
    const encodedSearchTerm = encodeURIComponent(searchTerm)
    const endpoint = `https://opendata.nhsbsa.net/api/3/action/package_search?q=${encodedSearchTerm}&rows=50`

    console.log(`[NHS API] Fetching data for: ${searchTerm}`)
    console.log(`[NHS API] Endpoint: ${endpoint}`)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Green-RWD/1.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[NHS API] HTTP ${response.status}: ${response.statusText}`)
      return {
        prescriptionSummary: [],
        source: 'NHS UK (opendata.nhsbsa.net)',
        endpoint,
        success: false,
        error: `HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    // Extract prescription data from CKAN response
    const packages = (data?.result?.results || []) as any[]

    // Transform NHS data to our interface
    const prescriptionSummary: NHSPrescriptionSummary[] = packages
      .slice(0, 50)
      .map((pkg: any) => ({
        chemicalSubstance: pkg.title || pkg.name || '',
        totalItems: parseInt(pkg.extras?.total_items || pkg.total_items || 0, 10),
        totalQuantity: parseInt(pkg.extras?.total_quantity || pkg.total_quantity || 0, 10),
        totalNetIngredientCost: parseFloat(
          pkg.extras?.total_cost || pkg.total_cost || pkg.extras?.net_cost || 0
        ),
        period: pkg.extras?.period || pkg.period || new Date().getFullYear().toString(),
      }))

    console.log(`[NHS API] Retrieved ${prescriptionSummary.length} records`)

    return {
      prescriptionSummary,
      source: 'NHS UK (opendata.nhsbsa.net)',
      endpoint,
      success: true,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[NHS API] Request timeout (10s)')
        return {
          prescriptionSummary: [],
          source: 'NHS UK (opendata.nhsbsa.net)',
          endpoint: 'https://opendata.nhsbsa.net/api/3/action/package_search',
          success: false,
          error: 'Request timeout',
        }
      }
      console.error('[NHS API] Error:', error.message)
      return {
        prescriptionSummary: [],
        source: 'NHS UK (opendata.nhsbsa.net)',
        endpoint: 'https://opendata.nhsbsa.net/api/3/action/package_search',
        success: false,
        error: error.message,
      }
    }
    return {
      prescriptionSummary: [],
      source: 'NHS UK (opendata.nhsbsa.net)',
      endpoint: 'https://opendata.nhsbsa.net/api/3/action/package_search',
      success: false,
      error: 'Unknown error',
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

  // Translate Korean terms to English
  const drugNameEn = translateToEnglish(drugName || '')
  const indicationEn = translateToEnglish(indication || '')

  // Determine primary search term
  const primarySearchTerm = drugNameEn || indicationEn

  if (!primarySearchTerm) {
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

  return {
    cms: cmsData.success ? cmsData : undefined,
    pbs: pbsData.success ? pbsData : undefined,
    nhs: nhsData.success ? nhsData : undefined,
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
