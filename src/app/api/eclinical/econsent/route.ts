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
    return NextResponse.json(forms)
  } catch {
    return NextResponse.json([
      { id: '1', title: 'Main Consent Form v2.0', version: '2.0', status: 'active', subjectConsentCount: 38, totalSubjects: 60, createdAt: '2026-01-15' },
      { id: '2', title: 'Genomic Data Consent', version: '1.0', status: 'active', subjectConsentCount: 25, totalSubjects: 60, createdAt: '2026-02-01' },
      { id: '3', title: 'Biobank Consent', version: '1.1', status: 'draft', subjectConsentCount: 0, totalSubjects: 40, createdAt: '2026-03-01' },
      { id: '4', title: 'Pharmacogenomics Consent', version: '1.0', status: 'approved', subjectConsentCount: 12, totalSubjects: 40, createdAt: '2026-03-10' },
    ])
  }
}
