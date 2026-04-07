/**
 * HIRA 진료행위정보서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 진료행위정보서비스 4개 엔드포인트 지원
 *
 * 엔드포인트 목록:
 * 1. getMdlrtActionByGenderIpatOpatStats - 진료행위별 성별·입원/외래 통계
 * 2. getMdlrtActionByGenderAgeStats - 진료행위별 성별·연령대별 통계
 * 3. getMdlrtActionByClassesStats - 진료행위별 의료기관종별 통계
 * 4. getMdlrtActionByAreaStats - 진료행위별 시도별(지역별) 통계
 */

// ============================================
// 타입 정의
// ============================================

/** 진료행위별 성별·입원/외래 통계 */
export interface ActionGenderStats {
  actionCode: string;        // 진료행위코드
  actionName: string;        // 진료행위명
  gender: string;            // 남/여
  genderCode: string;        // M/F
  inpatientCount: number;    // 입원 환자수
  outpatientCount: number;   // 외래 환자수
  totalCount: number;        // 전체 환자수
  inpatientFreq: number;     // 입원 실시건수
  outpatientFreq: number;    // 외래 실시건수
  period: string;
}

/** 진료행위별 성별·연령대별 통계 */
export interface ActionAgeStats {
  actionCode: string;
  actionName: string;
  gender: string;
  ageGroup: string;          // 연령대
  ageGroupCode: string;
  patientCount: number;
  frequency: number;         // 실시건수
  claimAmount: number;       // 요양급여비용
  period: string;
}

/** 진료행위별 의료기관종별 통계 */
export interface ActionHospitalStats {
  actionCode: string;
  actionName: string;
  hospitalType: string;      // 의료기관종
  hospitalTypeCode: string;
  patientCount: number;
  frequency: number;         // 실시건수
  claimAmount: number;
  period: string;
}

/** 진료행위별 지역별 통계 */
export interface ActionAreaStats {
  actionCode: string;
  actionName: string;
  regionName: string;        // 시도명
  regionCode: string;        // 시도코드
  patientCount: number;
  frequency: number;         // 실시건수
  claimAmount: number;
  patientRate: number;       // 환자 비율
  period: string;
}

/** 진료행위 종합분석 결과 */
export interface ActionAnalysisResult {
  actionCode: string;
  actionName: string;
  period: string;
  totalPatients: number;
  totalFrequency: number;
  genderStats: ActionGenderStats[];
  ageDistribution: ActionAgeStats[];
  hospitalDistribution: ActionHospitalStats[];
  regionalStats: ActionAreaStats[];
  insights: {
    topAgeGroup: string;
    genderRatio: string;
    topHospitalType: string;
    topRegion: string;
  };
}

// ============================================
// API 설정
// ============================================

const ACTION_ENDPOINT = process.env.HIRA_ACTION_API_ENDPOINT || 'https://apis.data.go.kr/B551182/mdlrtActionInfoService';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callActionApi(
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

    const url = `${ACTION_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA Action API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA Action API 실패 (${operation}):`, err);
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
// 4개 엔드포인트 함수
// ============================================

/** 1. 진료행위별 성별·입원/외래 통계 */
export const getMdlrtActionByGenderIpatOpatStats = (mdlrtActnCd: string, diagYm: string, p?: Record<string, string>) =>
  callActionApi('getMdlrtActionByGenderIpatOpatStats', { mdlrtActnCd, diagYm, numOfRows: 100, pageNo: 1, ...p });

/** 2. 진료행위별 성별·연령대별 통계 */
export const getMdlrtActionByGenderAgeStats = (mdlrtActnCd: string, diagYm: string, p?: Record<string, string>) =>
  callActionApi('getMdlrtActionByGenderAgeStats', { mdlrtActnCd, diagYm, numOfRows: 100, pageNo: 1, ...p });

/** 3. 진료행위별 의료기관종별 통계 */
export const getMdlrtActionByClassesStats = (mdlrtActnCd: string, diagYm: string, p?: Record<string, string>) =>
  callActionApi('getMdlrtActionByClassesStats', { mdlrtActnCd, diagYm, numOfRows: 100, pageNo: 1, ...p });

