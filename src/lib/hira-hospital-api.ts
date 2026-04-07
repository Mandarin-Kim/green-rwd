/**
 * HIRA 병원정보서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 병원정보서비스v2 1개 엔드포인트 지원
 *
 * 엔드포인트:
 * 1. getHospBasisList - 병원기본목록 (의료기관 검색, 인력현황 포함)
 *
 * 검색 조건: 시도, 시군구, 읍면동, 병원명, 분류코드, 종별코드, 진료과목코드
 * 응답 데이터: 병원명, 주소, 종별, 의사수(일반의/인턴/레지던트/전문의), 개설일 등
 *
 * 활용: 보고서에서 의료기관 유형별/지역별 분포 분석,
 *       처방 패턴과 의료기관 특성 연계 분석
 */

// ============================================
// 타입 정의
// ============================================

/** 병원 기본 정보 */
export interface HospitalInfo {
  ykiho: string;              // 암호화된 요양기호 (시설 고유 ID)
  hospitalName: string;       // 병원명
  classCode: string;          // 종별코드
  className: string;          // 종별코드명 (상급종합병원, 종합병원, 병원, 의원 등)
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
  // 의사 인력 현황
  doctorTotal: number;        // 의사총수
  mdGdrCount: number;         // 의과일반의 수
  mdInternCount: number;      // 의과인턴 수
  mdResidentCount: number;    // 의과레지던트 수
  mdSpecialistCount: number;  // 의과전문의 수
  dtGdrCount: number;         // 치과일반의 수
  dtInternCount: number;      // 치과인턴 수
  dtResidentCount: number;    // 치과레지던트 수
  dtSpecialistCount: number;  // 치과전문의 수
  cmGdrCount: number;         // 한방일반의 수
  cmInternCount: number;      // 한방인턴 수
  cmResidentCount: number;    // 한방레지던트 수
  cmSpecialistCount: number;  // 한방전문의 수
}

/** 병원 검색 조건 */
export interface HospitalSearchParams {
  sidoCd?: string;            // 시도코드 (예: 110000 서울)
  sgguCd?: string;            // 시군구코드
  emdongNm?: string;          // 읍면동명
  yadmNm?: string;            // 병원명 (UTF-8 인코딩)
  zipCd?: string;             // 분류코드 (2010:종합병원, 2030:병원, 2070:의원 등)
  clCd?: string;              // 종별코드 (01:상급종합, 11:종합, 21:병원, 31:의원 등)
  dgsbjtCd?: string;          // 진료과목코드 (01:내과, 04:외과 등)
  numOfRows?: number;
  pageNo?: number;
}

/** 병원 통계 결과 */
export interface HospitalStatistics {
  totalHospitals: number;
  byClass: { className: string; count: number; doctorAvg: number }[];
  byRegion: { regionName: string; count: number; doctorAvg: number }[];
  avgDoctorsPerHospital: number;
  specialistRatio: number;    // 전문의 비율
}

// ============================================
// 종별코드 / 진료과목코드 매핑
// ============================================

export const CLASS_CODES: Record<string, string> = {
  '01': '상급종합병원', '11': '종합병원', '21': '병원', '28': '요양병원',
  '29': '정신병원', '31': '의원', '41': '치과병원', '51': '치과의원',
  '61': '조산원', '71': '보건소', '72': '보건지소', '73': '보건진료소',
  '75': '보건의료원', '92': '한방병원', '93': '한의원',
};

export const DEPT_CODES: Record<string, string> = {
  '00': '일반의', '01': '내과', '02': '신경과', '03': '정신건강의학과',
  '04': '외과', '05': '정형외과', '06': '신경외과', '07': '흉부외과',
  '08': '성형외과', '09': '마취통증의학과', '10': '산부인과',
  '11': '소아청소년과', '12': '안과', '13': '이비인후과', '14': '피부과',
  '15': '비뇨의학과', '16': '영상의학과', '17': '방사선종양학과',
  '18': '병리과', '19': '진단검사의학과', '20': '결핵과',
  '21': '재활의학과', '22': '핵의학과', '23': '가정의학과',
  '24': '응급의학과', '25': '직업환경의학과', '26': '예방의학과',
  '80': '한방내과', '81': '한방부인과', '82': '한방소아과',
  '83': '한방안이비인후피부과', '84': '한방신경정신과',
  '85': '침구과', '86': '한방재활의학과', '87': '사상체질과',
};

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

const HOSPITAL_ENDPOINT = process.env.HIRA_HOSPITAL_API_ENDPOINT || 'https://apis.data.go.kr/B551182/hospInfoServicev2';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callHospitalApi(
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

    const url = `${HOSPITAL_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA Hospital API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA Hospital API 실패 (${operation}):`, err);
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

/** 병원기본목록 조회 */
export const getHospBasisList = (params: HospitalSearchParams = {}) =>
  callHospitalApi('getHospBasisList', {
    numOfRows: params.numOfRows || 100,
    pageNo: params.pageNo || 1,
    ...(params.sidoCd && { sidoCd: params.sidoCd }),
    ...(params.sgguCd && { sgguCd: params.sgguCd }),
    ...(params.emdongNm && { emdongNm: params.emdongNm }),
    ...(params.yadmNm && { yadmNm: params.yadmNm }),
    ...(params.zipCd && { zipCd: params.zipCd }),
    ...(params.clCd && { clCd: params.clCd }),
    ...(params.dgsbjtCd && { dgsbjtCd: params.dgsbjtCd }),
  });

