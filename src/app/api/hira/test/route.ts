/**
 * /api/hira/test - HIRA API 연결 진단 엔드포인트
 *
 * 각 HIRA API 서비스 엔드포인트가 작동하는지 테스트합니다.
 */

import { NextResponse } from 'next/server';

const HIRA_KEY = process.env.HIRA_API_KEY || '';

// 테스트할 엔드포인트 목록 (서비스명, 오퍼레이션, 파라미터)
const TEST_ENDPOINTS = [
  // 질병정보 - 다양한 버전 시도
  {
    name: '질병정보 v1',
    url: `https://apis.data.go.kr/B551182/diseaseInfoService1/getDissInfoList`,
    params: { dissNm: '당뇨병', numOfRows: '1', pageNo: '1' },
  },
  {
    name: '질병정보 (no ver)',
    url: `https://apis.data.go.kr/B551182/diseaseInfoService/getDissInfoList`,
    params: { dissNm: '당뇨병', numOfRows: '1', pageNo: '1' },
  },
  {
    name: '질병정보 v2',
    url: `https://apis.data.go.kr/B551182/diseaseInfoService2/getDissInfoList`,
    params: { dissNm: '당뇨병', numOfRows: '1', pageNo: '1' },
  },
  // 질병 성별통계
  {
    name: '질병 성별통계 v1',
    url: `https://apis.data.go.kr/B551182/diseaseInfoService1/getDissGenderTpStats`,
    params: { sickCd: 'E11', diagYm: '2023', numOfRows: '1', pageNo: '1' },
  },
  // 의약품사용정보
  {
    name: '의약품사용정보 v1.2',
    url: `https://apis.data.go.kr/B551182/msupUserInfoService1.2/getCmpnSick`,
    params: { diagYm: '202301', numOfRows: '1', pageNo: '1' },
  },
  {
    name: '의약품사용정보 (no ver)',
    url: `https://apis.data.go.kr/B551182/msupUserInfoService/getCmpnSick`,
    params: { diagYm: '202301', numOfRows: '1', pageNo: '1' },
  },
  // 병원정보
  {
    name: '병원정보 v2',
    url: `https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList`,
    params: { sidoCd: '110000', numOfRows: '1', pageNo: '1' },
  },
  // 약가정보
  {
    name: '약가정보 v1.2',
    url: `https://apis.data.go.kr/B551182/dgamtCrtrInfoService1.2/getDgamtList`,
    params: { numOfRows: '1', pageNo: '1' },
  },
  // 질병통계 - 다수진료질병 (대안 API)
  {
    name: '다수진료질병 통계',
    url: `https://apis.data.go.kr/B551182/statDiseaseService/getDiseaseStatList`,
    params: { numOfRows: '1', pageNo: '1' },
  },
  // 건강보험 통계 (대안)
  {
    name: '건강보험 주요통계',
    url: `https://apis.data.go.kr/B551182/statMainService/getStatMainList`,
    params: { numOfRows: '1', pageNo: '1' },
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
      Object.entries(ep.params).forEach(([k, v]) => searchParams.set(k, v));

      const fullUrl = `${ep.url}?${searchParams.toString()}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

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

      results.push({
        name: ep.name,
        status: res.status,
        ok: res.status === 200 && (hasItems || totalCount > 0),
        totalCount,
        hasItems,
        resultCode,
        authMsg,
        responsePreview: text.substring(0, 300),
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
