/**
 * /api/reports/enrich-hira
 *
 * HIRA 실측 데이터로 보고서 카탈로그를 업데이트하는 API
 *
 * POST: 전체 또는 특정 보고서를 HIRA 데이터로 enrichment
 * GET: enrichment 상태 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { enrichAllCatalogsWithHira, enrichCatalogWithHira, fetchHiraDataForReport } from '@/lib/hira-report-enricher';

// Vercel serverless function timeout: 최대 60초 (Pro), 10초 (Hobby)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { slug, mode = 'all' } = body as { slug?: string; mode?: string };

    if (slug) {
      // 특정 보고서만 업데이트
      const result = await enrichCatalogWithHira(slug);
      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: {
          patientCount: result.patientCount,
          marketSize: result.marketSize,
        },
      });
    }

    if (mode === 'preview') {
      // 미리보기: 첫 번째 질환만 테스트
      const testSlug = 'type2-diabetes-market-korea-2025';
      const hiraData = await fetchHiraDataForReport(testSlug);
      return NextResponse.json({
        success: !!hiraData,
        message: hiraData
          ? `HIRA API 연결 성공: ${testSlug} → 환자 ${hiraData.patientCount.toLocaleString()}명`
          : 'HIRA API 연결 실패. HIRA_API_KEY 환경변수를 확인하세요.',
        data: hiraData,
      });
    }

    // 전체 업데이트 (비동기 처리)
    const result = await enrichAllCatalogsWithHira();

    return NextResponse.json({
      success: true,
      message: `HIRA 데이터 연동 완료: ${result.success}개 성공, ${result.failed}개 실패, ${result.skipped}개 건너뜀`,
      data: {
        total: result.total,
        success: result.success,
        failed: result.failed,
        skipped: result.skipped,
        results: result.results,
      },
    });
  } catch (error) {
    console.error('[HIRA Enrich] 에러:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'HIRA 데이터 연동 API',
    usage: {
      'POST (전체)': '{ "mode": "all" } - 30개 보고서 전체 HIRA 데이터 연동',
      'POST (미리보기)': '{ "mode": "preview" } - 테스트 1건만 조회',
      'POST (특정)': '{ "slug": "alzheimer-market-korea-2025" } - 특정 보고서만 업데이트',
    },
  });
}
