/**
 * HIRA 의료기관별상세정보서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 의료기관별상세정보서비스 v2.7 — 11개 엔드포인트
 *
 * 엔드포인트 목록:
 * 1.  getSpclDiagInfo2.7      - 특수진료정보(진료가능분야조회)
 * 2.  getTrnsprtInfo2.7       - 교통정보
 * 3.  getDtlInfo2.7           - 세부정보 (운영시간, 주차 등)
 * 4.  getEqpInfo2.7           - 시설정보 (병상수, ICU, 수술실 등)
 * 5.  getSpcSbjtSdrInfo2.7    - 전문과목별 전문의 수
 * 6.  getDgsbjtInfo2.7        - 진료과목정보
 * 7.  getMedOftInfo2.7        - 의료장비정보 (MRI, CT 등)
 * 8.  getFoepAddcInfo2.7      - 식대가산정보
 * 9.  getNursigGrdInfo2.7     - 간호등급정보
 * 10. getSpclHospAsgFldList2.7 - 전문병원지정분야
 * 11. getEtcHstInfo2.7        - 기타인력수 (약사, 한약사, 물리치료사 등)
 *
 * 활용: XLSX 메타데이터의 실시간 보완 + 의료기관 세부 분석
 *       보고서에서 처방 기관의 장비/인력/시설 수준 분석
 */

// ============================================
// 타입 정의
// ============================================

/** 특수진료정보 (진료가능분야) */
export interface SpecialDiagInfo {
  ykiho: string;
  hospitalName: string;
  specialDiagName: string;    // 특수진료분야명
  specialDiagCode: string;
}

/** 세부정보 (운영시간, 주차 등) */
export interface DetailInfo {
  ykiho: string;
  hospitalName: string;
  weekdayOpen: string;        // 평일 진료시작
  weekdayClose: string;       // 평일 진료종료
  satOpen: string;            // 토요일 시작
  satClose: string;           // 토요일 종료
  sunOpen: string;            // 일요일 시작
  sunClose: string;           // 일요일 종료
  holidayOpen: string;        // 공휴일 시작
  holidayClose: string;       // 공휴일 종료
  lunchStart: string;         // 점심시간 시작
  lunchEnd: string;           // 점심시간 종료
  parkingInfo: string;        // 주차 정보
  parkingCount: number;       // 주차대수
}

/** 시설정보 (병상, ICU 등) */
export interface FacilityInfo {
  ykiho: string;
  hospitalName: string;
  totalBeds: number;          // 총 병상수
  icuBeds: number;            // 중환자실 병상수
  operatingRooms: number;     // 수술실수
  deliveryRooms: number;      // 분만실수
}

/** 진료과목정보 */
export interface DepartmentInfo {
  ykiho: string;
  hospitalName: string;
  departmentCode: string;     // 진료과목코드
  departmentName: string;     // 진료과목명
}

/** 의료장비정보 */
export interface MedicalEquipmentInfo {
  ykiho: string;
  hospitalName: string;
  equipmentName: string;      // 장비명 (MRI, CT 등)
  equipmentCode: string;
  equipmentCount: number;     // 보유대수
}

/** 전문과목별 전문의 수 */
export interface SpecialistCountInfo {
  ykiho: string;
  hospitalName: string;
  departmentCode: string;
  departmentName: string;
  specialistCount: number;    // 전문의 수
}

/** 간호등급정보 */
export interface NursingGradeInfo {
  ykiho: string;
  hospitalName: string;
  nursingGrade: string;       // 간호등급
  nursingGradeCode: string;
}

/** 전문병원지정분야 */
export interface SpecialHospitalInfo {
  ykiho: string;
  hospitalName: string;
  specialFieldName: string;   // 전문분야명
  specialFieldCode: string;
}

/** 기타인력수 */
export interface OtherStaffInfo {
  ykiho: string;
  hospitalName: string;
  staffType: string;          // 인력유형 (약사, 한약사, 물리치료사 등)
  staffTypeCode: string;
  staffCount: number;         // 인력수
}

/** 의료기관 종합 상세 분석 */
export interface FacilityAnalysisResult {
  ykiho: string;
  hospitalName: string;
  departments: DepartmentInfo[];
  equipment: MedicalEquipmentInfo[];
  specialists: SpecialistCountInfo[];
  facility: FacilityInfo | null;
  detail: DetailInfo | null;
  nursingGrade: NursingGradeInfo | null;
  otherStaff: OtherStaffInfo[];
  specialDiag: SpecialDiagInfo[];
}

// ============================================
// API 설정
// ============================================

const FACILITY_ENDPOINT = process.env.HIRA_FACILITY_API_ENDPOINT || 'https://apis.data.go.kr/B551182/MadmDtlInfoService2.7';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callFacilityApi(
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

    const url = `${FACILITY_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA Facility API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA Facility API 실패 (${operation}):`, err);
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
// 11개 엔드포인트 함수
// ============================================

/** 1. 특수진료정보(진료가능분야조회) */
export const getSpclDiagInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getSpclDiagInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 2. 교통정보 */
export const getTrnsprtInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getTrnsprtInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 3. 세부정보 */
export const getDtlInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getDtlInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 4. 시설정보 */
export const getEqpInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getEqpInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 5. 전문과목별 전문의 수 */
export const getSpcSbjtSdrInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getSpcSbjtSdrInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 6. 진료과목정보 */
export const getDgsbjtInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getDgsbjtInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 7. 의료장비정보 */
export const getMedOftInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getMedOftInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 8. 식대가산정보 */
export const getFoepAddcInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getFoepAddcInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 9. 간호등급정보 */
export const getNursigGrdInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getNursigGrdInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 10. 전문병원지정분야 */
export const getSpclHospAsgFldList = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getSpclHospAsgFldList2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