// ============================================
// 리포트용 분석 함수
// ============================================

/** XML 응답 → HospitalInfo 변환 */
function toHospitalInfo(item: Record<string, string | number>): HospitalInfo {
  return {
    ykiho: String(item.ykiho || ''),
    hospitalName: String(item.yadmNm || ''),
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
    doctorTotal: Number(item.drTotCnt || 0),
    mdGdrCount: Number(item.mdeptGdrCnt || 0),
    mdInternCount: Number(item.mdeptIntnCnt || 0),
    mdResidentCount: Number(item.mdeptResdntCnt || 0),
    mdSpecialistCount: Number(item.mdeptSdrCnt || 0),
    dtGdrCount: Number(item.detyGdrCnt || 0),
    dtInternCount: Number(item.detyIntnCnt || 0),
    dtResidentCount: Number(item.detyResdntCnt || 0),
    dtSpecialistCount: Number(item.detySdrCnt || 0),
    cmGdrCount: Number(item.cmdcGdrCnt || 0),
    cmInternCount: Number(item.cmdcIntnCnt || 0),
    cmResidentCount: Number(item.cmdcResdntCnt || 0),
    cmSpecialistCount: Number(item.cmdcSdrCnt || 0),
  };
}

/** 병원명으로 검색 */
export async function searchHospitalsByName(name: string): Promise<HospitalInfo[]> {
  const { items } = await getHospBasisList({ yadmNm: name });
  return items.map(toHospitalInfo);
}

/** 시도별 병원 조회 */
export async function getHospitalsByRegion(sidoCd: string, clCd?: string): Promise<HospitalInfo[]> {
  const { items } = await getHospBasisList({ sidoCd, clCd, numOfRows: 1000 });
  return items.map(toHospitalInfo);
}

/** 진료과목별 병원 조회 */
export async function getHospitalsByDepartment(dgsbjtCd: string, sidoCd?: string): Promise<HospitalInfo[]> {
  const { items } = await getHospBasisList({ dgsbjtCd, sidoCd, numOfRows: 1000 });
  return items.map(toHospitalInfo);
}

/** 종별코드별 병원 조회 (상급종합, 종합병원, 병원, 의원 등) */
export async function getHospitalsByClass(clCd: string, sidoCd?: string): Promise<HospitalInfo[]> {
  const { items } = await getHospBasisList({ clCd, sidoCd, numOfRows: 1000 });
  return items.map(toHospitalInfo);
}

/** 전체 시도별 병원 수 통계 (17개 시도 병렬 조회) */
export async function getHospitalCountByAllRegions(clCd?: string): Promise<{ regionName: string; regionCode: string; count: number }[]> {
  const sidoCodes = Object.keys(SIDO_CODES);
  const results = await Promise.all(
    sidoCodes.map(async (code) => {
      const { totalCount } = await getHospBasisList({ sidoCd: code, clCd, numOfRows: 1 });
      return {
        regionName: SIDO_CODES[code],
        regionCode: code,
        count: totalCount,
      };
    })
  );
  return results.sort((a, b) => b.count - a.count);
}

/** 병원 목록에서 통계 생성 */
export function calculateHospitalStats(hospitals: HospitalInfo[]): HospitalStatistics {
  const totalHospitals = hospitals.length;

  // 종별 통계
  const classMap = new Map<string, { count: number; totalDoctors: number }>();
  hospitals.forEach(h => {
    const key = h.className || '기타';
    const existing = classMap.get(key) || { count: 0, totalDoctors: 0 };
    existing.count++;
    existing.totalDoctors += h.doctorTotal;
    classMap.set(key, existing);
  });
  const byClass = Array.from(classMap.entries())
    .map(([className, data]) => ({
      className,
      count: data.count,
      doctorAvg: data.count > 0 ? Math.round(data.totalDoctors / data.count * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 지역별 통계
  const regionMap = new Map<string, { count: number; totalDoctors: number }>();
  hospitals.forEach(h => {
    const key = h.sidoName || '기타';
    const existing = regionMap.get(key) || { count: 0, totalDoctors: 0 };
    existing.count++;
    existing.totalDoctors += h.doctorTotal;
    regionMap.set(key, existing);
  });
  const byRegion = Array.from(regionMap.entries())
    .map(([regionName, data]) => ({
      regionName,
      count: data.count,
      doctorAvg: data.count > 0 ? Math.round(data.totalDoctors / data.count * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 전체 평균 의사 수
  const totalDoctors = hospitals.reduce((s, h) => s + h.doctorTotal, 0);
  const avgDoctorsPerHospital = totalHospitals > 0 ? Math.round(totalDoctors / totalHospitals * 10) / 10 : 0;

  // 전문의 비율
  const totalSpecialists = hospitals.reduce((s, h) =>
    s + h.mdSpecialistCount + h.dtSpecialistCount + h.cmSpecialistCount, 0);
  const specialistRatio = totalDoctors > 0 ? Math.round((totalSpecialists / totalDoctors) * 10000) / 100 : 0;

  return { totalHospitals, byClass, byRegion, avgDoctorsPerHospital, specialistRatio };
}

/** 상위 N개 병원 (의사 수 기준) */
export function getTopNByDoctorCount(hospitals: HospitalInfo[], n = 10): HospitalInfo[] {
  return [...hospitals].sort((a, b) => b.doctorTotal - a.doctorTotal).slice(0, n);
}
