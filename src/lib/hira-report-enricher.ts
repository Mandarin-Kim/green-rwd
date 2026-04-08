/**
 * HIRA 데이터 → 보고서 카탈로그 연동 모듈
 *
 * 역할:
 * 1. HIRA API에서 질환별 실측 데이터(환자수, 진료비, 성별, 연령별, 지역별 등) 조회
 * 2. ReportCatalog의 marketSizeKrw, patientPool 등을 실제 수치로 업데이트
 * 3. AI 보고서 생성 시 프롬프트에 주입할 HIRA 데이터 컨텍스트 생성
 *
 * 사용하는 HIRA API 5개 오퍼레이션 (2026-04-08 Swagger 확인):
 * - getDissNameCodeList1       (질병명칭/코드조회)
 * - getDissByHsptlzFrgnStats1  (질병입원외래별통계)
 * - getDissByGenderAgeStats1   (질병성별연령별통계)
 * - getDissByClassesStats1     (질병의료기관종별통계)
 * - getDissByAreaStats1        (질병의료기관지역별통계)
 */

import { PrismaClient } from '@prisma/client';
import {
  getDissNameCodeListByCode,
  fetchDiseaseGenderStats,
  fetchDiseaseAgeStats,
  fetchDiseaseInstitutionStats,
  fetchDiseaseAreaStats,
} from './hira-disease-api';
import { DISEASE_MAPPING, getMappingBySlug, type DiseaseMapping } from './hira-disease-mapping';

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface HiraEnrichmentResult {
  slug: string;
  patientCount: number;          // 총 환자수
  claimAmount: number;           // 요양급여비용 총액 (원)
  visitCount: number;            // 내원일수
  genderStats: Array<{
    gender: string;
    count: number;
    ratio: number;
  }>;
  ageDistribution: Array<{
    ageGroup: string;
    count: number;
    ratio: number;
  }>;
  institutionStats: Array<{
    institutionType: string;
    count: number;
    ratio: number;
  }>;
  regionStats: Array<{
    region: string;
    count: number;
    ratio: number;
  }>;
  dataSource: string;
  fetchedAt: string;
}

