import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // Prisma를 통한 캔페인 데이터 조회
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        targetName: true,
        targetCount: true,
        status: true,
        type: true,
        startDate: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    // 배열로 직접 반환 (프론트엔드에서 .map() 사용)
    return NextResponse.json(campaigns)
  } catch (err) {
    // 에러 발생 시 빈 배열 반환 (프론트엔드 fallback 처리)
    return NextResponse.json([])
  }
}
