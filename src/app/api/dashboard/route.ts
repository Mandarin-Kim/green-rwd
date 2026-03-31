import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // 전체 시스템 통계
    const totalCampaigns = await prisma.campaign.count()
    const activeCampaigns = await prisma.campaign.count({
      where: { status: 'ACTIVE' },
    })
    const totalSubjects = await prisma.subject.count()
    const totalSendings = await prisma.sending.count()

    // 최근 활동 로그
    const recentActivities = await prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        entity: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      totalCampaigns,
      activeCampaigns,
      totalSubjects,
      totalSendings,
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    // 에러 발생 시 fallback 데이터 반환
    return NextResponse.json({
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalSubjects: 0,
      totalSendings: 0,
      recentActivities: [],
    })
  }
}
