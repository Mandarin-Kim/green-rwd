/**
 * HIRA 포괄수가 질병군별도보상항목조회서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 질병군별도보상항목조회서비스 4개 엔드포인트
 *
 * 엔드포인트 목록:
 * 1. drgSeparateCompensationMdfeeList     - 질병군 별도보상 행위수가 항목 조회 (수가코드, 단가, 준용명, 적용일, 응급/외과/가산수가)
 * 2. drgSeparateCompensateBhvMdfeeList    - 질병군 별도보상 항목 조회(행위) (별도산정 가능한 행위 목록)
 * 3. drgSeparateCompensationMcatList      - 질병군 별도보상 치료재료대 항목 조회 (치료재료 중분류목록)
 * 4. drgSeparateCompensateMcatInfoList    - 질병군 별도보상 항목 조회(치료재료) (치료재료목록 조회)
 *
 * 활용: DRG 포괄수가 적용 병원에서의 별도보상 항목 분석,
 *       치료재료/행위별 비용 구조 파악, 보고서에서 비용 분석 심화
 */

// ============================================
// 타입 정의
// ============================================

/** 별도보상 행위수가 항목 */
export interface DrgMdfeeItem {
  feeCode: string;             // 수가코드
  feeName: string;             // 수가명
  referenceName: string;       // 준용명
  unitPrice: number;           // 단가 (원)
  effectiveDate: string;       // 적용시작일자
  emergencyFee: number;        // 응급수가
  surgicalFee: number;         // 외과수가
  additionalFee: number;       // 가산수가
  payType: string;             // 급여구분
}

/** 별도보상 행위 항목 */
export interface DrgBehaviorItem {
  behaviorCode: string;        // 행위코드
  behaviorName: string;        // 행위명
  categoryCode: string;        // 분류코드
  categoryName: string;        // 분류명
}

/** 별도보상 치료재료 중분류 */
export interface DrgMaterialCategory {
  categoryCode: string;        // 중분류코드
  categoryName: string;        // 중분류명
  itemCount: number;           // 소속 품목 수
}

/** 별도보상 치료재료 항목 */
export interface DrgMaterialItem {
  materialCode: string;        // 치료재료코드
  materialName: string;        // 치료재료명
  categoryCode: string;        // 중분류코드
  categoryName: string;        // 중분류명
  unitPrice: number;           // 단가
  manufacturer: string;        // 제조업체명
  payType: string;             // 급여구분
}

/** DRG 별도보상 종합 분석 */
export interface DrgAnalysisResult {
  totalMdfeeItems: number;
  totalBehaviorItems: number;
  totalMaterialCategories: number;
  mdfeeItems: DrgMdfeeItem[];
  behaviorItems: DrgBehaviorItem[];
  materialCategories: DrgMaterialCategory[];
  avgUnitPrice: number;
  topExpensiveItems: DrgMdfeeItem[];
}

// ============================================
// API 설정
// ============================================

const DRG_ENDPOINT = process.env.HIRA_DRG_API_ENDPOINT || 'https://apis.data.go.kr/B551182/drgSeparateCompensationItemListService1';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callDrgApi(
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

    const url = `${DRG_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA DRG API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA DRG API 실패 (${operation}):`, err);
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
// 4개 엔드포인트 함수
// ============================================

/** 1. 질병군 별도보상 행위수가 항목 조회 */
export const getDrgSeparateCompensationMdfeeList = (p?: Record<string, string | number>) =>
  callDrgApi('drgSeparateCompensationMdfeeList', { numOfRows: 100, pageNo: 1, ...p });

/** 2. 질병군 별도보상 항목 조회(행위) */
export const getDrgSeparateCompensateBhvMdfeeList = (p?: Record<string, string | number>) =>
  callDrgApi('drgSeparateCompensateBhvMdfeeList', { numOfRows: 100, pageNo: 1, ...p });

/** 3. 질병군 별도보상 치료재료대 항목 조회 (중분류) */
export const getDrgSeparateCompensationMcatList = (p?: Record<string, string | number>) =>
  callDrgApi('drgSeparateCompensationMcatList', { numOfRows: 100, pageNo: 1, ...p });

