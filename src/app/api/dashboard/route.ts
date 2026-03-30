import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      campaignCount,
      activeCampaigns,
      subjectCount,
      pendingSendings,
      recentCampaigns,
      pendingApprovals
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'active' } }),
      prisma.subject.count(),
      prisma.sending.count({ where: { status: 'pending' } }),
      prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, type: true, status: true,
          targetCount: true, openRate: true, startDate: true
        }
      }),
      prisma.sending.findMany({
        where: { status: 'pending' },
        take: 5,
        include: { campaign: { select: { name: true, type: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ])

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentSendings = await prisma.sending.findMany({
      where: { executedAt: { gte: sevenDaysAgo } },
      select: { executedAt: true, sentCount: true, successCount: true }
    })

    return NextResponse.json({
      kpis: {
        totalCampaigns: campaignCount,
        activeCampaigns,
        totalSubjects: subjectCount,
        pendingApprovals: pendingSendings
      },
      recentCampaigns,
      pendingApprovals,
      weeklyStats: recentSendings
    })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}