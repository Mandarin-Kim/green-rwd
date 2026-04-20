import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { countUsersBySegment, queryUsersBySegment, SegmentFilter } from '@/lib/databricks';

/**
 * POST /api/segments/query-databricks
 * 세그먼트 필터 조건으로 Databricks에서 대상 유저 조회
 *
 * Body: SegmentFilter (모든 필드 optional)
 * Query: ?mode=count  → 숫자만 반환 (빠름)
 *        ?mode=full   → 전화번호 목록까지 반환
 */
export async function POST(req: NextRequest) {
  try {
    // 로그인 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // Databricks 환경변수 확인
    if (!process.env.DATABRICKS_HOST || !process.env.DATABRICKS_TOKEN) {
      return NextResponse.json(
        { error: 'Databricks 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body = await req.json() as SegmentFilter;
    const mode = req.nextUrl.searchParams.get('mode') || 'count';

    if (mode === 'count') {
      // 카운트만 반환 (빠른 조회)
      const count = await countUsersBySegment(body);
      return NextResponse.json({ count });
    } else {
      // 전화번호 목록까지 반환
      const result = await queryUsersBySegment(body);
      return NextResponse.json(result);
    }
  } catch (err: unknown) {
    console.error('[Databricks API Error]', err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
