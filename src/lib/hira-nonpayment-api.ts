/**
 * HIRA 비급여진료비정보조회서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 비급여진료비정보조회서비스 7개 엔드포인트
 *
 * 엔드포인트 목록:
 * 1. getNonPaymentItemHospDtlList  - 비급여항목병원목록상세 (16.3월 이후, 병원별 가격정보 상세)
 * 2. getNonPaymentItemHospList2    - 비급여항목병원목록요약 (16.3월 이후, 병원별 가격정보 요약)
 * 3. getNonPaymentItemCodeList2    - 비급여항목코드조회 (16.3월 이후, 비급여 항목코드 목록)
 * 4. getNonPaymentItemCodeList     - 비급여항목코드조회 (16.2월 이전)
 * 5. getNonPaymentItemHospList     - 비급여항목병원목록 (16.2월 이전)
 * 6. getNonPaymentItemClcdList     - 비급여진료비용종별정보 (병원 종별 가격 통계)
 * 7. getNonPaymentItemSidoCdList   - 비급여진료비용지역별정보 (시도별 가격 통계)
 *
 * 활용: 비급여 시장 규모 분석, 병원별/지역별/종별 비급여 가격 비교,
 *       급여 전환 가능성 분석, 비급여 항목별 가격 편차 분석
 */

// ============================================
// 타입 정의
// ============================================

/** 비급여 항목코드 정보 */
export interface NonPaymentItemCode {
  itemCode: string;            // 비급여 항목코드
  itemName: string;            // 비급여 항목명
  categoryCode: string;        // 분류코드
  categoryName: string;        // 분류명
}

/** 비급여 병원별 가격 상세 */
export interface NonPaymentHospitalDetail {
  itemCode: string;            // 비급여 항목코드
  itemName: string;            // 비급여 항목명
  ykiho: string;               // 암호화된 요양기호
  hospitalName: string;        // 병원명
  classCode: string;           // 종별코드
  className: string;           // 종별코드명
  sidoCode: string;            // 시도코드
  sidoName: string;            // 시도명
  price: number;               // 비급여 가격 (원)
  minPrice: number;            // 최저가
  maxPrice: number;            // 최고가
  effectiveDate: string;       // 적용시작일자
}

/** 비급여 병원별 가격 요약 */
export interface NonPaymentHospitalSummary {
  itemCode: string;
  itemName: string;
  hospitalName: string;
  className: string;
  sidoName: string;
  price: number;
  effectiveDate: string;
}

/** 비급여 종별 가격 통계 */
export interface NonPaymentByClassStats {
  itemCode: string;
  itemName: string;
  classCode: string;
  className: string;
  avgPrice: number;            // 평균가
  minPrice: number;            // 최저가
  maxPrice: number;            // 최고가
  hospitalCount: number;       // 해당 종별 병원 수
}

/** 비급여 지역별 가격 통계 */
export interface NonPaymentByRegionStats {
  itemCode: string;
  itemName: string;
  sidoCode: string;
  sidoName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  hospitalCount: number;
}

/** 비급여 항목 종합 분석 */
export interface NonPaymentAnalysisResult {
  itemCode: string;
  itemName: string;
  totalHospitals: number;
  overallAvgPrice: number;
  priceRange: { min: number; max: number };
  byClass: NonPaymentByClassStats[];
  byRegion: NonPaymentByRegionStats[];
  priceVariation: number;      // 가격 편차율 (%)
}

// ============================================
// API 설정
// ============================================

const NONPAYMENT_ENDPOINT = process.env.HIRA_NONPAYMENT_API_ENDPOINT || 'https://apis.data.go.kr/B551182/nonPaymentDamtInfoService';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callNonPaymentApi(
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

    const url = `${NONPAYMENT_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA NonPayment API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA NonPayment API 실패 (${operation}):`, err);
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
// 7개 엔드포인트 함수
// ============================================

/** 1. 비급여항목병원목록상세 (16.3월 이후) */
export const getNonPaymentItemHospDtlList = (p: Record<string, string | number>) =>
  callNonPaymentApi('getNonPaymentItemHospDtlList', { numOfRows: 100, pageNo: 1, ...p });

/** 2. 비급여항목병원목록요약 (16.3월 이후) */
export const getNonPaymentItemHospList2 = (p: Record<string, string | number>) =>
  callNonPaymentApi('getNonPaymentItemHospList2', { numOfRows: 100, pageNo: 1, ...p });

/** 3. 비급여항목코드조회 (16.3월 이후) */
export const getNonPaymentItemCodeList2 = (p?: Record<string, string | number>) =>
  callNonPaymentApi('getNonPaymentItemCodeList2', { numOfRows: 100, pageNo: 1, ...p });

/** 4. 비급여항목코드조회 (16.2월 이전) */
export const getNonPaymentItemCodeList = (p?: Record<string, string | number>) =>
  callNonPaymentApi('getNonPaymentItemCodeList', { numOfRows: 100, pageNo: 1, ...p });

/** 5. 비급여항목병원목록 (16.2월 이전) */
export const getNonPaymentItemHospList = (p: Record<string, string | number>) =>
  callNonPaymentApi('getNonPaymentItemHospList', { numOfRows: 100, pageNo: 1, ...p });

/** 6. 비급여진료비용종별정보 (병원 종별 가격 통계) */
export const getNonPaymentItemClcdList = (p: Record<string, string | number>) =>
  callNonPaymentApi('getNonPaymentItemClcdList', { numOfRows: 100, pageNo: 1, ...p });

