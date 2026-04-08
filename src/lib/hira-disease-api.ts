/**
 * HIRA 질병정보서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 질병정보서비스 (data.go.kr #15119055)
 *
 * ★ 2026-04-08 data.go.kr Swagger UI에서 직접 확인한 정확한 오퍼레이션명 5개:
 * 1. getDissNameCodeList1       - 질병명칭/코드조회
 * 2. getDissByHsptlzFrgnStats1  - 질병입원외래별통계
 * 3. getDissByGenderAgeStats1   - 질병성별연령별통계
 * 4. getDissByClassesStats1     - 질병의료기관종별통계
 * 5. getDissByAreaStats1        - 질병의료기관지역별통계
 *
 * 공통 요청 파라미터 (4개 통계 API 동일):
 * - serviceKey* (필수), numOfRows, pageNo
 * - year (연도, 예: "2023"), sickCd (상병코드)
 * - sickType (1:3단상병, 2:4단상병), medTp (1:양방, 2:한방)
 * ※ 주의: diagYm이 아닌 year 파라미터 사용!
 *
 * 응답 필드 (Swagger 확인):
 * - 공통: sickCd, sickNm, ptntCnt(환자수), vstDdcnt(내원일수), specCnt(명세서건수),
 *         rvdRpeTamtAmt(심사결정요양급여비용총액), rvdInsupBrdnAmt(보험자부담금)
 * - 입원외래별: sex(남/여), inpatOpat(입원외래구분)
 * - 성별연령별: sex(남/여), age(연령대)
 * - 의료기관종별: grade(의료기관종)
 * - 지역별: lcName(지역명)
 */

// ============================================
// 타입 정의
// ============================================

/** 질병 검색 결과 */
export interface DiseaseInfo {
  diseaseCode: string;       // 상병코드
  diseaseName: string;       // 상병명
  diseaseEngName: string;    // 영문명
  patientCount: number;      // 환자수
  visitCount: number;        // 내원일수
  claimAmount: number;       // 요양급여비용총액
}

/** 질병별 성별·입원/외래 통계 */
export interface DiseaseGenderStats {
  diseaseCode: string;
  diseaseName: string;
  gender: string;            // 남/여
  genderCode: string;        // M/F
  inpatientCount: number;    // 입원 환자수
  outpatientCount: number;   // 외래 환자수
  totalCount: number;        // 전체 환자수
  inpatientDays: number;     // 입원 내원일수
  outpatientDays: number;    // 외래 내원일수
  period: string;
}

/** 질병별 성별·연령대별 통계 */
export interface DiseaseAgeStats {
  diseaseCode: string;
  diseaseName: string;
  gender: string;
  ageGroup: string;          // 연령대 (0~9세, 10~19세, ...)
  ageGroupCode: string;
  patientCount: number;
  visitCount: number;
  claimAmount: number;
  period: string;
}

/** 질병별 의료기관종별 통계 */
export interface DiseaseInstitutionStats {
  diseaseCode: string;
  diseaseName: string;
  institutionType: string;   // 의료기관종 (상급종합, 종합병원, 병원, 의원 등)
  institutionTypeCode: string;
  patientCount: number;
  visitCount: number;
  claimAmount: number;
  period: string;
}

/** 질병별 지역별 통계 */
export interface DiseaseAreaStats {
  diseaseCode: string;
  diseaseName: string;
  regionName: string;        // 시도명
  regionCode: string;        // 시도코드
  patientCount: number;
  visitCount: number;
  claimAmount: number;
  patientRate: number;       // 환자 비율
  period: string;
}

/** 질병 종합분석 결과 */
export interface DiseaseAnalysisResult {
  diseaseCode: string;
  diseaseName: string;
  period: string;
  totalPatients: number;
  genderStats: DiseaseGenderStats[];
  ageDistribution: DiseaseAgeStats[];
  institutionStats: DiseaseInstitutionStats[];
  regionalStats: DiseaseAreaStats[];
  insights: {
    topAgeGroup: string;
    genderRatio: string;
    topRegion: string;
    topInstitution: string;
  };
}

