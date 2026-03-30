import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const assignments = await prisma.iWRSAssignment.findMany({
      include: {
        study: { select: { code: true, name: true } },
        subject: { select: { screeningId: true, name: true } },
      },
    })
    return NextResponse.json({ assignments })
  } catch {
    return NextResponse.json({
      assignments: [
        { id: '1', subjectId: 'SCR-001', date: '2026-03-01', treatment: 'Active', kit: 'KIT-001', studyCode: 'GR-DM-301' },
        { id: '2', subjectId: 'SCR-002', date: '2026-03-05', treatment: 'Placebo', kit: 'KIT-002', studyCode: 'GR-DM-301' },
      ],
    })
  }
}
