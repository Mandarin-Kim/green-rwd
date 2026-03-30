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
    return NextResponse.json({ forms })
  } catch {
    return NextResponse.json({
      forms: [
        { id: '1', formName: 'Demographics', studyCode: 'GR-DM-301' },
        { id: '2', formName: 'Vital Signs', studyCode: 'GR-DM-301' },
        { id: '3', formName: 'Lab Results', studyCode: 'GR-DM-301' },
      ]
    })
  }
}
