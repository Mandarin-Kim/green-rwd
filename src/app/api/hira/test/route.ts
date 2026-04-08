/**
 * /api/hira/test - HIRA API 연결 진단 엔드포인트
 *
 * 수정된 오퍼레이션명으로 각 HIRA API 서비스 엔드포인트를 테스트합니다.
 *
 * 올바른 오퍼레이션명 (data.go.kr 15119055):
 * 1. getDissNameCodeList1 - 질병명코드조회
 * 2. getDissGenderTpInfo - 성별입원외래
 * 3. getDissGenderAgeInfo - 성별연령별
 * 4. getDissItyInfo - 의료기관종별
 * 5. getDissAreaInfo - 시도별
 */

import { NextResponse } from 'next/server';

const HIRA_KEY = process.env.HIRA_API_KEY || '';

// 테스트할 엔드포인트 목록 (수정된 오퍼레이션명)
const TEST_ENDPOINTS = [
  // ── 질병정보서비스 (수정된 오퍼레이션명) ──
  {
    name: '질병명코드조회 (getDissNameCodeList1)',
    url: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList1',
    params: { sickType: 1, medTp: 1, diseaseType: 'SICK_NM', searchText: '당뇨', numOfRows: '3', pageNo: '1' },
  },
  {
    name: '성별입원외래 (getDissGenderTpInfo)',
    url: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissGenderTpInfo',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '10', pageNo: '1' },
  },
  {
    name: '성별연령별 (getDissGenderAgeInfo)',
    url: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissGenderAgeInfo',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '10', pageNo: '1' },
  },
  {
    name: '의료기관종별 (getDissItyInfo)',
    url: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissItyInfo',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '10', pageNo: '1' },
  },
  {
    name: '시도별 (getDissAreaInfo)',
    url: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissAreaInfo',
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '10', pageNo: '1' },
  },
  // ── 기존 작동 확인된 API ──
  {
    name: '약가정보 v1.2 (작동확인됨)',
    url: 'https://apis.data.go.kr/B551182/dgamtCrtrInfoService1.2/getDgamtList',
    params: { numOfRows: '1', pageNo: '1' },
  },
  // ── 의약품사용정보 (수정된 버전) ──
  {
    name: '의약품사용정보 v1.2',
    url: 'https://apis.data.go.kr/B551182/msupUserInfoService1.2/getCmpnSick',
    params: { diagYm: '202301', numOfRows: '1', pageNo: '1' },
  },
  // ── 병원정보 ──
  {
    name: '병원정보 v2',
    url: 'https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList',
    params: { sidoCd: '110000', numOfRows: '1', pageNo: '1' },
  },
];

export async function GET() {
  if (!HIRA_KEY) {
    return NextResponse.json({
      success: false,
      error: 'HIRA_API_KEY 환경변수가 설정되지 않았습니다.',
      keyPresent: false,
    });
  }

  const results = [];

  for (const ep of TEST_ENDPOINTS) {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('serviceKey', HIRA_KEY);
      Object.entries(ep.params).forEach(([k, v]) => searchParams.set(k, String(v)));

      const fullUrl = `${ep.url}?${searchParams.toString()}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timer);

      const text = await res.text();
      const hasItems = text.includes('<item>');
      const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
      const totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const errorMatch = text.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/);
      const authMsg = errorMatch ? errorMatch[1] : null;
      const resultCodeMatch = text.match(/<resultCode>(\d+)<\/resultCode>/);
      const resultCode = resultCodeMatch ? resultCodeMatch[1] : null;
      const resultMsgMatch = text.match(/<resultMsg>([^<]*)<\/resultMsg>/);
      const resultMsg = resultMsgMatch ? resultMsgMatch[1] : null;

      results.push({
        name: ep.name,
        status: res.status,
        ok: res.status === 200 && (hasItems || totalCount > 0),
        totalCount,
        hasItems,
        resultCode,
        resultMsg,
        authMsg,
        responsePreview: text.substring(0, 500),
      });
    } catch (error: any) {
      results.push({
        name: ep.name,
        status: 0,
        ok: false,
        error: error.message || String(error),
      });
    }
  }

  const workingEndpoints = results.filter(r => r.ok);

  return NextResponse.json({
    success: true,
    keyPresent: true,
    keyPreview: `${HIRA_KEY.substring(0, 8)}...${HIRA_KEY.substring(HIRA_KEY.length - 4)}`,
    summary: {
      total: results.length,
      working: workingEndpoints.length,
      failed: results.length - workingEndpoints.length,
    },
    results,
  });
}
