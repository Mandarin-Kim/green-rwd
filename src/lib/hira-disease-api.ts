/**
 * HIRA 질병정보서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 질병정보서비스 5개 엔드포인트 지원
 *
 * 엔드포인트 목록:
 * 1. getDissInfoList - 질병검색 (질병명/코드 기반)
 * 2. getDissGenderTpStats - 질병별 성별·입원/외래 통계
 * 3. getDissGenderAgeStats - 질병별 성별·연령대별 통계
 * 4. getDissOperYearStats - 질병별 연도별 추이 통계
 * 5. getDissAreaStats - 질병별 시도별(지역별) 통계
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

/** 질병별 연도별 추이 */
export interface DiseaseYearTrend {
  diseaseCode: string;
  diseaseName: string;
  year: string;
  patientCount: number;
  visitCount: number;
  claimAmount: number;
  avgClaimPerPatient: number;  // 1인당 요양급여비용
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
  yearTrend: DiseaseYearTrend[];
  regionalStats: DiseaseAreaStats[];
  insights: {
    topAgeGroup: string;
    genderRatio: string;
    topRegion: string;
    yearOverYearGrowth: number;
  };
}

// ============================================
// API 설정
// ============================================

const DISEASE_ENDPOINT = process.env.HIRA_DISEASE_API_ENDPOINT || 'https://apis.data.go.kr/B551182/diseaseInfoService1';
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
    console.warn('HIRA_API_KEY가 설정되지 않았습니다.');
    return { items: [], totalCount: 0 };
  }

  try {
    const searchParams = new URLSearchParams();
    searchParams.set('serviceKey', HIRA_KEY);
    Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)));

    const url = `${DISEASE_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA Disease API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA Disease API 실패 (${operation}):`, err);
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
// 5개 엔드포인트 함수
// ============================================

