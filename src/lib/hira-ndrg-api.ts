/**
 * HIRA 신포괄기준정보조회서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 신포괄기준정보조회서비스 1개 엔드포인트
 *
 * 엔드포인트:
 * 1. getNdrgPayList - 신포괄급여목록조회
 *    (분류코드(행위/약제/치료재료), 신포괄품목 포괄구분코드, 적용시작일자, 적용종료일자)
 *
 * 활용: 신포괄수가 적용 품목 파악, 포괄/비포괄 분류 현황,
 *       약제/치료재료 급여 적용 기간 분석, DRG 분석과 연계
 */

// ============================================
// 타입 정의
// ============================================

/** 신포괄급여 항목 정보 */
export interface NdrgPayItem {
  classificationCode: string;  // 분류코드
  classificationName: string;  // 분류명
  itemType: string;            // 품목유형 (행위/약제/치료재료)
  itemTypeCode: string;        // 품목유형코드
  inclusionCode: string;       // 포괄구분코드
  inclusionName: string;       // 포괄구분명 (포괄/비포괄)
  effectiveStartDate: string;  // 적용시작일자 (YYYYMMDD)
  effectiveEndDate: string;    // 적용종료일자 (YYYYMMDD)
  isActive: boolean;           // 현재 유효 여부
}

/** 검색 조건 */
export interface NdrgSearchParams {
  clsCd?: string;              // 분류코드
  ndrgDivCd?: string;          // 포괄구분코드
  numOfRows?: number;
  pageNo?: number;
}

/** 신포괄 급여 통계 */
export interface NdrgStats {
  totalItems: number;
  byItemType: { type: string; count: number }[];
  byInclusion: { inclusion: string; count: number }[];
  activeCount: number;
  expiredCount: number;
}

// ============================================
// API 설정
// ============================================

const NDRG_ENDPOINT = process.env.HIRA_NDRG_API_ENDPOINT || 'https://apis.data.go.kr/B551182/NdrgStdInfoService';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callNdrgApi(
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

    const url = `${NDRG_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA NDRG API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA NDRG API 실패 (${operation}):`, err);
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
// 엔드포인트 함수
// ============================================

/** 신포괄급여목록조회 */
export const getNdrgPayList = (p?: Record<string, string | number>) =>
  callNdrgApi('getNdrgPayList', { numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** XML → NdrgPayItem 변환 */
function toNdrgPayItem(item: Record<string, string | number>): NdrgPayItem {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const endDate = String(item.adtendDd || item.endDd || '99991231');

  return {
    classificationCode: String(item.clsCd || item.mdfeeCd || ''),
    classificationName: String(item.clsNm || item.korNm || ''),
    itemType: String(item.ndrgDivNm || item.typNm || ''),
    itemTypeCode: String(item.ndrgDivCd || item.typCd || ''),
    inclusionCode: String(item.ndrgInclCd || item.inclCd || ''),
    inclusionName: String(item.ndrgInclNm || item.inclNm || ''),
    effectiveStartDate: String(item.adtstaDd || item.staDd || ''),
    effectiveEndDate: endDate,
    isActive: endDate >= today,
  };
}

/** 분류코드로 검색 */
export async function searchNdrgByCode(clsCd: string): Promise<NdrgPayItem[]> {
  const { items } = await getNdrgPayList({ clsCd });
  return items.map(toNdrgPayItem);
}

/** 전체 신포괄 목록 조회 */
export async function fetchAllNdrgItems(numOfRows = 500): Promise<NdrgPayItem[]> {
  const { items } = await getNdrgPayList({ numOfRows });
  return items.map(toNdrgPayItem);
}

/** 포괄구분별 조회 */
export async function searchNdrgByInclusion(ndrgDivCd: string): Promise<NdrgPayItem[]> {
  const { items } = await getNdrgPayList({ ndrgDivCd, numOfRows: 500 });
  return items.map(toNdrgPayItem);
}

/** 신포괄 급여 통계 */
export function analyzeNdrgStats(ndrgItems: NdrgPayItem[]): NdrgStats {
  // 품목유형별
  const typeMap = new Map<string, number>();
  ndrgItems.forEach(i => {
    const key = i.itemType || '미분류';
    typeMap.set(key, (typeMap.get(key) || 0) + 1);
  });

  // 포괄구분별
  const inclMap = new Map<string, number>();
  ndrgItems.forEach(i => {
    const key = i.inclusionName || '미분류';
    inclMap.set(key, (inclMap.get(key) || 0) + 1);
  });

  return {
    totalItems: ndrgItems.length,
    byItemType: Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    byInclusion: Array.from(inclMap.entries())
      .map(([inclusion, count]) => ({ inclusion, count }))
      .sort((a, b) => b.count - a.count),
    activeCount: ndrgItems.filter(i => i.isActive).length,
    expiredCount: ndrgItems.filter(i => !i.isActive).length,
  };
}