/** 11. 기타인력수 */
export const getEtcHstInfo = (ykiho: string, p?: Record<string, string | number>) =>
  callFacilityApi('getEtcHstInfo2.7', { ykiho, numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** 진료과목정보 조회 → 정형화 */
export async function fetchDepartments(ykiho: string): Promise<DepartmentInfo[]> {
  const { items } = await getDgsbjtInfo(ykiho);
  return items.map(i => ({
    ykiho,
    hospitalName: String(i.yadmNm || ''),
    departmentCode: String(i.dgsbjtCd || ''),
    departmentName: String(i.dgsbjtCdNm || ''),
  }));
}

/** 의료장비정보 조회 → 정형화 */
export async function fetchEquipment(ykiho: string): Promise<MedicalEquipmentInfo[]> {
  const { items } = await getMedOftInfo(ykiho);
  return items.map(i => ({
    ykiho,
    hospitalName: String(i.yadmNm || ''),
    equipmentName: String(i.typeCdNm || i.eqpNm || ''),
    equipmentCode: String(i.typeCd || ''),
    equipmentCount: Number(i.eqpCnt || i.cnt || 1),
  }));
}

/** 전문과목별 전문의 수 조회 → 정형화 */
export async function fetchSpecialists(ykiho: string): Promise<SpecialistCountInfo[]> {
  const { items } = await getSpcSbjtSdrInfo(ykiho);
  return items.map(i => ({
    ykiho,
    hospitalName: String(i.yadmNm || ''),
    departmentCode: String(i.dgsbjtCd || i.sdrSbjtCd || ''),
    departmentName: String(i.dgsbjtCdNm || i.sdrSbjtCdNm || ''),
    specialistCount: Number(i.sdrCnt || i.cnt || 0),
  }));
}

/** 시설정보 조회 → 정형화 */
export async function fetchFacility(ykiho: string): Promise<FacilityInfo | null> {
  const { items } = await getEqpInfo(ykiho);
  if (items.length === 0) return null;
  const i = items[0];
  return {
    ykiho,
    hospitalName: String(i.yadmNm || ''),
    totalBeds: Number(i.cmdcBdCnt || i.sickbdCnt || 0),
    icuBeds: Number(i.icuBdCnt || 0),
    operatingRooms: Number(i.oprRmCnt || 0),
    deliveryRooms: Number(i.dlvrRmCnt || 0),
  };
}

/** 세부정보 조회 → 정형화 */
export async function fetchDetail(ykiho: string): Promise<DetailInfo | null> {
  const { items } = await getDtlInfo(ykiho);
  if (items.length === 0) return null;
  const i = items[0];
  return {
    ykiho,
    hospitalName: String(i.yadmNm || ''),
    weekdayOpen: String(i.trmtMonStart || ''),
    weekdayClose: String(i.trmtMonEnd || ''),
    satOpen: String(i.trmtSatStart || ''),
    satClose: String(i.trmtSatEnd || ''),
    sunOpen: String(i.trmtSunStart || ''),
    sunClose: String(i.trmtSunEnd || ''),
    holidayOpen: String(i.trmtHolStart || ''),
    holidayClose: String(i.trmtHolEnd || ''),
    lunchStart: String(i.lunchStart || ''),
    lunchEnd: String(i.lunchEnd || ''),
    parkingInfo: String(i.parkXpnsYn || ''),
    parkingCount: Number(i.parkEtc || 0),
  };
}

/** 기타인력수 조회 → 정형화 */
export async function fetchOtherStaff(ykiho: string): Promise<OtherStaffInfo[]> {
  const { items } = await getEtcHstInfo(ykiho);
  return items.map(i => ({
    ykiho,
    hospitalName: String(i.yadmNm || ''),
    staffType: String(i.hstCdNm || i.etcHstNm || ''),
    staffTypeCode: String(i.hstCd || ''),
    staffCount: Number(i.hstCnt || i.cnt || 0),
  }));
}

/** 특수진료정보 조회 → 정형화 */
export async function fetchSpecialDiag(ykiho: string): Promise<SpecialDiagInfo[]> {
  const { items } = await getSpclDiagInfo(ykiho);
  return items.map(i => ({
    ykiho,
    hospitalName: String(i.yadmNm || ''),
    specialDiagName: String(i.spclDiagNm || i.srchTypeCdNm || ''),
    specialDiagCode: String(i.spclDiagCd || i.srchTypeCd || ''),
  }));
}

/** 의료기관 종합 상세 분석 (7개 API 병렬 호출) */
export async function fetchFacilityAnalysis(ykiho: string): Promise<FacilityAnalysisResult> {
  const [departments, equipment, specialists, facility, detail, otherStaff, specialDiag] = await Promise.all([
    fetchDepartments(ykiho),
    fetchEquipment(ykiho),
    fetchSpecialists(ykiho),
    fetchFacility(ykiho),
    fetchDetail(ykiho),
    fetchOtherStaff(ykiho),
    fetchSpecialDiag(ykiho),
  ]);

  // 간호등급은 별도
  const { items: nursingItems } = await getNursigGrdInfo(ykiho);
  const nursingGrade: NursingGradeInfo | null = nursingItems.length > 0 ? {
    ykiho,
    hospitalName: String(nursingItems[0].yadmNm || ''),
    nursingGrade: String(nursingItems[0].nursigGrdCdNm || nursingItems[0].nursigGrd || ''),
    nursingGradeCode: String(nursingItems[0].nursigGrdCd || ''),
  } : null;

  return {
    ykiho,
    hospitalName: departments[0]?.hospitalName || specialists[0]?.hospitalName || '미상',
    departments,
    equipment,
    specialists,
    facility,
    detail,
    nursingGrade,
    otherStaff,
    specialDiag,
  };
}
