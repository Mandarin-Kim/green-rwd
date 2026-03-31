import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // Prismaë¥¼ íµí ìº íì¸ ë°ì´í° ì¡°í
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

    // ë°°ì´ë¡ ì§ì  ë°í (íë¡ í¸ìëìì .map() ì¬ì©)
    return NextResponse.json(campaigns)
  } catch (err) {
    // ìë¬ ë°ì ì ë¹ ë°°ì´ ë°í (íë¡ í¸ìë fallback ì²ë¦¬)
    return NextResponse.json([])
  }
}