/** 4. 진료행위별 시도별(지역별) 통계 */
export const getMdlrtActionByAreaStats = (mdlrtActnCd: string, diagYm: string, p?: Record<string, string>) =>
  callActionApi('getMdlrtActionByAreaStats', { mdlrtActnCd, diagYm, numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** 진료행위별 성별·입원/외래 현황 */
export async function fetchActionGenderStats(actionCd: string, diagYm = '2024'): Promise<ActionGenderStats[]> {
  const { items } = await getMdlrtActionByGenderIpatOpatStats(actionCd, diagYm);
  return items.map(i => ({
    actionCode: actionCd,
    actionName: String(i.mdlrtActnNm || i.actnNm || ''),
    gender: String(i.gndrCdNm || i.gndrNm || ''),
    genderCode: String(i.gndrCd || ''),
    inpatientCount: Number(i.ipatCnt || 0),
    outpatientCount: Number(i.opatCnt || 0),
    totalCount: Number(i.patntCnt || i.totCnt || 0),
    inpatientFreq: Number(i.ipatExecCnt || i.ipatFreq || 0),
    outpatientFreq: Number(i.opatExecCnt || i.opatFreq || 0),
    period: diagYm,
  }));
}

/** 진료행위별 성별·연령대별 현황 */
export async function fetchActionAgeStats(actionCd: string, diagYm = '2024'): Promise<ActionAgeStats[]> {
  const { items } = await getMdlrtActionByGenderAgeStats(actionCd, diagYm);
  return items.map(i => ({
    actionCode: actionCd,
    actionName: String(i.mdlrtActnNm || i.actnNm || ''),
    gender: String(i.gndrCdNm || i.gndrNm || ''),
    ageGroup: String(i.ageCdNm || i.ageGrpNm || ''),
    ageGroupCode: String(i.ageCd || ''),
    patientCount: Number(i.patntCnt || 0),
    frequency: Number(i.execCnt || i.freq || 0),
    claimAmount: Number(i.trsRcptAmt || 0),
    period: diagYm,
  }));
}

/** 진료행위별 의료기관종별 현황 */
export async function fetchActionHospitalStats(actionCd: string, diagYm = '2024'): Promise<ActionHospitalStats[]> {
  const { items } = await getMdlrtActionByClassesStats(actionCd, diagYm);
  return items.map(i => ({
    actionCode: actionCd,
    actionName: String(i.mdlrtActnNm || i.actnNm || ''),
    hospitalType: String(i.clCdNm || i.clNm || ''),
    hospitalTypeCode: String(i.clCd || ''),
    patientCount: Number(i.patntCnt || 0),
    frequency: Number(i.execCnt || i.freq || 0),
    claimAmount: Number(i.trsRcptAmt || 0),
    period: diagYm,
  }));
}

/** 진료행위별 지역별 현황 */
export async function fetchActionAreaStats(actionCd: string, diagYm = '2024'): Promise<ActionAreaStats[]> {
  const { items } = await getMdlrtActionByAreaStats(actionCd, diagYm);
  const total = items.reduce((s, i) => s + Number(i.patntCnt || 0), 0);
  return items.map(i => {
    const cnt = Number(i.patntCnt || 0);
    return {
      actionCode: actionCd,
      actionName: String(i.mdlrtActnNm || i.actnNm || ''),
      regionName: String(i.sidoCdNm || i.areaNm || ''),
      regionCode: String(i.sidoCd || i.areaCd || ''),
      patientCount: cnt,
      frequency: Number(i.execCnt || i.freq || 0),
      claimAmount: Number(i.trsRcptAmt || 0),
      patientRate: total > 0 ? Math.round((cnt / total) * 10000) / 100 : 0,
      period: diagYm,
    };
  });
}

/** 진료행위 종합분석 (4개 API 병렬 호출) */
export async function fetchActionAnalysis(actionCd: string, diagYm = '2024'): Promise<ActionAnalysisResult> {
  const [genderStats, ageDistribution, hospitalDistribution, regionalStats] = await Promise.all([
    fetchActionGenderStats(actionCd, diagYm),
    fetchActionAgeStats(actionCd, diagYm),
    fetchActionHospitalStats(actionCd, diagYm),
    fetchActionAreaStats(actionCd, diagYm),
  ]);

  // 전체 환자수 및 실시건수
  const totalPatients = genderStats.reduce((s, g) => s + g.totalCount, 0);
  const totalFrequency = genderStats.reduce((s, g) => s + g.inpatientFreq + g.outpatientFreq, 0);

  // 인사이트 도출
  const topAge = [...ageDistribution].sort((a, b) => b.patientCount - a.patientCount)[0];
  const maleCount = genderStats.filter(g => g.genderCode === 'M' || g.gender.includes('남')).reduce((s, g) => s + g.totalCount, 0);
  const femaleCount = genderStats.filter(g => g.genderCode === 'F' || g.gender.includes('여')).reduce((s, g) => s + g.totalCount, 0);
  const topHospital = [...hospitalDistribution].sort((a, b) => b.patientCount - a.patientCount)[0];
  const topRegion = [...regionalStats].sort((a, b) => b.patientCount - a.patientCount)[0];

  const totalGender = maleCount + femaleCount;
  const genderRatio = totalGender > 0
    ? `남성 ${Math.round((maleCount / totalGender) * 100)}% : 여성 ${Math.round((femaleCount / totalGender) * 100)}%`
    : '데이터 없음';

  return {
    actionCode: actionCd,
    actionName: genderStats[0]?.actionName || ageDistribution[0]?.actionName || '미상',
    period: diagYm,
    totalPatients,
    totalFrequency,
    genderStats,
    ageDistribution,
    hospitalDistribution,
    regionalStats,
    insights: {
      topAgeGroup: topAge?.ageGroup || '미상',
      genderRatio,
      topHospitalType: topHospital?.hospitalType || '미상',
      topRegion: topRegion?.regionName || '미상',
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

/** 상위 N개 추출 (실시건수 기준) */
export function getTopNByFrequency<T extends { frequency: number }>(items: T[], n = 10): T[] {
  return [...items].sort((a, b) => b.frequency - a.frequency).slice(0, n);
}

/** 상위 N개 추출 (청구금액 기준) */
export function getTopNByClaim<T extends { claimAmount: number }>(items: T[], n = 10): T[] {
  return [...items].sort((a, b) => b.claimAmount - a.claimAmount).slice(0, n);
}