/** 7. 비급여진료비용지역별정보 (시도별 가격 통계) */
export const getNonPaymentItemSidoCdList = (p: Record<string, string | number>) =>
  callNonPaymentApi('getNonPaymentItemSidoCdList', { numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** 비급여 항목코드 검색 (최신) */
export async function searchNonPaymentCodes(keyword?: string): Promise<NonPaymentItemCode[]> {
  const params: Record<string, string | number> = { numOfRows: 500 };
  if (keyword) params.npayKorNm = keyword;
  const { items } = await getNonPaymentItemCodeList2(params);
  return items.map(i => ({
    itemCode: String(i.npayKorCd || i.npayCd || ''),
    itemName: String(i.npayKorNm || i.npayNm || ''),
    categoryCode: String(i.clCd || i.catCd || ''),
    categoryName: String(i.clCdNm || i.catNm || ''),
  }));
}

/** 비급여 항목의 병원별 가격 상세 조회 */
export async function fetchNonPaymentHospitalDetails(
  npayKorCd: string,
  options?: { sidoCd?: string; clCd?: string }
): Promise<NonPaymentHospitalDetail[]> {
  const params: Record<string, string | number> = { npayKorCd, numOfRows: 500 };
  if (options?.sidoCd) params.sidoCd = options.sidoCd;
  if (options?.clCd) params.clCd = options.clCd;

  const { items } = await getNonPaymentItemHospDtlList(params);
  return items.map(i => ({
    itemCode: String(i.npayKorCd || i.npayCd || ''),
    itemName: String(i.npayKorNm || i.npayNm || ''),
    ykiho: String(i.ykiho || ''),
    hospitalName: String(i.yadmNm || ''),
    classCode: String(i.clCd || ''),
    className: String(i.clCdNm || ''),
    sidoCode: String(i.sidoCd || ''),
    sidoName: String(i.sidoCdNm || ''),
    price: Number(i.curAmt || i.npayAmt || 0),
    minPrice: Number(i.minAmt || i.curAmt || 0),
    maxPrice: Number(i.maxAmt || i.curAmt || 0),
    effectiveDate: String(i.adtstaDd || ''),
  }));
}

/** 비급여 항목의 종별 가격 통계 */
export async function fetchNonPaymentByClass(npayKorCd: string): Promise<NonPaymentByClassStats[]> {
  const { items } = await getNonPaymentItemClcdList({ npayKorCd });
  return items.map(i => ({
    itemCode: String(i.npayKorCd || i.npayCd || ''),
    itemName: String(i.npayKorNm || i.npayNm || ''),
    classCode: String(i.clCd || ''),
    className: String(i.clCdNm || ''),
    avgPrice: Number(i.avgAmt || i.curAmt || 0),
    minPrice: Number(i.minAmt || 0),
    maxPrice: Number(i.maxAmt || 0),
    hospitalCount: Number(i.hospCnt || i.cnt || 0),
  }));
}

/** 비급여 항목의 지역별 가격 통계 */
export async function fetchNonPaymentByRegion(npayKorCd: string): Promise<NonPaymentByRegionStats[]> {
  const { items } = await getNonPaymentItemSidoCdList({ npayKorCd });
  return items.map(i => ({
    itemCode: String(i.npayKorCd || i.npayCd || ''),
    itemName: String(i.npayKorNm || i.npayNm || ''),
    sidoCode: String(i.sidoCd || ''),
    sidoName: String(i.sidoCdNm || ''),
    avgPrice: Number(i.avgAmt || i.curAmt || 0),
    minPrice: Number(i.minAmt || 0),
    maxPrice: Number(i.maxAmt || 0),
    hospitalCount: Number(i.hospCnt || i.cnt || 0),
  }));
}

/** 비급여 항목 종합 분석 (종별 + 지역별 병렬 조회) */
export async function fetchNonPaymentAnalysis(npayKorCd: string): Promise<NonPaymentAnalysisResult> {
  const [byClass, byRegion] = await Promise.all([
    fetchNonPaymentByClass(npayKorCd),
    fetchNonPaymentByRegion(npayKorCd),
  ]);

  const totalHospitals = byClass.reduce((s, c) => s + c.hospitalCount, 0);
  const allAvgs = byClass.filter(c => c.avgPrice > 0).map(c => c.avgPrice);
  const overallAvg = allAvgs.length > 0
    ? Math.round(allAvgs.reduce((s, a) => s + a, 0) / allAvgs.length)
    : 0;

  const allMin = byClass.filter(c => c.minPrice > 0).map(c => c.minPrice);
  const allMax = byClass.map(c => c.maxPrice);
  const minPrice = allMin.length > 0 ? Math.min(...allMin) : 0;
  const maxPrice = allMax.length > 0 ? Math.max(...allMax) : 0;

  // 가격 편차율 = (최고가 - 최저가) / 평균가 * 100
  const priceVariation = overallAvg > 0
    ? Math.round(((maxPrice - minPrice) / overallAvg) * 10000) / 100
    : 0;

  return {
    itemCode: npayKorCd,
    itemName: byClass[0]?.itemName || byRegion[0]?.itemName || '미상',
    totalHospitals,
    overallAvgPrice: overallAvg,
    priceRange: { min: minPrice, max: maxPrice },
    byClass,
    byRegion,
    priceVariation,
  };
}

/** 가격이 높은 순 정렬 */
export function sortByPriceDesc<T extends { avgPrice: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.avgPrice - a.avgPrice);
}

/** 가격 편차가 큰 순 정렬 (비급여 가격 투명성 분석용) */
export function sortByPriceVariation(items: NonPaymentByClassStats[]): NonPaymentByClassStats[] {
  return [...items].sort((a, b) => {
    const varA = a.avgPrice > 0 ? (a.maxPrice - a.minPrice) / a.avgPrice : 0;
    const varB = b.avgPrice > 0 ? (b.maxPrice - b.minPrice) / b.avgPrice : 0;
    return varB - varA;
  });
}
