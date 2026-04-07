/**
 * HIRA 약가기준정보조회서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 약가기준정보조회서비스 v1.2 — 2개 엔드포인트
 *
 * 엔드포인트 목록:
 * 1. getDgamtList - 약가목록조회 (제품코드, 품목명, 제조업체명, 약가, 규격, 투여경로, 급여구분, 주성분코드)
 * 2. getCmdcDgamtList - 한방약가목록조회 (한방약 약가, 규격명, 투여경로, 급여구분)
 *
 * 활용: 제약사 시장 보고서에서 약품별 약가 비교, 급여/비급여 현황,
 *       제조업체별 점유율, 주성분 기반 경쟁 약품 분석
 */

// ============================================
// 타입 정의
// ============================================

/** 약가 정보 (일반) */
export interface DrugPriceInfo {
  productCode: string;        // 제품코드
  productName: string;        // 품목명
  manufacturer: string;       // 제조업체명
  effectiveDate: string;      // 적용시작일자 (YYYYMMDD)
  specification: string;      // 규격명
  dosageRoute: string;        // 투여경로 (경구, 주사 등)
  payType: string;            // 급여구분 (급여/비급여)
  unitPrice: number;          // 약가 (단가, 원)
  upperLimit: number;         // 상한가 (원)
  mainIngredientCode: string; // 주성분코드
  category: '일반' | '한방';
}

/** 약가 검색 조건 */
export interface DrugPriceSearchParams {
  productCode?: string;       // 제품코드
  productName?: string;       // 품목명 (검색유형: %A%)
  manufacturer?: string;      // 제조업체명
  numOfRows?: number;
  pageNo?: number;
}

/** 약가 분석 결과 */
export interface DrugPriceAnalysis {
  keyword: string;
  totalProducts: number;
  products: DrugPriceInfo[];
  byManufacturer: { manufacturer: string; count: number; avgPrice: number }[];
  byDosageRoute: { route: string; count: number; avgPrice: number }[];
  coverageStats: {
    coveredCount: number;
    uncoveredCount: number;
    coveredRate: number;
  };
  priceRange: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
}

// ============================================
// API 설정
// ============================================

const DRUGPRICE_ENDPOINT = process.env.HIRA_DRUGPRICE_API_ENDPOINT || 'https://apis.data.go.kr/B551182/dgamtCrtrInfoService1.2';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callDrugPriceApi(
  operation: string,
  params: Record<string, string | number>
): Promise<{ items: Record<string, string | number>[]; totalCount: number }> {
  if (!HIRA_KEY) {
    console.warn('HIRA_API_KEY가 설정되지 않았습니다.');
    return { items: [], totalCount: 0 };
  }

  try {
    const searchParams = new URLSearchParams();
    searchParams.set('serviceKey', HIRA_KEY);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') searchParams.set(k, String(v));
    });

    const url = `${DRUGPRICE_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA DrugPrice API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA DrugPrice API 실패 (${operation}):`, err);
    return { items: [], totalCount: 0 };
  }
}

// ============================================
// XML 파싱
// ============================================

