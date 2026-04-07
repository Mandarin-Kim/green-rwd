/**
 * HIRA 의약품사용정보 OpenAPI 연동 모듈
 * 건강보험심사평가원 보건의료빅데이터 12개 엔드포인트 지원
 */

// ============================================
// 타입 정의
// ============================================

export interface DrugUsageData {
  componentName: string;
  componentCode: string;
  diseaseName: string;
  diseaseCode: string;
  usageAmount: number;
  usageRate: number;
  period: string;
}

export interface RegionalData {
  regionName: string;
  regionCode: string;
  usageAmount: number;
  usageRate: number;
}

export interface HospitalTypeData {
  hospitalType: string;
  hospitalTypeCode: string;
  usageAmount: number;
  usageRate: number;
}

export interface MarketAnalysisResult {
  componentCode: string;
  componentName: string;
  periodMonth: string;
  totalUsage: number;
  byDisease: DrugUsageData[];
  byRegion: RegionalData[];
  byHospitalType: HospitalTypeData[];
  marketTrend: {
    monthOverMonth: number;
    quarterOverQuarter: number;
  };
}

// ============================================
// API 설정
// ============================================

const HIRA_ENDPOINT = process.env.HIRA_API_ENDPOINT || 'https://apis.data.go.kr/B551182/msupUserInfoService1.2';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callHira(
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

    const url = `${HIRA_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA API 실패 (${operation}):`, err);
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
// 12개 엔드포인트 함수
// ============================================

