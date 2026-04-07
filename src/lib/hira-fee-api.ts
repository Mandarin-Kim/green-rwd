/**
 * HIRA 수가기준정보조회서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 수가기준정보조회서비스 3개 엔드포인트 지원
 *
 * 엔드포인트 목록:
 * 1. getPharmacyMdfeeList - 약국수가목록조회 (약국 수가코드, 급여구분, 단가)
 * 2. getCmdcMdfeeList - 한방수가목록조회 (한방 수가코드, 급여구분, 단가)
 * 3. getDiagnossMdfeeList - 진료수가목록조회 (진료 수가코드, 급여구분, 단가)
 *
 * 활용: 약품/진료행위의 단가, 급여/비급여 구분, 상대가치점수 파악
 *       → 시장 보고서에서 비용 분석, 급여 적용 현황 등에 활용
 */

// ============================================
// 타입 정의
// ============================================

/** 수가 기본 정보 (공통) */
export interface MedicalFeeInfo {
  feeCode: string;           // 수가코드 (mdfeeCd)
  feeName: string;           // 한글명 (korNm)
  feeDivNo: string;          // 수가분류번호 (mdfeeDivNo)
  payTypeName: string;       // 급여구분명 (급여/비급여) (payTpNm)
  unitPrice: number;         // 적용단가 (원) (unprc)
  relativeValuePoint: number; // 상대가치점수 (cvalPnt)
  effectiveDate: string;     // 적용시작일자 (YYYYMMDD) (adtstaDd)
  category: '약국' | '한방' | '진료'; // 수가 분류
}

/** 수가 검색 결과 (페이징 포함) */
export interface FeeSearchResult {
  items: MedicalFeeInfo[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
}

/** 수가 비교 분석 결과 */
export interface FeeComparisonResult {
  feeCode: string;
  feeName: string;
  pharmacyFee: MedicalFeeInfo | null;
  orientalFee: MedicalFeeInfo | null;
  diagnosisFee: MedicalFeeInfo | null;
  avgUnitPrice: number;
  isCovered: boolean;        // 급여 적용 여부
}

// ============================================
// API 설정
// ============================================

const FEE_ENDPOINT = process.env.HIRA_FEE_API_ENDPOINT || 'https://apis.data.go.kr/B551182/mdfeeCrtrInfoService';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callFeeApi(
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
    Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)));

    const url = `${FEE_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA Fee API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA Fee API 실패 (${operation}):`, err);
    return { items: [], totalCount: 0 };
  }
}

// ============================================
// XML 파싱 (외부 라이브러리 없이)
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
// 3개 엔드포인트 함수
// ============================================

/** 1. 약국수가목록조회 */
export const getPharmacyMdfeeList = (p?: Record<string, string | number>) =>
  callFeeApi('getPharmacyMdfeeList', { numOfRow: 100, pageNo: 1, ...p });

/** 2. 한방수가목록조회 */
export const getCmdcMdfeeList = (p?: Record<string, string | number>) =>
  callFeeApi('getCmdcMdfeeList', { numOfRow: 100, pageNo: 1, ...p });

/** 3. 진료수가목록조회 */
export const getDiagnossMdfeeList = (p?: Record<string, string | number>) =>
  callFeeApi('getDiagnossMdfeeList', { numOfRow: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** 항목을 MedicalFeeInfo로 변환 (공통) */
function toFeeInfo(item: Record<string, string | number>, category: '약국' | '한방' | '진료'): MedicalFeeInfo {
  return {
    feeCode: String(item.mdfeeCd || ''),
    feeName: String(item.korNm || ''),
    feeDivNo: String(item.mdfeeDivNo || ''),
    payTypeName: String(item.payTpNm || ''),
    unitPrice: Number(item.unprc || 0),
    relativeValuePoint: Number(item.cvalPnt || 0),
    effectiveDate: String(item.adtstaDd || ''),
    category,
  };
}

/** 수가코드로 약국수가 조회 */
export async function searchPharmacyFee(params: { mdfeeCd?: string; korNm?: string; mdfeeDivNo?: string }): Promise<MedicalFeeInfo[]> {
  const { items } = await getPharmacyMdfeeList(params as Record<string, string>);
  return items.map(i => toFeeInfo(i, '약국'));
}

/** 수가코드로 한방수가 조회 */
export async function searchOrientalFee(params: { mdfeeCd?: string; korNm?: string; mdfeeDivNo?: string }): Promise<MedicalFeeInfo[]> {
  const { items } = await getCmdcMdfeeList(params as Record<string, string>);
  return items.map(i => toFeeInfo(i, '한방'));
}

/** 수가코드로 진료수가 조회 */
export async function searchDiagnosisFee(params: { mdfeeCd?: string; korNm?: string; mdfeeDivNo?: string }): Promise<MedicalFeeInfo[]> {
  const { items } = await getDiagnossMdfeeList(params as Record<string, string>);
  return items.map(i => toFeeInfo(i, '진료'));
}

/** 한글명으로 전체 수가 통합 검색 (약국+한방+진료 병렬 조회) */
export async function searchAllFeesByName(korNm: string): Promise<MedicalFeeInfo[]> {
  const [pharmacy, oriental, diagnosis] = await Promise.all([
    searchPharmacyFee({ korNm }),
    searchOrientalFee({ korNm }),
    searchDiagnosisFee({ korNm }),
  ]);
  return [...pharmacy, ...oriental, ...diagnosis];
}

/** 수가코드로 전체 수가 통합 검색 */
export async function searchAllFeesByCode(mdfeeCd: string): Promise<MedicalFeeInfo[]> {
  const [pharmacy, oriental, diagnosis] = await Promise.all([
    searchPharmacyFee({ mdfeeCd }),
    searchOrientalFee({ mdfeeCd }),
    searchDiagnosisFee({ mdfeeCd }),
  ]);
  return [...pharmacy, ...oriental, ...diagnosis];
}

/** 급여/비급여 분류 통계 */
export function analyzeCoverageStats(fees: MedicalFeeInfo[]): {
  totalCount: number;
  coveredCount: number;
  uncoveredCount: number;
  coveredRate: number;
  avgCoveredPrice: number;
  avgUncoveredPrice: number;
} {
  const covered = fees.filter(f => f.payTypeName.includes('급여') && !f.payTypeName.includes('비급여'));
  const uncovered = fees.filter(f => f.payTypeName.includes('비급여'));

  const avgCovered = covered.length > 0
    ? Math.round(covered.reduce((s, f) => s + f.unitPrice, 0) / covered.length)
    : 0;
  const avgUncovered = uncovered.length > 0
    ? Math.round(uncovered.reduce((s, f) => s + f.unitPrice, 0) / uncovered.length)
    : 0;

  return {
    totalCount: fees.length,
    coveredCount: covered.length,
    uncoveredCount: uncovered.length,
    coveredRate: fees.length > 0 ? Math.round((covered.length / fees.length) * 10000) / 100 : 0,
    avgCoveredPrice: avgCovered,
    avgUncoveredPrice: avgUncovered,
  };
}

/** 단가 기준 상위 N개 */
export function getTopNByPrice(fees: MedicalFeeInfo[], n = 10): MedicalFeeInfo[] {
  return [...fees].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, n);
}

/** 상대가치점수 기준 상위 N개 */
export function getTopNByRelativeValue(fees: MedicalFeeInfo[], n = 10): MedicalFeeInfo[] {
  return [...fees].sort((a, b) => b.relativeValuePoint - a.relativeValuePoint).slice(0, n);
}
