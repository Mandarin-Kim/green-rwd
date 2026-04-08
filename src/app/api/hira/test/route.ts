/**
 * /api/hira/test - HIRA API 연결 진단 엔드포인트
 * 2026-04-08 data.go.kr Swagger UI에서 확인한 정확한 오퍼레이션명으로 테스트
 * diagYm 형식 변형도 함께 테스트 (YYYY vs YYYYMM)
 */

import { NextResponse } from 'next/server';

const HIRA_KEY = process.env.HIRA_API_KEY || '';
const BASE = 'https://apis.data.go.kr/B551182/diseaseInfoService1';

// 5개 정확한 오퍼레이션 + diagYm 형식 변형 테스트
const TEST_ENDPOINTS = [
  // 1. 질병명칭/코드조회 (확인 완료)
  {
    name: '1. 질병명칭/코드조회',
    op: 'getDissNameCodeList1',
    params: { sickType: '1', medTp: '1', diseaseType: 'SICK_NM', searchText: '당뇨', numOfRows: '3', pageNo: '1' },
  },

  // 2. 질병입원외래별통계 - diagYm 형식 변형
  { name: '2a. 입원외래 diagYm=2023', op: 'getDissByHsptlzFrgnStats1', params: { sickCd: 'E11', diagYm: '2023', numOfRows: '3', pageNo: '1' } },
  { name: '2b. 입원외래 diagYm=202301', op: 'getDissByHsptlzFrgnStats1', params: { sickCd: 'E11', diagYm: '202301', numOfRows: '3', pageNo: '1' } },
  { name: '2c. 입원외래 diagYm=202306', op: 'getDissByHsptlzFrgnStats1', params: { sickCd: 'E11', diagYm: '202306', numOfRows: '3', pageNo: '1' } },
  { name: '2d. 입원외래 diagYm=202312', op: 'getDissByHsptlzFrgnStats1', params: { sickCd: 'E11', diagYm: '202312', numOfRows: '3', pageNo: '1' } },
  { name: '2e. 입원외래 diagYm=2022', op: 'getDissByHsptlzFrgnStats1', params: { sickCd: 'E11', diagYm: '2022', numOfRows: '3', pageNo: '1' } },
  { name: '2f. 입원외래 diagYm=202206', op: 'getDissByHsptlzFrgnStats1', params: { sickCd: 'E11', diagYm: '202206', numOfRows: '3', pageNo: '1' } },

  // 3. 성별연령별 - diagYm 형식 변형 (대표 2가지만)
  { name: '3a. 성별연령별 diagYm=202301', op: 'getDissByGenderAgeStats1', params: { sickCd: 'E11', diagYm: '202301', numOfRows: '3', pageNo: '1' } },
  { name: '3b. 성별연령별 diagYm=2022', op: 'getDissByGenderAgeStats1', params: { sickCd: 'E11', diagYm: '2022', numOfRows: '3', pageNo: '1' } },

  // 4. 의료기관종별 - diagYm 형식 변형 (대표 2가지만)
  { name: '4a. 의료기관종별 diagYm=202301', op: 'getDissByClassesStats1', params: { sickCd: 'E11', diagYm: '202301', numOfRows: '3', pageNo: '1' } },
  { name: '4b. 의료기관종별 diagYm=2022', op: 'getDissByClassesStats1', params: { sickCd: 'E11', diagYm: '2022', numOfRows: '3', pageNo: '1' } },

  // 5. 지역별 - diagYm 형식 변형 (대표 2가지만)
  { name: '5a. 지역별 diagYm=202301', op: 'getDissByAreaStats1', params: { sickCd: 'E11', diagYm: '202301', numOfRows: '3', pageNo: '1' } },
  { name: '5b. 지역별 diagYm=2022', op: 'getDissByAreaStats1', params: { sickCd: 'E11', diagYm: '2022', numOfRows: '3', pageNo: '1' } },
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

      results.push({
        name: ep.name,
        op: ep.op,
        params: ep.params,
        status: res.status,
        ok: res.status === 200 && (hasItems || totalCount > 0),
        totalCount,
        hasItems,
        resultCode,
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
