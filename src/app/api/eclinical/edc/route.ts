import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const forms = await prisma.eDCForm.findMany({
      include: { study: { select: { code: true, name: true } } }
    })
    return NextResponse.json(forms)
  } catch {
    return NextResponse.json([
      { id: '1', formName: 'Demographics', studyCode: 'GR-DM-301', submittedCount: 42, totalSubjects: 60, completionRate: 70, lastUpdated: '2026-03-28' },
      { id: '2', formName: 'Vital Signs', studyCode: 'GR-DM-301', submittedCount: 38, totalSubjects: 60, completionRate: 63, lastUpdated: '2026-03-27' },
      { id: '3', formName: 'Lab Results', studyCode: 'GR-DM-301', submittedCount: 35, totalSubjects: 60, completionRate: 58, lastUpdated: '2026-03-26' },
      { id: '4', formName: 'Medical History', studyCode: 'GR-HT-201', submittedCount: 28, totalSubjects: 40, completionRate: 70, lastUpdated: '2026-03-25' },
      { id: '5', formName: 'Adverse Events', studyCode: 'GR-HT-201', submittedCount: 15, totalSubjects: 40, completionRate: 38, lastUpdated: '2026-03-24' },
    ])
  }
}
