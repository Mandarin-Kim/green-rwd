/**
 * /api/hira/test - HIRA API 연결 진단 엔드포인트
 * 통계 API 파라미터 조합 테스트 (sickType, medTp 추가 여부)
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

  // 2. 입원외래 - 파라미터 조합 테스트
  { name: '2a. 입원외래 (기본: sickCd+diagYm)', op: 'getDissByHsptlzFrgnStats1',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '3', pageNo: '1' } },
  { name: '2b. 입원외래 (+sickType=1,medTp=1)', op: 'getDissByHsptlzFrgnStats1',
    params: { sickCd: 'E11', diagYm: '2023', sickType: '1', medTp: '1', numOfRows: '3', pageNo: '1' } },
  { name: '2c. 입원외래 (+sickType=2,medTp=1)', op: 'getDissByHsptlzFrgnStats1',
    params: { sickCd: 'E11', diagYm: '2023', sickType: '2', medTp: '1', numOfRows: '3', pageNo: '1' } },
  { name: '2d. 입원외래 (E11.0, 4단)', op: 'getDissByHsptlzFrgnStats1',
    params: { sickCd: 'E110', diagYm: '2023', numOfRows: '3', pageNo: '1' } },
  { name: '2e. 입원외래 (E11, no diagYm)', op: 'getDissByHsptlzFrgnStats1',
    params: { sickCd: 'E11', numOfRows: '3', pageNo: '1' } },
  { name: '2f. 입원외래 (no sickCd, diagYm only)', op: 'getDissByHsptlzFrgnStats1',
    params: { diagYm: '2023', numOfRows: '3', pageNo: '1' } },
  { name: '2g. 입원외래 (sickType+medTp only)', op: 'getDissByHsptlzFrgnStats1',
    params: { sickType: '1', medTp: '1', numOfRows: '3', pageNo: '1' } },
  { name: '2h. 입원외래 (E11+sickType=1+medTp=1 no diagYm)', op: 'getDissByHsptlzFrgnStats1',
    params: { sickCd: 'E11', sickType: '1', medTp: '1', numOfRows: '3', pageNo: '1' } },

  // 3. 지역별 - 대표 파라미터 조합
  { name: '3a. 지역별 (기본)', op: 'getDissByAreaStats1',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '3', pageNo: '1' } },
  { name: '3b. 지역별 (+sickType+medTp)', op: 'getDissByAreaStats1',
    params: { sickCd: 'E11', diagYm: '2023', sickType: '1', medTp: '1', numOfRows: '3', pageNo: '1' } },
  { name: '3c. 지역별 (no diagYm)', op: 'getDissByAreaStats1',
    params: { sickCd: 'E11', numOfRows: '3', pageNo: '1' } },
  { name: '3d. 지역별 (no sickCd)', op: 'getDissByAreaStats1',
    params: { diagYm: '2023', numOfRows: '3', pageNo: '1' } },
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
        preview: text.substring(0, 400),
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
