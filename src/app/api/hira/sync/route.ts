/**
 * /api/hira/sync API 라우트
 *
 * 파일 위치: src/app/api/hira/sync/route.ts
 *
 * 기능:
 * - POST: 수동 동기화 실행 (관리자 전용)
 * - GET: 동기화 상태 조회
 *
 * 보안: ADMIN 권한 필요 (NextAuth 세션 체크)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { masterSync, getSyncStatus, syncDrugUsage, syncDiseaseInfo, syncHospitals, syncDrugPrices, syncIngredients } from '@/lib/hira-sync-service';

// ── 관리자 권한 체크 ──
async function checkAdmin() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { authorized: false, error: '로그인이 필요합니다.' };
  }
  // TODO: 실제 ADMIN 권한 체크 로직 추가
  // 현재는 로그인 사용자 모두 허용 (개발 단계)
  return { authorized: true, email: session.user.email };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET: 동기화 상태 조회
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function GET() {
  try {
    const auth = await checkAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const status = await getSyncStatus();

    return NextResponse.json({
      success: true,
      data: {
        summary: status.summary,
        recentLogs: status.recentLogs.map(log => ({
          id: log.id,
          apiName: log.apiName,
          operation: log.operation,
          status: log.status,
          recordCount: log.recordCount,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          errorMessage: log.errorMessage,
        })),
        latestByApi: status.latestByApi,
      },
    });
  } catch (error) {
    console.error('[SYNC API] GET 에러:', error);
    return NextResponse.json(
      { success: false, error: '동기화 상태 조회 실패' },
      { status: 500 }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST: 동기화 실행
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SyncRequestBody {
  mode: 'master' | 'drug-usage' | 'disease' | 'hospital' | 'drug-price' | 'ingredient';
  params?: {
    diagYm?: string;
    diseaseCodes?: string[];
    drugNames?: string[];
    sidoCodes?: string[];
    sickCd?: string;
    productName?: string;
    keyword?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body: SyncRequestBody = await request.json();
    const { mode, params = {} } = body;

    let result;

    switch (mode) {
      case 'master':
        // 전체 동기화
        result = await masterSync({
          diagYm: params.diagYm || '202401',
          diseaseCodes: params.diseaseCodes,
          drugNames: params.drugNames,
          sidoCodes: params.sidoCodes,
        });
        break;

      case 'drug-usage':
        // 의약품사용정보만
        result = await syncDrugUsage({
          diagYm: params.diagYm || '202401',
        });
        break;

      case 'disease':
        // 특정 질병정보
        if (!params.sickCd) {
          return NextResponse.json(
            { error: '질병코드(sickCd)가 필요합니다.' },
            { status: 400 }
          );
        }
        result = await syncDiseaseInfo(params.sickCd, params.diagYm);
        break;

      case 'hospital':
        // 병원정보 (시도별)
        result = await syncHospitals(params.sidoCodes?.[0]);
        break;

      case 'drug-price':
        // 약가정보
        if (!params.productName) {
          return NextResponse.json(
            { error: '약품명(productName)이 필요합니다.' },
            { status: 400 }
          );
        }
        result = await syncDrugPrices(params.productName);
        break;

      case 'ingredient':
        // 성분정보
        if (!params.keyword) {
          return NextResponse.json(
            { error: '검색어(keyword)가 필요합니다.' },
            { status: 400 }
          );
        }
        result = await syncIngredients(params.keyword);
        break;

      default:
        return NextResponse.json(
          { error: `알 수 없는 동기화 모드: ${mode}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      mode,
      result,
      syncedAt: new Date().toISOString(),
      syncedBy: auth.email,
    });
  } catch (error) {
    console.error('[SYNC API] POST 에러:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