/** 4. 질병군 별도보상 항목 조회(치료재료) */
export const getDrgSeparateCompensateMcatInfoList = (p?: Record<string, string | number>) =>
  callDrgApi('drgSeparateCompensateMcatInfoList', { numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** 별도보상 행위수가 항목 조회 → 정형화 */
export async function fetchDrgMdfeeItems(params?: Record<string, string | number>): Promise<DrgMdfeeItem[]> {
  const { items } = await getDrgSeparateCompensationMdfeeList(params);
  return items.map(i => ({
    feeCode: String(i.mdfeeCd || i.feeCd || ''),
    feeName: String(i.korNm || i.feeNm || ''),
    referenceName: String(i.jnynNm || i.refNm || ''),
    unitPrice: Number(i.unprc || i.amt || 0),
    effectiveDate: String(i.adtstaDd || ''),
    emergencyFee: Number(i.emrgFee || 0),
    surgicalFee: Number(i.surgFee || 0),
    additionalFee: Number(i.addFee || 0),
    payType: String(i.payTpNm || ''),
  }));
}

/** 별도보상 행위 항목 조회 → 정형화 */
export async function fetchDrgBehaviorItems(params?: Record<string, string | number>): Promise<DrgBehaviorItem[]> {
  const { items } = await getDrgSeparateCompensateBhvMdfeeList(params);
  return items.map(i => ({
    behaviorCode: String(i.bhvCd || i.mdfeeCd || ''),
    behaviorName: String(i.bhvNm || i.korNm || ''),
    categoryCode: String(i.catCd || i.clCd || ''),
    categoryName: String(i.catNm || i.clNm || ''),
  }));
}

/** 치료재료 중분류 조회 → 정형화 */
export async function fetchDrgMaterialCategories(params?: Record<string, string | number>): Promise<DrgMaterialCategory[]> {
  const { items } = await getDrgSeparateCompensationMcatList(params);
  return items.map(i => ({
    categoryCode: String(i.mcatCd || i.catCd || ''),
    categoryName: String(i.mcatNm || i.catNm || ''),
    itemCount: Number(i.cnt || i.itemCnt || 0),
  }));
}

/** 치료재료 항목 조회 → 정형화 */
export async function fetchDrgMaterialItems(params?: Record<string, string | number>): Promise<DrgMaterialItem[]> {
  const { items } = await getDrgSeparateCompensateMcatInfoList(params);
  return items.map(i => ({
    materialCode: String(i.mcatCd || i.matCd || ''),
    materialName: String(i.mcatNm || i.matNm || i.korNm || ''),
    categoryCode: String(i.catCd || i.clCd || ''),
    categoryName: String(i.catNm || i.clNm || ''),
    unitPrice: Number(i.unprc || i.amt || 0),
    manufacturer: String(i.mnfctCmpNm || i.entpNm || ''),
    payType: String(i.payTpNm || ''),
  }));
}

/** DRG 별도보상 종합 분석 */
export async function fetchDrgAnalysis(): Promise<DrgAnalysisResult> {
  const [mdfeeItems, behaviorItems, materialCategories] = await Promise.all([
    fetchDrgMdfeeItems({ numOfRows: 500 }),
    fetchDrgBehaviorItems({ numOfRows: 500 }),
    fetchDrgMaterialCategories({ numOfRows: 500 }),
  ]);

  const prices = mdfeeItems.map(m => m.unitPrice).filter(p => p > 0);
  const avgUnitPrice = prices.length > 0
    ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    : 0;

  return {
    totalMdfeeItems: mdfeeItems.length,
    totalBehaviorItems: behaviorItems.length,
    totalMaterialCategories: materialCategories.length,
    mdfeeItems,
    behaviorItems,
    materialCategories,
    avgUnitPrice,
    topExpensiveItems: [...mdfeeItems].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, 10),
  };
}

/** 단가 높은 순 정렬 */
export function getTopNByPrice(items: DrgMdfeeItem[], n = 10): DrgMdfeeItem[] {
  return [...items].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, n);
}
