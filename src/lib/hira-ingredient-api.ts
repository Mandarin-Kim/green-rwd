/**
 * HIRA 의약품성분약효정보조회서비스 OpenAPI 연동 모듈
 * 건강보험심사평가원 의약품성분약효정보조회서비스 1개 엔드포인트
 *
 * 엔드포인트:
 * 1. getMajorCmpnNmCdList - 주성분명칭코드목록조회
 *    (일반명코드, 약효분류번호, 함량내용, 투여경로, 제형구분코드, 분류명)
 *
 * 활용: 주성분 기반 경쟁 약품 분석, 약효분류별 시장 규모,
 *       투여경로/제형별 처방 패턴, 성분→약품→처방 연결 분석
 */

// ============================================
// 타입 정의
// ============================================

/** 주성분 약효 정보 */
export interface IngredientInfo {
  generalNameCode: string;     // 일반명코드
  generalName: string;         // 일반명
  efficacyClassCode: string;   // 약효분류번호
  efficacyClassName: string;   // 약효분류명
  ingredientContent: string;   // 함량내용
  dosageRoute: string;         // 투여경로 (경구, 주사, 외용 등)
  dosageRouteCode: string;     // 투여경로코드
  formCode: string;            // 제형구분코드
  formName: string;            // 제형구분명 (정제, 캡슐, 주사 등)
}

/** 검색 조건 */
export interface IngredientSearchParams {
  gnlNmCd?: string;            // 일반명코드
  meftDivNo?: string;          // 약효분류번호
  gnlNmNm?: string;            // 일반명 (검색)
  numOfRows?: number;
  pageNo?: number;
}

/** 약효분류별 통계 */
export interface EfficacyClassStats {
  efficacyClassCode: string;
  efficacyClassName: string;
  ingredientCount: number;     // 소속 성분 수
  dosageRoutes: string[];      // 투여경로 목록
  forms: string[];             // 제형 목록
}

// ============================================
// API 설정
// ============================================

const INGREDIENT_ENDPOINT = process.env.HIRA_INGREDIENT_API_ENDPOINT || 'https://apis.data.go.kr/B551182/msupCmpnMeftInfoService';
const HIRA_KEY = process.env.HIRA_API_KEY || '';
const TIMEOUT = 10000;

// ============================================
// 공통 API 호출
// ============================================

async function callIngredientApi(
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

    const url = `${INGREDIENT_ENDPOINT}/${operation}?${searchParams.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`HIRA Ingredient API ${res.status}: ${operation}`);
      return { items: [], totalCount: 0 };
    }

    const xml = await res.text();
    return parseXml(xml);
  } catch (err) {
    console.error(`HIRA Ingredient API 실패 (${operation}):`, err);
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

/** 주성분명칭코드목록조회 */
export const getMajorCmpnNmCdList = (p?: Record<string, string | number>) =>
  callIngredientApi('getMajorCmpnNmCdList', { numOfRows: 100, pageNo: 1, ...p });

// ============================================
// 리포트용 분석 함수
// ============================================

/** XML → IngredientInfo 변환 */
function toIngredientInfo(item: Record<string, string | number>): IngredientInfo {
  return {
    generalNameCode: String(item.gnlNmCd || ''),
    generalName: String(item.gnlNmNm || item.gnlNm || ''),
    efficacyClassCode: String(item.meftDivNo || ''),
    efficacyClassName: String(item.meftDivNm || ''),
    ingredientContent: String(item.cntntQy || item.dosageContent || ''),
    dosageRoute: String(item.doseFrmNm || item.adminRoute || ''),
    dosageRouteCode: String(item.doseFrmCd || ''),
    formCode: String(item.fomlCd || item.formCd || ''),
    formName: String(item.fomlCdNm || item.formNm || ''),
  };
}

/** 일반명(성분명)으로 검색 */
export async function searchIngredientsByName(name: string): Promise<IngredientInfo[]> {
  const { items } = await getMajorCmpnNmCdList({ gnlNmNm: name });
  return items.map(toIngredientInfo);
}

/** 일반명코드로 검색 */
export async function searchIngredientsByCode(code: string): Promise<IngredientInfo[]> {
  const { items } = await getMajorCmpnNmCdList({ gnlNmCd: code });
  return items.map(toIngredientInfo);
}

/** 약효분류번호로 같은 분류 성분 조회 (경쟁 성분 분석) */
export async function searchIngredientsByEfficacy(meftDivNo: string): Promise<IngredientInfo[]> {
  const { items } = await getMajorCmpnNmCdList({ meftDivNo, numOfRows: 500 });
  return items.map(toIngredientInfo);
}

/** 약효분류별 통계 생성 */
export function analyzeByEfficacyClass(ingredients: IngredientInfo[]): EfficacyClassStats[] {
  const classMap = new Map<string, {
    name: string;
    count: number;
    routes: Set<string>;
    forms: Set<string>;
  }>();

  ingredients.forEach(i => {
    const key = i.efficacyClassCode || '미분류';
    const existing = classMap.get(key) || {
      name: i.efficacyClassName || '미분류',
      count: 0,
      routes: new Set<string>(),
      forms: new Set<string>(),
    };
    existing.count++;
    if (i.dosageRoute) existing.routes.add(i.dosageRoute);
    if (i.formName) existing.forms.add(i.formName);
    classMap.set(key, existing);
  });

  return Array.from(classMap.entries())
    .map(([code, data]) => ({
      efficacyClassCode: code,
      efficacyClassName: data.name,
      ingredientCount: data.count,
      dosageRoutes: Array.from(data.routes),
      forms: Array.from(data.forms),
    }))
    .sort((a, b) => b.ingredientCount - a.ingredientCount);
}

/** 투여경로별 성분 분포 */
export function analyzeByDosageRoute(ingredients: IngredientInfo[]): { route: string; count: number }[] {
  const routeMap = new Map<string, number>();
  ingredients.forEach(i => {
    const key = i.dosageRoute || '미상';
    routeMap.set(key, (routeMap.get(key) || 0) + 1);
  });
  return Array.from(routeMap.entries())
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count);
}

/** 제형별 성분 분포 */
export function analyzeByForm(ingredients: IngredientInfo[]): { form: string; count: number }[] {
  const formMap = new Map<string, number>();
  ingredients.forEach(i => {
    const key = i.formName || '미상';
    formMap.set(key, (formMap.get(key) || 0) + 1);
  });
  return Array.from(formMap.entries())
    .map(([form, count]) => ({ form, count }))
    .sort((a, b) => b.count - a.count);
}
