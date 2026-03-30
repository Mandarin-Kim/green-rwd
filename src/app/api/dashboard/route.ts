import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const userRole = session.user.role
    let dashboardData: any = {}

    if (userRole === 'ADMIN') {
      // ê´ë¦¬ì: ì ì²´ ìì¤í íµê³
      const totalUsers = await prisma.user.count()
      const totalCampaigns = await prisma.campaign.count()
      const totalSendingItems = await prisma.sendingItem.count()
      const totalProjects = await prisma.clinicalTrial.count()

      dashboardData = {
        role: 'ADMIN',
        totalUsers,
        totalCampaigns,
        totalSendingItems,
        totalProjects,
        systemStatus: 'operational',
      }
    } else if (userRole === 'MANAGER') {
      // ë§¤ëì : í íµê³ë§
      const campaigns = await prisma.campaign.findMany({
        where: { createdBy: session.user.id },
        select: { id: true, name: true, status: true, createdAt: true },
        take: 10,
      })
      const sendingItems = await prisma.sendingItem.count({
        where: { campaign: { createdBy: session.user.id } }
      })

      dashboardData = {
        role: 'MANAGER',
        campaigns,
        sendingItemsCount: sendingItems,
        recentActivity: [],
      }
    } else {
      // ì¼ë° ì¬ì©ì: ìì ì ë°ì´í°ë§
      dashboardData = {
        role: 'USER',
        userId: session.user.id,
        userEmail: session.user.email,
        quickStats: {
          assignedCampaigns: 0,
          pendingTasks: 0,
        },
      }
    }

    return NextResponse.json(dashboardData)
  } catch (err) {
    // ìë¬ ë°ì ì fallback ë°ì´í° ë°í
    return NextResponse.json({
      role: session.user.role,
      error: 'Database query failed',
      fallbackData: {
        totalUsers: 0,
        totalCampaigns: 0,
        totalSendingItems: 0,
        systemStatus: 'degraded',
      },
    }, { status: 200 })
  }
}
