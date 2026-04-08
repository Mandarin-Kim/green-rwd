/**
 * /api/hira/test - HIRA API 연결 진단 엔드포인트
 * 다양한 오퍼레이션명 변형을 테스트하여 올바른 API명을 찾습니다.
 */

import { NextResponse } from 'next/server';

const HIRA_KEY = process.env.HIRA_API_KEY || '';
const BASE = 'https://apis.data.go.kr/B551182/diseaseInfoService1';

// 질병코드 E11(2형당뇨) 기준으로 다양한 오퍼레이션명 테스트
const TEST_ENDPOINTS = [
  // ── 질병명코드조회 (확인됨) ──
  { name: '질병명코드조회 (확인됨)', op: 'getDissNameCodeList1', params: { sickType: '1', medTp: '1', diseaseType: 'SICK_NM', searchText: '당뇨', numOfRows: '3', pageNo: '1' } },

  // ── 성별입원외래 - 변형 시도 ──
  { name: '성별입원외래 v1', op: 'getDissGenderTpInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별입원외래 v2 (+1)', op: 'getDissGenderTpInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별입원외래 v3 (Gndr)', op: 'getDissGndrTpInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별입원외래 v4 (Gndr+1)', op: 'getDissGndrTpInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별입원외래 v5 (SexTp)', op: 'getDissSexTpInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별입원외래 v6 (SexTp+1)', op: 'getDissSexTpInfo1', params: { sickCd: 'E11', diagYm: '2023' } },

  // ── 성별연령별 - 변형 시도 ──
  { name: '성별연령별 v1', op: 'getDissGenderAgeInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별연령별 v2 (+1)', op: 'getDissGenderAgeInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별연령별 v3 (Gndr)', op: 'getDissGndrAgeInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별연령별 v4 (Gndr+1)', op: 'getDissGndrAgeInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별연령별 v5 (SexAge)', op: 'getDissSexAgeInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '성별연령별 v6 (SexAge+1)', op: 'getDissSexAgeInfo1', params: { sickCd: 'E11', diagYm: '2023' } },

  // ── 의료기관종별 - 변형 시도 ──
  { name: '의료기관종별 v1', op: 'getDissItyInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '의료기관종별 v2 (+1)', op: 'getDissItyInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '의료기관종별 v3 (Cl)', op: 'getDissClInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '의료기관종별 v4 (Cl+1)', op: 'getDissClInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '의료기관종별 v5 (Inst)', op: 'getDissInstTpInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '의료기관종별 v6 (Inst+1)', op: 'getDissInstTpInfo1', params: { sickCd: 'E11', diagYm: '2023' } },

  // ── 시도별 - 변형 시도 ──
  { name: '시도별 v1', op: 'getDissAreaInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '시도별 v2 (+1)', op: 'getDissAreaInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '시도별 v3 (Sido)', op: 'getDissSidoInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '시도별 v4 (Sido+1)', op: 'getDissSidoInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '시도별 v5 (Rgn)', op: 'getDissRgnInfo', params: { sickCd: 'E11', diagYm: '2023' } },
  { name: '시도별 v6 (Rgn+1)', op: 'getDissRgnInfo1', params: { sickCd: 'E11', diagYm: '2023' } },
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
      searchParams.set('numOfRows', '3');
      searchParams.set('pageNo', '1');
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
        preview: text.substring(0, 300),
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