// 1. 4단계ATC별 지역별
export const getAtcStp4Area = (diagYm: string, p?: Record<string, string>) =>
  callHira('getAtcStp4AreaList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 2. 4단계ATC별 의료기관종별
export const getAtcStp4Cl = (diagYm: string, p?: Record<string, string>) =>
  callHira('getAtcStp4ClList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 3. 3단계ATC별 지역별
export const getAtcStp3Area = (diagYm: string, p?: Record<string, string>) =>
  callHira('getAtcStp3AreaList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 4. 성분별 지역별
export const getCmpnArea = (diagYm: string, p?: Record<string, string>) =>
  callHira('getCmpnAreaList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 5. 성분별 의료기관종별
export const getCmpnCl = (diagYm: string, p?: Record<string, string>) =>
  callHira('getCmpnClList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 6. 성분별 상병별 ⭐ 핵심
export const getCmpnSick = (diagYm: string, p?: Record<string, string>) =>
  callHira('getCmpnSickList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 7. 약효분류군 상병별 ⭐ 핵심
export const getMeftDivSick = (diagYm: string, p?: Record<string, string>) =>
  callHira('getMeftDivSickList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 8. 3단계ATC별 의료기관종별
export const getAtcStp3Cl = (diagYm: string, p?: Record<string, string>) =>
  callHira('getAtcStp3ClList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 9. 3단계ATC별 상병별
export const getAtcStp3Sick = (diagYm: string, p?: Record<string, string>) =>
  callHira('getAtcStp3SickList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 10. 4단계ATC별 상병별
export const getAtcStp4Sick = (diagYm: string, p?: Record<string, string>) =>
  callHira('getAtcStp4SickList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 11. 약효분류군 지역별
export const getMeftDivArea = (diagYm: string, p?: Record<string, string>) =>
  callHira('getMeftDivAreaList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// 12. 약효분류군 의료기관종별
export const getMeftDivCl = (diagYm: string, p?: Record<string, string>) =>
  callHira('getMeftDivClList1.2', { diagYm, insupTp: '0', medTp: '0', numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** 성분별 상병별 사용량 */
export async function fetchDrugUsageByDisease(cmpnCd: string, diagYm = '202512'): Promise<DrugUsageData[]> {
  const { items } = await getCmpnSick(diagYm, { cmpnCd });
  return items.map(i => ({
    componentName: String(i.cmpnNm || ''),
    componentCode: String(i.cmpnCd || ''),
    diseaseName: String(i.sickNm || ''),
    diseaseCode: String(i.sickCd || ''),
    usageAmount: Number(i.totUseCnt || i.usageQy || 0),
    usageRate: Number(i.totUseRt || 0),
    period: diagYm,
  }));
}

/** 성분별 지역별 사용량 */
export async function fetchDrugUsageByRegion(cmpnCd: string, diagYm = '202512'): Promise<RegionalData[]> {
  const { items } = await getCmpnArea(diagYm, { cmpnCd });
  return items.map(i => ({
    regionName: String(i.sidoSdNm || ''),
    regionCode: String(i.sidoSdCd || ''),
    usageAmount: Number(i.totUseCnt || i.usageQy || 0),
    usageRate: Number(i.totUseRt || 0),
  }));
}

/** 성분별 의료기관종별 사용량 */
export async function fetchDrugUsageByHospitalType(cmpnCd: string, diagYm = '202512'): Promise<HospitalTypeData[]> {
  const { items } = await getCmpnCl(diagYm, { cmpnCd });
  return items.map(i => ({
    hospitalType: String(i.clCdNm || ''),
    hospitalTypeCode: String(i.clCd || ''),
    usageAmount: Number(i.totUseCnt || i.usageQy || 0),
    usageRate: Number(i.totUseRt || 0),
  }));
}

/** 약효분류군 상병별 사용량 */
export async function fetchTherapyGroupByDisease(meftDivNo: string, diagYm = '202512'): Promise<DrugUsageData[]> {
  const { items } = await getMeftDivSick(diagYm, { meftDivNo });
  return items.map(i => ({
    componentName: String(i.meftDivNm || ''),
    componentCode: String(i.meftDivNo || ''),
    diseaseName: String(i.sickNm || ''),
    diseaseCode: String(i.sickCd || ''),
    usageAmount: Number(i.totUseCnt || i.usageQy || 0),
    usageRate: Number(i.totUseRt || 0),
    period: diagYm,
  }));
}

/** 약효분류군 지역별 사용량 */
export async function fetchTherapyGroupByRegion(meftDivNo: string, diagYm = '202512'): Promise<RegionalData[]> {
  const { items } = await getMeftDivArea(diagYm, { meftDivNo });
  return items.map(i => ({
    regionName: String(i.sidoSdNm || ''),
    regionCode: String(i.sidoSdCd || ''),
    usageAmount: Number(i.totUseCnt || i.usageQy || 0),
    usageRate: Number(i.totUseRt || 0),
  }));
}

/** 종합 시장분석 (3개 API 병렬 호출) */
export async function fetchMarketAnalysis(cmpnCd: string, diagYm = '202512'): Promise<MarketAnalysisResult> {
  const [byDisease, byRegion, byHospitalType] = await Promise.all([
    fetchDrugUsageByDisease(cmpnCd, diagYm),
    fetchDrugUsageByRegion(cmpnCd, diagYm),
    fetchDrugUsageByHospitalType(cmpnCd, diagYm),
  ]);

  const totalUsage = byDisease.reduce((s, d) => s + d.usageAmount, 0);

  // 전월 대비 (MoM)
  const prev = getPrevMonth(diagYm);
  const prevData = await fetchDrugUsageByDisease(cmpnCd, prev);
  const prevTotal = prevData.reduce((s, d) => s + d.usageAmount, 0);
  const mom = prevTotal > 0 ? Math.round(((totalUsage - prevTotal) / prevTotal) * 10000) / 100 : 0;

  // 전분기 대비 (QoQ)
  const q3 = getNMonthsAgo(diagYm, 3);
  const q3Data = await fetchDrugUsageByDisease(cmpnCd, q3);
  const q3Total = q3Data.reduce((s, d) => s + d.usageAmount, 0);
  const qoq = q3Total > 0 ? Math.round(((totalUsage - q3Total) / q3Total) * 10000) / 100 : 0;

  return {
    componentCode: cmpnCd,
    componentName: byDisease[0]?.componentName || '미상',
    periodMonth: diagYm,
    totalUsage,
    byDisease,
    byRegion,
    byHospitalType,
    marketTrend: { monthOverMonth: mom, quarterOverQuarter: qoq },
  };
}

// ============================================
// 유틸리티
// ============================================

function getPrevMonth(ym: string): string {
  const y = parseInt(ym.slice(0, 4));
  const m = parseInt(ym.slice(4, 6));
  return m === 1 ? `${y - 1}12` : `${y}${String(m - 1).padStart(2, '0')}`;
}

function getNMonthsAgo(ym: string, n: number): string {
  let y = parseInt(ym.slice(0, 4));
  let m = parseInt(ym.slice(4, 6));
  for (let i = 0; i < n; i++) { if (m === 1) { y--; m = 12; } else { m--; } }
  return `${y}${String(m).padStart(2, '0')}`;
}

/** 상위 N개 추출 */
export function getTopN<T extends { usageAmount: number }>(items: T[], n = 10): T[] {
  return [...items].sort((a, b) => b.usageAmount - a.usageAmount).slice(0, n);
}
