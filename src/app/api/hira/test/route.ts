/**
 * /api/hira/test - HIRA API 연결 진단 엔드포인트
 * 2026-04-08 data.go.kr Swagger UI에서 확인한 정확한 오퍼레이션명으로 테스트
 */

import { NextResponse } from 'next/server';

const HIRA_KEY = process.env.HIRA_API_KEY || '';
const BASE = 'https://apis.data.go.kr/B551182/diseaseInfoService1';

// Swagger UI에서 확인한 정확한 5개 오퍼레이션
const TEST_ENDPOINTS = [
  {
    name: '1. 질병명칭/코드조회',
    op: 'getDissNameCodeList1',
    params: { sickType: '1', medTp: '1', diseaseType: 'SICK_NM', searchText: '당뇨', numOfRows: '3', pageNo: '1' },
  },
  {
    name: '2. 질병입원외래별통계',
    op: 'getDissByHsptlzFrgnStats1',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '3', pageNo: '1' },
  },
  {
    name: '3. 질병성별연령별통계',
    op: 'getDissByGenderAgeStats1',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '3', pageNo: '1' },
  },
  {
    name: '4. 질병의료기관종별통계',
    op: 'getDissByClassesStats1',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '3', pageNo: '1' },
  },
  {
    name: '5. 질병의료기관지역별통계',
    op: 'getDissByAreaStats1',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '3', pageNo: '1' },
  },
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
    workingOps: working.map(r => ({ name: r.name, op: r.op })),
    results,
  });
}