function parseXml(xml: string): { items: Record<string, string | number>[]; totalCount: number } {
  const totalMatch = xml.match(/<totalCount>(\d+)<\/totalCount>/);
  const totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const items: Record<string, string | number>[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;

  while ((m = itemRegex.exec(xml)) !== null) {
    const item: Record<string, string | number> = {};
    const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g;
    let f;
    while ((f = fieldRegex.exec(m[1])) !== null) {
      item[f[1]] = /^\d+(\.\d+)?$/.test(f[2]) ? parseFloat(f[2]) : f[2];
    }
    if (Object.keys(item).length > 0) items.push(item);
  }

  return { items, totalCount };
}

// ============================================
// 2개 엔드포인트 함수
// ============================================

/** 1. 약가목록조회 (일반) */
export const getDgamtList = (p?: Record<string, string | number>) =>
  callDrugPriceApi('getDgamtList', { numOfRows: 100, pageNo: 1, ...p });

/** 2. 한방약가목록조회 */
export const getCmdcDgamtList = (p?: Record<string, string | number>) =>
  callDrugPriceApi('getCmdcDgamtList', { numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** XML → DrugPriceInfo 변환 */
function toDrugPriceInfo(item: Record<string, string | number>, category: '일반' | '한방'): DrugPriceInfo {
  return {
    productCode: String(item.mdprCd || item.itemCd || ''),
    productName: String(item.mdprNm || item.itemNm || item.korNm || ''),
    manufacturer: String(item.mnfctCmpNm || item.entpNm || ''),
    effectiveDate: String(item.adtstaDd || item.staDd || ''),
    specification: String(item.spcfNm || item.spec || ''),
    dosageRoute: String(item.doseFrmNm || item.doseRoute || ''),
    payType: String(item.payTpNm || ''),
    unitPrice: Number(item.unprc || item.dgamt || 0),
    upperLimit: Number(item.uplmtAmt || item.unprc || 0),
    mainIngredientCode: String(item.mainImgrdCd || item.gnrlNmCd || ''),
    category,
  };
}

/** 품목명으로 약가 검색 */
export async function searchDrugPriceByName(productName: string): Promise<DrugPriceInfo[]> {
  const { items } = await getDgamtList({ mdprNm: productName });
  return items.map(i => toDrugPriceInfo(i, '일반'));
}

/** 제품코드로 약가 검색 */
export async function searchDrugPriceByCode(productCode: string): Promise<DrugPriceInfo[]> {
  const { items } = await getDgamtList({ mdprCd: productCode });
  return items.map(i => toDrugPriceInfo(i, '일반'));
}

/** 제조업체명으로 약가 검색 */
export async function searchDrugPriceByManufacturer(manufacturer: string): Promise<DrugPriceInfo[]> {
  const { items } = await getDgamtList({ mnfctCmpNm: manufacturer });
  return items.map(i => toDrugPriceInfo(i, '일반'));
}

/** 한방약가 검색 */
export async function searchOrientalDrugPrice(productName: string): Promise<DrugPriceInfo[]> {
  const { items } = await getCmdcDgamtList({ mdprNm: productName });
  return items.map(i => toDrugPriceInfo(i, '한방'));
}

/** 일반+한방 통합 약가 검색 */
export async function searchAllDrugPrices(productName: string): Promise<DrugPriceInfo[]> {
  const [general, oriental] = await Promise.all([
    searchDrugPriceByName(productName),
    searchOrientalDrugPrice(productName),
  ]);
  return [...general, ...oriental];
}

/** 약가 종합 분석 */
export function analyzeDrugPrices(products: DrugPriceInfo[]): DrugPriceAnalysis {
  // 제조업체별 통계
  const mfrMap = new Map<string, { count: number; totalPrice: number }>();
  products.forEach(p => {
    const key = p.manufacturer || '미상';
    const existing = mfrMap.get(key) || { count: 0, totalPrice: 0 };
    existing.count++;
    existing.totalPrice += p.unitPrice;
    mfrMap.set(key, existing);
  });
  const byManufacturer = Array.from(mfrMap.entries())
    .map(([manufacturer, data]) => ({
      manufacturer,
      count: data.count,
      avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 투여경로별 통계
  const routeMap = new Map<string, { count: number; totalPrice: number }>();
  products.forEach(p => {
    const key = p.dosageRoute || '미상';
    const existing = routeMap.get(key) || { count: 0, totalPrice: 0 };
    existing.count++;
    existing.totalPrice += p.unitPrice;
    routeMap.set(key, existing);
  });
  const byDosageRoute = Array.from(routeMap.entries())
    .map(([route, data]) => ({
      route,
      count: data.count,
      avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 급여 통계
  const covered = products.filter(p => p.payType.includes('급여') && !p.payType.includes('비급여'));
  const uncovered = products.filter(p => p.payType.includes('비급여'));

  // 가격 범위
  const prices = products.map(p => p.unitPrice).filter(p => p > 0);
  const sorted = [...prices].sort((a, b) => a - b);

  return {
    keyword: '',
    totalProducts: products.length,
    products,
    byManufacturer,
    byDosageRoute,
    coverageStats: {
      coveredCount: covered.length,
      uncoveredCount: uncovered.length,
      coveredRate: products.length > 0 ? Math.round((covered.length / products.length) * 10000) / 100 : 0,
    },
    priceRange: {
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      avg: prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0,
      median: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0,
    },
  };
}

/** 상위 N개 (약가 기준) */
export function getTopNByPrice(products: DrugPriceInfo[], n = 10): DrugPriceInfo[] {
  return [...products].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, n);
}

/** 같은 주성분 경쟁 약품 검색 */
export async function findCompetitorsByIngredient(mainIngredientCode: string): Promise<DrugPriceInfo[]> {
  const { items } = await getDgamtList({ mainImgrdCd: mainIngredientCode, numOfRows: 500 });
  return items.map(i => toDrugPriceInfo(i, '일반'));
}
