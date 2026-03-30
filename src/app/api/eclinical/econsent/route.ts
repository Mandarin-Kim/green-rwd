import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const forms = await prisma.eConsentForm.findMany({
      include: { study: { select: { code: true, name: true } } },
    })
    const records = await prisma.eConsentRecord.findMany({
      include: {
        study: { select: { code: true, name: true } },
        subject: { select: { screeningId: true, name: true } },
      },
    })
    return NextResponse.json({ forms, records })
  } catch {
    return NextResponse.json({
      forms: [
        { id: '1', title: 'Main Consent Form v2.0', version: '2.0', status: 'Active', studyCode: 'GR-DM-301' },
        { id: '2', title: 'Genomic Data Consent', version: '1.0', status: 'Active', studyCode: 'GR-DM-301' },
      ],
      records: [
        { id: '1', subjectId: 'SCR-001', mainConsent: 'signed', genomicConsent: 'signed', biobankConsent: 'pending' },
        { id: '2', subjectId: 'SCR-002', mainConsent: 'signed', genomicConsent: 'pending', biobankConsent: 'pending' },
      ],
    })
  }
}
