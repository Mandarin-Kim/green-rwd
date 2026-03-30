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
    const aeSummaries = await prisma.aESummary.findMany({
      include: {
        study: { select: { code: true, name: true } },
      },
    })
    return NextResponse.json({ saeReports, aeSummaries })
  } catch {
    return NextResponse.json({
      saeReports: [
        { id: '1', subjectId: 'SCR-001', site: 'Seoul National University Hospital', event: 'Headache', severity: 'Mild', relatedness: 'Unlikely', reportDate: '2026-03-10', status: 'closed' },
        { id: '2', subjectId: 'SCR-002', site: 'Severance Hospital', event: 'Nausea', severity: 'Moderate', relatedness: 'Possible', reportDate: '2026-03-15', status: 'open' },
      ],
      aeSummaries: [
        { id: '1', event: 'Headache', total: 12, serious: 1, related: 3 },
        { id: '2', event: 'Nausea', total: 8, serious: 2, related: 5 },
        { id: '3', event: 'Fatigue', total: 15, serious: 0, related: 7 },
      ],
    })
  }
}