export interface HiraReportContext {
  patientSummary: string;
  genderAnalysis: string;
  ageAnalysis: string;
  institutionAnalysis: string;
  regionAnalysis: string;
  rawData: HiraEnrichmentResult;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. HIRA 데이터 조회
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 특정 보고서(slug)에 대한 HIRA 실측 데이터 수집
 */
export async function fetchHiraDataForReport(slug: string): Promise<HiraEnrichmentResult | null> {
  const mapping = getMappingBySlug(slug);
  if (!mapping || mapping.diseaseCodes.length === 0) {
    console.log(`[HIRA Enricher] ${slug}: HIRA 코드 없음, 건너뜀`);
    return null;
  }

  try {
    let totalPatients = 0;
    let totalClaims = 0;
    let totalVisits = 0;
    const allGender: Map<string, number> = new Map();
    const allAge: Map<string, number> = new Map();
    const allInstitution: Map<string, number> = new Map();
    const allRegion: Map<string, number> = new Map();

    // year: HIRA에서 가장 최근 데이터가 있는 연도 사용
    const year = '2023';

    for (const code of mapping.diseaseCodes) {
      console.log(`[HIRA Enricher] ${slug}: 질병코드 ${code} 데이터 조회 시작`);

      // 1) 질병 기본정보 조회 (질병코드로 검색)
      const diseaseResult = await getDissNameCodeListByCode(code);
      if (diseaseResult.items.length > 0) {
        const item = diseaseResult.items[0];
        totalPatients += Number(item.patntCnt || 0);
        totalClaims += Number(item.trsRcptAmt || 0);
        totalVisits += Number(item.rcptCnt || item.visnCnt || 0);
        console.log(`[HIRA Enricher] ${code}: 환자 ${Number(item.patntCnt || 0).toLocaleString()}명`);
      }

      // 2) 성별·입원/외래 통계
      const genderStats = await fetchDiseaseGenderStats(code, year);
      for (const gs of genderStats) {
        allGender.set(gs.gender, (allGender.get(gs.gender) || 0) + gs.totalCount);
      }

      // 3) 연령대별 통계
      const ageStats = await fetchDiseaseAgeStats(code, year);
      for (const as_ of ageStats) {
        allAge.set(as_.ageGroup, (allAge.get(as_.ageGroup) || 0) + as_.patientCount);
      }

      // 4) 의료기관종별 통계
      const instStats = await fetchDiseaseInstitutionStats(code, year);
      for (const is_ of instStats) {
        allInstitution.set(is_.institutionType, (allInstitution.get(is_.institutionType) || 0) + is_.patientCount);
      }

      // 5) 지역별 통계
      const regionStats = await fetchDiseaseAreaStats(code, year);
      for (const rs of regionStats) {
        allRegion.set(rs.regionName, (allRegion.get(rs.regionName) || 0) + rs.patientCount);
      }

      // API 호출 한도를 위한 딜레이
      await delay(500);
    }

    // 비율 계산
    const genderTotal = Array.from(allGender.values()).reduce((s, v) => s + v, 0) || 1;
    const ageTotal = Array.from(allAge.values()).reduce((s, v) => s + v, 0) || 1;
    const instTotal = Array.from(allInstitution.values()).reduce((s, v) => s + v, 0) || 1;
    const regionTotal = Array.from(allRegion.values()).reduce((s, v) => s + v, 0) || 1;

    console.log(`[HIRA Enricher] ${slug}: 조회 완료 - 환자 ${totalPatients.toLocaleString()}명, 급여비 ${formatKrw(totalClaims)}`);

    return {
      slug,
      patientCount: totalPatients,
      claimAmount: totalClaims,
      visitCount: totalVisits,
      genderStats: Array.from(allGender.entries())
        .map(([gender, count]) => ({ gender, count, ratio: Math.round((count / genderTotal) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count),
      ageDistribution: Array.from(allAge.entries())
        .map(([ageGroup, count]) => ({ ageGroup, count, ratio: Math.round((count / ageTotal) * 1000) / 10 }))
        .sort((a, b) => {
          const numA = parseInt(a.ageGroup) || 0;
          const numB = parseInt(b.ageGroup) || 0;
          return numA - numB;
        }),
      institutionStats: Array.from(allInstitution.entries())
        .map(([institutionType, count]) => ({ institutionType, count, ratio: Math.round((count / instTotal) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count),
      regionStats: Array.from(allRegion.entries())
        .map(([region, count]) => ({ region, count, ratio: Math.round((count / regionTotal) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count),
      dataSource: 'HIRA 건강보험심사평가원 보건의료빅데이터',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[HIRA Enricher] ${slug} 데이터 조회 실패:`, error);
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. ReportCatalog 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * HIRA 데이터로 특정 보고서 카탈로그 업데이트
 */
export async function enrichCatalogWithHira(slug: string): Promise<{
  success: boolean;
  patientCount?: number;
  marketSize?: number;
  message: string;
}> {
  const hiraData = await fetchHiraDataForReport(slug);
  if (!hiraData || hiraData.patientCount === 0) {
    return { success: false, message: `${slug}: HIRA 데이터 없음 또는 조회 실패` };
  }

  try {
    // claimAmount(요양급여비용총액)를 시장규모 추정치로 사용
    // 실제 시장규모 = 급여비 + 비급여비(약 20-30% 추가) + 의약품 시장(약 40%)
    const estimatedMarketSize = Math.round(hiraData.claimAmount * 1.6);

    await prisma.reportCatalog.updateMany({
      where: { slug },
      data: {
        patientPool: BigInt(hiraData.patientCount),
        marketSizeKrw: BigInt(estimatedMarketSize),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      patientCount: hiraData.patientCount,
      marketSize: estimatedMarketSize,
      message: `${slug}: 환자 ${hiraData.patientCount.toLocaleString()}명, 시장규모 ${Math.round(estimatedMarketSize / 100000000).toLocaleString()}억원`,
    };
  } catch (error) {
    return { success: false, message: `${slug}: DB 업데이트 실패 - ${error}` };
  }
}

/**
 * 전체 보고서 카탈로그를 HIRA 데이터로 일괄 업데이트
 */
export async function enrichAllCatalogsWithHira(): Promise<{
  total: number;
  success: number;
  failed: number;
  skipped: number;
  results: Array<{ slug: string; success: boolean; message: string }>;
}> {
  const results: Array<{ slug: string; success: boolean; message: string }> = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const mapping of DISEASE_MAPPING) {
    if (mapping.diseaseCodes.length === 0) {
      results.push({ slug: mapping.slug, success: false, message: 'HIRA 코드 없음 (platform 카테고리)' });
      skipped++;
      continue;
    }

    const result = await enrichCatalogWithHira(mapping.slug);
    results.push({ slug: mapping.slug, ...result });

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // API 호출 한도 관리: 각 보고서 사이 1초 대기
    await delay(1000);
  }

  return {
    total: DISEASE_MAPPING.length,
    success,
    failed,
    skipped,
    results,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. AI 보고서 생성용 HIRA 데이터 컨텍스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * AI 프롬프트에 주입할 HIRA 데이터 컨텍스트 생성
 * report-generator.ts에서 사용
 */
export async function buildHiraContext(slug: string): Promise<HiraReportContext | null> {
  const hiraData = await fetchHiraDataForReport(slug);
  if (!hiraData || hiraData.patientCount === 0) {
    return null;
  }

  const mapping = getMappingBySlug(slug);
  const diseaseLabel = mapping?.description || slug;

  // 환자 요약
  const patientSummary = [
    `■ HIRA 실측 데이터 (건강보험심사평가원 2023년 기준)`,
    `  - ${diseaseLabel} 총 환자수: ${hiraData.patientCount.toLocaleString()}명`,
    `  - 요양급여비용 총액: ${formatKrw(hiraData.claimAmount)}`,
    `  - 추정 시장규모(급여+비급여+의약품): ${formatKrw(Math.round(hiraData.claimAmount * 1.6))}`,
    `  - 총 내원일수: ${hiraData.visitCount.toLocaleString()}일`,
  ].join('\n');

  // 성별 분석
  const genderAnalysis = hiraData.genderStats.length > 0
    ? [
        `■ 성별 환자 분포 (HIRA 실측)`,
        ...hiraData.genderStats.map(g => `  - ${g.gender}: ${g.count.toLocaleString()}명 (${g.ratio}%)`),
      ].join('\n')
    : '';

  // 연령대 분석
  const ageAnalysis = hiraData.ageDistribution.length > 0
    ? [
        `■ 연령대별 환자 분포 (HIRA 실측)`,
        ...hiraData.ageDistribution.map(a => `  - ${a.ageGroup}: ${a.count.toLocaleString()}명 (${a.ratio}%)`),
      ].join('\n')
    : '';

  // 의료기관종별 분석
  const institutionAnalysis = hiraData.institutionStats.length > 0
    ? [
        `■ 의료기관종별 환자 분포 (HIRA 실측)`,
        ...hiraData.institutionStats.map(i => `  - ${i.institutionType}: ${i.count.toLocaleString()}명 (${i.ratio}%)`),
      ].join('\n')
    : '';

  // 지역별 분석
  const regionAnalysis = hiraData.regionStats.length > 0
    ? [
        `■ 지역별 환자 분포 (HIRA 실측, 상위 5개 시도)`,
        ...hiraData.regionStats.slice(0, 5).map(r =>
          `  - ${r.region}: ${r.count.toLocaleString()}명 (${r.ratio}%)`
        ),
      ].join('\n')
    : '';

  return {
    patientSummary,
    genderAnalysis,
    ageAnalysis,
    institutionAnalysis,
    regionAnalysis,
    rawData: hiraData,
  };
}

/**
 * AI 프롬프트에 삽입할 전체 HIRA 컨텍스트 문자열 생성
 */
export function formatHiraContextForPrompt(context: HiraReportContext): string {
  const sections = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'HIRA 건강보험심사평가원 실측 데이터',
    '(아래 데이터는 실제 HIRA 보건의료빅데이터에서 조회한 공식 통계입니다)',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    context.patientSummary,
  ];

  if (context.genderAnalysis) sections.push('', context.genderAnalysis);
  if (context.ageAnalysis) sections.push('', context.ageAnalysis);
  if (context.institutionAnalysis) sections.push('', context.institutionAnalysis);
  if (context.regionAnalysis) sections.push('', context.regionAnalysis);

  sections.push(
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '위 HIRA 데이터를 보고서의 근거 데이터로 반드시 활용하세요.',
    '수치를 인용할 때는 "건강보험심사평가원 자료 기준" 이라고 출처를 명시하세요.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  );

  return sections.join('\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸리티
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatKrw(amount: number): string {
  if (amount >= 1_0000_0000_0000) return `${(amount / 1_0000_0000_0000).toFixed(1)}조 원`;
  if (amount >= 1_0000_0000) return `${Math.round(amount / 1_0000_0000).toLocaleString()}억 원`;
  if (amount >= 1_0000) return `${Math.round(amount / 1_0000).toLocaleString()}만 원`;
  return `${amount.toLocaleString()}원`;
}
