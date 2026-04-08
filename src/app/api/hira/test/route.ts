/**
 * /api/hira/test - HIRA API 연결 진단 엔드포인트
 * 2026-04-08 Swagger UI 확인: 통계 API는 diagYm이 아닌 year 파라미터 사용!
 */

import { NextResponse } from 'next/server';

const HIRA_KEY = process.env.HIRA_API_KEY || '';
const BASE = 'https://apis.data.go.kr/B551182/diseaseInfoService1';

const TEST_ENDPOINTS = [
  // 1. 질병명칭/코드조회 (확인완료)
  {
    name: '1. 질병명칭/코드조회 ✅',
    op: 'getDissNameCodeList1',
    params: { sickType: '1', medTp: '1', diseaseType: 'SICK_NM', searchText: '당뇨', numOfRows: '3', pageNo: '1' },
  },

  // 2. 입원외래별 - year 파라미터 사용 (Swagger 확인)
  { name: '2a. 입원외래 (year=2023, sickCd=E11, sickType=1, medTp=1)',
    op: 'getDissByHsptlzFrgnStats1',
    params: { year: '2023', sickCd: 'E11', sickType: '1', medTp: '1', numOfRows: '5', pageNo: '1' } },
  { name: '2b. 입원외래 (year=2022)',
    op: 'getDissByHsptlzFrgnStats1',
    params: { year: '2022', sickCd: 'E11', sickType: '1', medTp: '1', numOfRows: '5', pageNo: '1' } },

  // 3. 성별연령별 - year 파라미터
  { name: '3a. 성별연령별 (year=2023, E11)',
    op: 'getDissByGenderAgeStats1',
    params: { year: '2023', sickCd: 'E11', sickType: '1', medTp: '1', numOfRows: '5', pageNo: '1' } },

  // 4. 의료기관종별 - year 파라미터
  { name: '4a. 의료기관종별 (year=2023, E11)',
    op: 'getDissByClassesStats1',
    params: { year: '2023', sickCd: 'E11', sickType: '1', medTp: '1', numOfRows: '5', pageNo: '1' } },

  // 5. 지역별 - year 파라미터
  { name: '5a. 지역별 (year=2023, E11)',
    op: 'getDissByAreaStats1',
    params: { year: '2023', sickCd: 'E11', sickType: '1', medTp: '1', numOfRows: '5', pageNo: '1' } },
];

export async function GET() {
  if (!HIRA_KEY) {
    return NextResponse.json({ success: false, error: 'HIRA_API_KEY 없음', keyPresent: false });
  }

  const results = [];

  for (const ep of TEST_ENDPOINTS) {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('serviceKey', HIRA_KEY);
      Object.entries(ep.params).forEach(([k, v]) => searchParams.set(k, v));

      const fullUrl = `${BASE}/${ep.op}?${searchParams.toString()}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timer);

      const text = await res.text();
      const hasItems = text.includes('<item>');
      const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
      const totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const resultCodeMatch = text.match(/<resultCode>(\d+)<\/resultCode>/);
      const resultCode = resultCodeMatch ? resultCodeMatch[1] : null;
      const resultMsgMatch = text.match(/<resultMsg>([^<]*)<\/resultMsg>/);

      results.push({
        name: ep.name,
        op: ep.op,
        params: ep.params,
        status: res.status,
        ok: res.status === 200 && (hasItems || totalCount > 0),
        totalCount,
        hasItems,
        resultCode,
        resultMsg: resultMsgMatch ? resultMsgMatch[1] : null,
        preview: text.substring(0, 500),
      });
    } catch (error: any) {
      results.push({
        name: ep.name,
        op: ep.op,
        params: ep.params,
        status: 0,
        ok: false,
        error: error.message,
      });
    }
  }

  const working = results.filter(r => r.ok);

  return NextResponse.json({
    success: true,
    keyPresent: true,
    keyPreview: `${HIRA_KEY.substring(0, 8)}...${HIRA_KEY.substring(HIRA_KEY.length - 4)}`,
    summary: { total: results.length, working: working.length, failed: results.length - working.length },
    workingOps: working.map(r => ({ name: r.name, op: r.op, params: r.params })),
    results,
  });
}
