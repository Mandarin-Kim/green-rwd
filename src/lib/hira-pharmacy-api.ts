/**
 * HIRA 약국정보서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 약국정보서비스 1개 엔드포인트 지원
 *
 * 엔드포인트:
 * 1. getParmacyBasisList - 약국기본목록 (약국명, 주소, 전화번호, URL)
 *
 * 검색 조건: 시도, 시군구, 읍면동, 약국명, 종별코드
 * 활용: 보고서에서 지역별 약국 분포, 처방전 유통 채널 분석
 */

// ============================================
// 타입 정의
// ============================================

/** 약국 기본 정보 */
export interface PharmacyInfo {
  ykiho: string;              // 암호화된 요양기호
  pharmacyName: string;       // 약국명
  classCode: string;          // 종별코드
  className: string;          // 종별코드명
  sidoCode: string;           // 시도코드
  sidoName: string;           // 시도명
  sgguCode: string;           // 시군구코드
  sgguName: string;           // 시군구명
  emdongName: string;         // 읍면동명
  postNo: string;             // 우편번호
  address: string;            // 주소
  phone: string;              // 전화번호
  website: string;            // 홈페이지
  establishDate: string;      // 개설일자 (YYYYMMDD)
}

/** 약국 검색 조건 */
export interface PharmacySearchParams {
  sidoCd?: string;            // 시도코드
  sgguCd?: string;            // 시군구코드
  emdongNm?: string;          // 읍면동명
  yadmNm?: string;            // 약국명 (UTF-8 인코딩)
  clCd?: string;              // 종별코드
  numOfRows?: number;
  pageNo?: number;
}

/** 약국 지역별 통계 */
export interface PharmacyRegionStats {
  regionName: string;
  regionCode: string;
  pharmacyCount: number;
}

// ============================================
// 시도코드 매핑
// ============================================

export const SIDO_CODES: Record<string, string> = {
  '110000': '서울', '210000': '부산', '220000': '인천', '230000': '대구',
  '240000': '광주', '250000': '대전', '260000': '울산', '290000': '세종',
  '310000': '경기', '320000': '강원', '330000': '충북', '340000': '충남',
  '350000': '전북', '360000': '전남', '370000': '경북', '380000': '경남',
  '390000': '제주',
};

// ============================================
// API 설정
// ============================================

const PHARMACY_ENDPOINT = process.env.HIRA_PHARMACY_API_ENDPOINT || 'https://apis.data.go.kr/B551182/pharmacyInfoService';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callPharmacyApi(
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

    const url = `${PHARMACY_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA Pharmacy API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA Pharmacy API 실패 (${operation}):`, err);
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
// 엔드포인트 함수
// ============================================

/** 약국기본목록 조회 */
export const getParmacyBasisList = (params: PharmacySearchParams = {}) =>
  callPharmacyApi('getParmacyBasisList', {
    numOfRows: params.numOfRows || 100,
    pageNo: params.pageNo || 1,
    ...(params.sidoCd && { sidoCd: params.sidoCd }),
    ...(params.sgguCd && { sgguCd: params.sgguCd }),
    ...(params.emdongNm && { emdongNm: params.emdongNm }),
    ...(params.yadmNm && { yadmNm: params.yadmNm }),
    ...(params.clCd && { clCd: params.clCd }),
  });

// ============================================
// 리포트용 분석 함수
// ============================================

/** XML 응답 → PharmacyInfo 변환 */
function toPharmacyInfo(item: Record<string, string | number>): PharmacyInfo {
  return {
    ykiho: String(item.ykiho || ''),
    pharmacyName: String(item.yadmNm || ''),
    classCode: String(item.clCd || ''),
    className: String(item.clCdNm || ''),
    sidoCode: String(item.sidoCd || ''),
    sidoName: String(item.sidoCdNm || ''),
    sgguCode: String(item.sgguCd || ''),
    sgguName: String(item.sgguCdNm || ''),
    emdongName: String(item.emdongNm || ''),
    postNo: String(item.postNo || ''),
    address: String(item.addr || ''),
    phone: String(item.telno || ''),
    website: String(item.hospUrl || ''),
    establishDate: String(item.estbDd || ''),
  };
}

/** 약국명으로 검색 */
export async function searchPharmaciesByName(name: string): Promise<PharmacyInfo[]> {
  const { items } = await getParmacyBasisList({ yadmNm: name });
  return items.map(toPharmacyInfo);
}

/** 시도별 약국 조회 */
export async function getPharmaciesByRegion(sidoCd: string): Promise<PharmacyInfo[]> {
  const { items } = await getParmacyBasisList({ sidoCd, numOfRows: 1000 });
  return items.map(toPharmacyInfo);
}

/** 전체 시도별 약국 수 통계 (17개 시도 병렬 조회) */
export async function getPharmacyCountByAllRegions(): Promise<PharmacyRegionStats[]> {
  const sidoCodes = Object.keys(SIDO_CODES);
  const results = await Promise.all(
    sidoCodes.map(async (code) => {
      const { totalCount } = await getParmacyBasisList({ sidoCd: code, numOfRows: 1 });
      return {
        regionName: SIDO_CODES[code],
        regionCode: code,
        pharmacyCount: totalCount,
      };
    })
  );
  return results.sort((a, b) => b.pharmacyCount - a.pharmacyCount);
}

/** 약국 목록에서 지역별 통계 생성 */
export function calculatePharmacyStats(pharmacies: PharmacyInfo[]): {
  totalPharmacies: number;
  byRegion: PharmacyRegionStats[];
  bySggu: { sgguName: string; count: number }[];
} {
  const totalPharmacies = pharmacies.length;

  // 시도별 통계
  const regionMap = new Map<string, number>();
  pharmacies.forEach(p => {
    const key = p.sidoName || '기타';
    regionMap.set(key, (regionMap.get(key) || 0) + 1);
  });
  const byRegion = Array.from(regionMap.entries())
    .map(([regionName, pharmacyCount]) => ({ regionName, regionCode: '', pharmacyCount }))
    .sort((a, b) => b.pharmacyCount - a.pharmacyCount);

  // 시군구별 통계
  const sgguMap = new Map<string, number>();
  pharmacies.forEach(p => {
    const key = `${p.sidoName} ${p.sgguName}`.trim() || '기타';
    sgguMap.set(key, (sgguMap.get(key) || 0) + 1);
  });
  const bySggu = Array.from(sgguMap.entries())
    .map(([sgguName, count]) => ({ sgguName, count }))
    .sort((a, b) => b.count - a.count);

  return { totalPharmacies, byRegion, bySggu };
}