// ============================================
// API 설정
// ============================================

const DISEASE_ENDPOINT = 'https://apis.data.go.kr/B551182/diseaseInfoService1';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callDiseaseApi(
  operation: string,
  params: Record<string, string | number>
): Promise<{ items: Record<string, string | number>[]; totalCount: number }> {
  if (!HIRA_KEY) {
    console.warn('[HIRA Disease] HIRA_API_KEY가 설정되지 않았습니다.');
    return { items: [], totalCount: 0 };
  }

  try {
    const searchParams = new URLSearchParams();
    searchParams.set('serviceKey', HIRA_KEY);
    Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)));

    const url = `${DISEASE_ENDPOINT}/${operation}?${searchParams.toString()}`;
    console.log(`[HIRA Disease] API 호출: ${operation}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[HIRA Disease] HTTP ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();

    // 에러 응답 체크
    const resultCodeMatch = xml.match(/<resultCode>(\d+)<\/resultCode>/);
    const resultCode = resultCodeMatch ? resultCodeMatch[1] : null;
    if (resultCode && resultCode !== '00') {
      const resultMsgMatch = xml.match(/<resultMsg>([^<]*)<\/resultMsg>/);
      console.error(`[HIRA Disease] API 에러 (${operation}): code=${resultCode}, msg=${resultMsgMatch?.[1] || 'unknown'}`);
      return { items: [], totalCount: 0 };
    }

    return parseXml(xml);
  } catch (err) {
    console.error(`[HIRA Disease] API 실패 (${operation}):`, err);
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
// 5개 오퍼레이션 함수 (수정된 API명)
// ============================================

/** 1. 질병명코드조회 - 질병명 또는 코드로 검색 */
export const getDissNameCodeList1 = (searchText: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissNameCodeList1', {
    sickType: 1,        // 1: 양방, 2: 한방
    medTp: 1,           // 1: 양방
    diseaseType: 'SICK_NM',  // SICK_NM: 질병명, SICK_CD: 질병코드
    searchText,
    numOfRows: 100,
    pageNo: 1,
    ...p,
  });

/** 질병코드로 검색 */
export const getDissNameCodeListByCode = (sickCd: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissNameCodeList1', {
    sickType: 1,
    medTp: 1,
    diseaseType: 'SICK_CD',
    searchText: sickCd,
    numOfRows: 100,
    pageNo: 1,
    ...p,
  });

/** 2. 질병입원외래별통계 (Swagger: getDissByHsptlzFrgnStats1) - 파라미터: year, sickCd, sickType, medTp */
export const getDissByHsptlzFrgnStats1 = (sickCd: string, year: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissByHsptlzFrgnStats1', { sickCd, year, sickType: 1, medTp: 1, numOfRows: 100, pageNo: 1, ...p });

/** 3. 질병성별연령별통계 (Swagger: getDissByGenderAgeStats1) - 파라미터: year, sickCd, sickType, medTp */
export const getDissByGenderAgeStats1 = (sickCd: string, year: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissByGenderAgeStats1', { sickCd, year, sickType: 1, medTp: 1, numOfRows: 100, pageNo: 1, ...p });

/** 4. 질병의료기관종별통계 (Swagger: getDissByClassesStats1) - 파라미터: year, sickCd, sickType, medTp */
export const getDissByClassesStats1 = (sickCd: string, year: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissByClassesStats1', { sickCd, year, sickType: 1, medTp: 1, numOfRows: 100, pageNo: 1, ...p });

/** 5. 질병의료기관지역별통계 (Swagger: getDissByAreaStats1) - 파라미터: year, sickCd, sickType, medTp */
export const getDissByAreaStats1 = (sickCd: string, year: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissByAreaStats1', { sickCd, year, sickType: 1, medTp: 1, numOfRows: 100, pageNo: 1, ...p });

// ── 하위호환: 기존 함수명 유지 (deprecated) ──
export const getDissInfoList = getDissNameCodeList1;
export const getDissGenderTpInfo = getDissByHsptlzFrgnStats1;
export const getDissGenderTpStats = getDissByHsptlzFrgnStats1;
export const getDissGenderAgeInfo = getDissByGenderAgeStats1;
export const getDissGenderAgeStats = getDissByGenderAgeStats1;
export const getDissItyInfo = getDissByClassesStats1;
export const getDissAreaInfo = getDissByAreaStats1;
export const getDissAreaStats = getDissByAreaStats1;

// ============================================
// 리포트용 분석 함수
// ============================================

/** 질병 검색 (자동완성 등에 활용) */
export async function searchDiseases(keyword: string): Promise<DiseaseInfo[]> {
  const { items } = await getDissNameCodeList1(keyword);
  return items.map(i => ({
    diseaseCode: String(i.sickCd || i.dissCd || ''),
    diseaseName: String(i.sickNm || i.dissNm || ''),
    diseaseEngName: String(i.sickEngNm || i.dissEngNm || ''),
    patientCount: Number(i.patntCnt || 0),
    visitCount: Number(i.rcptCnt || i.visnCnt || 0),
    claimAmount: Number(i.trsRcptAmt || 0),
  }));
}

/** 질병별 성별·입원/외래 현황 (Swagger 필드: sex, inpatOpat, ptntCnt, vstDdcnt, specCnt, rvdRpeTamtAmt, rvdInsupBrdnAmt) */
export async function fetchDiseaseGenderStats(sickCd: string, year = '2023'): Promise<DiseaseGenderStats[]> {
  const { items } = await getDissByHsptlzFrgnStats1(sickCd, year);

  // 입원/외래 × 성별로 데이터가 옴 → 성별 기준으로 집계
  const genderMap = new Map<string, DiseaseGenderStats>();
  for (const i of items) {
    const sex = String(i.sex || '');
    const genderCode = sex.includes('남') ? 'M' : sex.includes('여') ? 'F' : '';
    const inpatOpat = String(i.inpatOpat || '');
    const isInpatient = inpatOpat.includes('입원');

    if (!genderMap.has(sex)) {
      genderMap.set(sex, {
        diseaseCode: sickCd,
        diseaseName: String(i.sickNm || ''),
        gender: sex,
        genderCode,
        inpatientCount: 0,
        outpatientCount: 0,
        totalCount: 0,
        inpatientDays: 0,
        outpatientDays: 0,
        period: year,
      });
    }
    const stat = genderMap.get(sex)!;
    const cnt = Number(i.ptntCnt || 0);
    const days = Number(i.vstDdcnt || 0);
    if (isInpatient) {
      stat.inpatientCount += cnt;
      stat.inpatientDays += days;
    } else {
      stat.outpatientCount += cnt;
      stat.outpatientDays += days;
    }
    stat.totalCount += cnt;
  }
  return Array.from(genderMap.values());
}

/** 질병별 성별·연령대별 현황 (Swagger 필드: sex, age, ptntCnt, vstDdcnt, specCnt, rvdRpeTamtAmt, rvdInsupBrdnAmt) */
export async function fetchDiseaseAgeStats(sickCd: string, year = '2023'): Promise<DiseaseAgeStats[]> {
  const { items } = await getDissByGenderAgeStats1(sickCd, year);
  return items.map(i => ({
    diseaseCode: sickCd,
    diseaseName: String(i.sickNm || ''),
    gender: String(i.sex || ''),
    ageGroup: String(i.age || ''),
    ageGroupCode: '',
    patientCount: Number(i.ptntCnt || 0),
    visitCount: Number(i.vstDdcnt || 0),
    claimAmount: Number(i.rvdRpeTamtAmt || 0),
    period: year,
  }));
}

/** 질병별 의료기관종별 현황 (Swagger 필드: grade, ptntCnt, vstDdcnt, specCnt, rvdRpeTamtAmt, rvdInsupBrdnAmt) */
export async function fetchDiseaseInstitutionStats(sickCd: string, year = '2023'): Promise<DiseaseInstitutionStats[]> {
  const { items } = await getDissByClassesStats1(sickCd, year);
  return items.map(i => ({
    diseaseCode: sickCd,
    diseaseName: String(i.sickNm || ''),
    institutionType: String(i.grade || ''),
    institutionTypeCode: '',
    patientCount: Number(i.ptntCnt || 0),
    visitCount: Number(i.vstDdcnt || 0),
    claimAmount: Number(i.rvdRpeTamtAmt || 0),
    period: year,
  }));
}

/** 질병별 지역별 현황 (Swagger 필드: lcName(지역명), ptntCnt, vstDdcnt, specCnt, rvdRpeTamtAmt, rvdInsupBrdnAmt) */
export async function fetchDiseaseAreaStats(sickCd: string, year = '2023'): Promise<DiseaseAreaStats[]> {
  const { items } = await getDissByAreaStats1(sickCd, year);
  const total = items.reduce((s, i) => s + Number(i.ptntCnt || 0), 0);
  return items.map(i => {
    const cnt = Number(i.ptntCnt || 0);
    return {
      diseaseCode: sickCd,
      diseaseName: String(i.sickNm || ''),
      regionName: String(i.lcName || ''),
      regionCode: '',
      patientCount: cnt,
      visitCount: Number(i.vstDdcnt || 0),
      claimAmount: Number(i.rvdRpeTamtAmt || 0),
      patientRate: total > 0 ? Math.round((cnt / total) * 10000) / 100 : 0,
      period: year,
    };
  });
}

/** 질병 종합분석 (4개 API 병렬 호출) */
export async function fetchDiseaseAnalysis(sickCd: string, year = '2023'): Promise<DiseaseAnalysisResult> {
  const [genderStats, ageDistribution, institutionStats, regionalStats] = await Promise.all([
    fetchDiseaseGenderStats(sickCd, year),
    fetchDiseaseAgeStats(sickCd, year),
    fetchDiseaseInstitutionStats(sickCd, year),
    fetchDiseaseAreaStats(sickCd, year),
  ]);

  // 전체 환자수
  const totalPatients = genderStats.reduce((s, g) => s + g.totalCount, 0);

  // 인사이트 도출
  const topAge = [...ageDistribution].sort((a, b) => b.patientCount - a.patientCount)[0];
  const maleCount = genderStats.filter(g => g.genderCode === 'M' || g.gender.includes('남')).reduce((s, g) => s + g.totalCount, 0);
  const femaleCount = genderStats.filter(g => g.genderCode === 'F' || g.gender.includes('여')).reduce((s, g) => s + g.totalCount, 0);
  const topRegion = [...regionalStats].sort((a, b) => b.patientCount - a.patientCount)[0];
  const topInstitution = [...institutionStats].sort((a, b) => b.patientCount - a.patientCount)[0];

  const totalGender = maleCount + femaleCount;
  const genderRatio = totalGender > 0
    ? `남성 ${Math.round((maleCount / totalGender) * 100)}% : 여성 ${Math.round((femaleCount / totalGender) * 100)}%`
    : '데이터 없음';

  return {
    diseaseCode: sickCd,
    diseaseName: genderStats[0]?.diseaseName || ageDistribution[0]?.diseaseName || '미상',
    period: year,
    totalPatients,
    genderStats,
    ageDistribution,
    institutionStats,
    regionalStats,
    insights: {
      topAgeGroup: topAge?.ageGroup || '미상',
      genderRatio,
      topRegion: topRegion?.regionName || '미상',
      topInstitution: topInstitution?.institutionType || '미상',
    },
  };
}

// ============================================
// 유틸리티
// ============================================

/** 상위 N개 추출 (환자수 기준) */
export function getTopNByPatients<T extends { patientCount: number }>(items: T[], n = 10): T[] {
  return [...items].sort((a, b) => b.patientCount - a.patientCount).slice(0, n);
}

/** 상위 N개 추출 (청구금액 기준) */
export function getTopNByClaim<T extends { claimAmount: number }>(items: T[], n = 10): T[] {
  return [...items].sort((a, b) => b.claimAmount - a.claimAmount).slice(0, n);
}
