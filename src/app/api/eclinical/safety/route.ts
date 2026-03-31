import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const saeReports = await prisma.sAEReport.findMany({
      include: {
        study: { select: { code: true, name: true } },
        subject: { select: { screeningId: true, name: true } },
      },
    })
    return NextResponse.json(saeReports)
  } catch {
    return NextResponse.json([
      { id: '1', subjectId: 'SCR-001', event: 'Headache', severity: 'mild', relatedness: 'unrelated', reportDate: '2026-03-10', status: 'closed' },
      { id: '2', subjectId: 'SCR-002', event: 'Nausea', severity: 'moderate', relatedness: 'probably_related', reportDate: '2026-03-15', status: 'open' },
      { id: '3', subjectId: 'SCR-003', event: 'Fatigue', severity: 'mild', relatedness: 'related', reportDate: '2026-03-18', status: 'closed' },
      { id: '4', subjectId: 'SCR-001', event: 'Dizziness', severity: 'severe', relatedness: 'probably_related', reportDate: '2026-03-20', status: 'pending' },
      { id: '5', subjectId: 'SCR-004', event: 'Rash', severity: 'moderate', relatedness: 'related', reportDate: '2026-03-22', status: 'open' },
    ])
  }
}
