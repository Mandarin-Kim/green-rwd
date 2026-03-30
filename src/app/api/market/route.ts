import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // Prismaë¥¼ íµí ë§ì¼í ìº íì¸ ë°ì´í° ì¡°í
    const marketData = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        targetAudience: true,
        status: true,
        performanceMetrics: true,
        createdAt: true,
      },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: marketData,
      count: marketData.length,
    })
  } catch (err) {
    // ìë¬ ë°ì ì fallback ë°ì´í° ë°í
    return NextResponse.json({
      success: false,
      error: 'Error fetching market data',
      fallbackData: {
        data: [
          {
            id: 'campaign-001',
            name: 'ë§ì¼í ìº íì¸ 001',
            targetAudience: 'Healthcare Professionals',
            status: 'ACTIVE',
            performanceMetrics: {
              impressions: 15000,
              clicks: 850,
              conversions: 42,
            },
            createdAt: new Date().toISOString(),
          },
        ],
        message: 'Using fallback data',
      },
    }, { status: 200 })
  }
}