/** 1. 질병검색 - 질병명 또는 코드로 검색 */
export const getDissInfoList = (dissNm: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissInfoList', { dissNm, numOfRows: 100, pageNo: 1, ...p });

/** 2. 질병별 성별·입원/외래 통계 */
export const getDissGenderTpStats = (sickCd: string, diagYm: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissGenderTpStats', { sickCd, diagYm, numOfRows: 100, pageNo: 1, ...p });

/** 3. 질병별 성별·연령대별 통계 */
export const getDissGenderAgeStats = (sickCd: string, diagYm: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissGenderAgeStats', { sickCd, diagYm, numOfRows: 100, pageNo: 1, ...p });

/** 4. 질병별 연도별 추이 통계 */
export const getDissOperYearStats = (sickCd: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissOperYearStats', { sickCd, numOfRows: 100, pageNo: 1, ...p });

/** 5. 질병별 시도별(지역별) 통계 */
export const getDissAreaStats = (sickCd: string, diagYm: string, p?: Record<string, string>) =>
  callDiseaseApi('getDissAreaStats', { sickCd, diagYm, numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** 질병 검색 (자동완성 등에 활용) */
export async function searchDiseases(keyword: string): Promise<DiseaseInfo[]> {
  const { items } = await getDissInfoList(keyword);
  return items.map(i => ({
    diseaseCode: String(i.sickCd || i.dissCd || ''),
    diseaseName: String(i.sickNm || i.dissNm || ''),
    diseaseEngName: String(i.sickEngNm || i.dissEngNm || ''),
    patientCount: Number(i.patntCnt || 0),
    visitCount: Number(i.rcptCnt || i.visnCnt || 0),
    claimAmount: Number(i.trsRcptAmt || 0),
  }));
}

/** 질병별 성별·입원/외래 현황 */
export async function fetchDiseaseGenderStats(sickCd: string, diagYm = '2024'): Promise<DiseaseGenderStats[]> {
  const { items } = await getDissGenderTpStats(sickCd, diagYm);
  return items.map(i => ({
    diseaseCode: sickCd,
    diseaseName: String(i.sickNm || i.dissNm || ''),
    gender: String(i.gndrCdNm || i.gndrNm || ''),
    genderCode: String(i.gndrCd || ''),
    inpatientCount: Number(i.ipatCnt || 0),
    outpatientCount: Number(i.opatCnt || 0),
    totalCount: Number(i.patntCnt || i.totCnt || 0),
    inpatientDays: Number(i.ipatVisnCnt || 0),
    outpatientDays: Number(i.opatVisnCnt || 0),
    period: diagYm,
  }));
}

/** 질병별 성별·연령대별 현황 */
export async function fetchDiseaseAgeStats(sickCd: string, diagYm = '2024'): Promise<DiseaseAgeStats[]> {
  const { items } = await getDissGenderAgeStats(sickCd, diagYm);
  return items.map(i => ({
    diseaseCode: sickCd,
    diseaseName: String(i.sickNm || i.dissNm || ''),
    gender: String(i.gndrCdNm || i.gndrNm || ''),
    ageGroup: String(i.ageCdNm || i.ageGrpNm || ''),
    ageGroupCode: String(i.ageCd || ''),
    patientCount: Number(i.patntCnt || 0),
    visitCount: Number(i.rcptCnt || i.visnCnt || 0),
    claimAmount: Number(i.trsRcptAmt || 0),
    period: diagYm,
  }));
}

/** 질병별 연도별 추이 */
export async function fetchDiseaseYearTrend(sickCd: string): Promise<DiseaseYearTrend[]> {
  const { items } = await getDissOperYearStats(sickCd);
  return items.map(i => ({
    diseaseCode: sickCd,
    diseaseName: String(i.sickNm || i.dissNm || ''),
    year: String(i.diagYy || i.year || ''),
    patientCount: Number(i.patntCnt || 0),
    visitCount: Number(i.rcptCnt || i.visnCnt || 0),
    claimAmount: Number(i.trsRcptAmt || 0),
    avgClaimPerPatient: Number(i.avgTrsRcptAmt || 0),
  }));
}

/** 질병별 지역별 현황 */
export async function fetchDiseaseAreaStats(sickCd: string, diagYm = '2024'): Promise<DiseaseAreaStats[]> {
  const { items } = await getDissAreaStats(sickCd, diagYm);
  const total = items.reduce((s, i) => s + Number(i.patntCnt || 0), 0);
  return items.map(i => {
    const cnt = Number(i.patntCnt || 0);
    return {
      diseaseCode: sickCd,
      diseaseName: String(i.sickNm || i.dissNm || ''),
      regionName: String(i.sidoCdNm || i.areaNm || ''),
      regionCode: String(i.sidoCd || i.areaCd || ''),
      patientCount: cnt,
      visitCount: Number(i.rcptCnt || i.visnCnt || 0),
      claimAmount: Number(i.trsRcptAmt || 0),
      patientRate: total > 0 ? Math.round((cnt / total) * 10000) / 100 : 0,
      period: diagYm,
    };
  });
}

/** 질병 종합분석 (5개 API 병렬 호출) */
export async function fetchDiseaseAnalysis(sickCd: string, diagYm = '2024'): Promise<DiseaseAnalysisResult> {
  const [genderStats, ageDistribution, yearTrend, regionalStats] = await Promise.all([
    fetchDiseaseGenderStats(sickCd, diagYm),
    fetchDiseaseAgeStats(sickCd, diagYm),
    fetchDiseaseYearTrend(sickCd),
    fetchDiseaseAreaStats(sickCd, diagYm),
  ]);

  // 전체 환자수
  const totalPatients = genderStats.reduce((s, g) => s + g.totalCount, 0);

  // 인사이트 도출
  const topAge = [...ageDistribution].sort((a, b) => b.patientCount - a.patientCount)[0];
  const maleCount = genderStats.filter(g => g.genderCode === 'M' || g.gender.includes('남')).reduce((s, g) => s + g.totalCount, 0);
  const femaleCount = genderStats.filter(g => g.genderCode === 'F' || g.gender.includes('여')).reduce((s, g) => s + g.totalCount, 0);
  const topRegion = [...regionalStats].sort((a, b) => b.patientCount - a.patientCount)[0];

  // 전년 대비 증감률
  const sortedYears = [...yearTrend].sort((a, b) => b.year.localeCompare(a.year));
  let yoyGrowth = 0;
  if (sortedYears.length >= 2) {
    const latest = sortedYears[0].patientCount;
    const prev = sortedYears[1].patientCount;
    yoyGrowth = prev > 0 ? Math.round(((latest - prev) / prev) * 10000) / 100 : 0;
  }

  const totalGender = maleCount + femaleCount;
  const genderRatio = totalGender > 0
    ? `남성 ${Math.round((maleCount / totalGender) * 100)}% : 여성 ${Math.round((femaleCount / totalGender) * 100)}%`
    : '데이터 없음';

  return {
    diseaseCode: sickCd,
    diseaseName: genderStats[0]?.diseaseName || ageDistribution[0]?.diseaseName || '미상',
    period: diagYm,
    totalPatients,
    genderStats,
    ageDistribution,
    yearTrend,
    regionalStats,
    insights: {
      topAgeGroup: topAge?.ageGroup || '미상',
      genderRatio,
      topRegion: topRegion?.regionName || '미상',
      yearOverYearGrowth: yoyGrowth,
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
