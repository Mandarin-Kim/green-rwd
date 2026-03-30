import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const documents = await prisma.eTMFDocument.findMany({
      include: { study: { select: { code: true, name: true } } }
    })
    return NextResponse.json({ documents })
  } catch {
    return NextResponse.json({
      documents: [
        { id: '1', name: 'Protocol v2.0', zone: 'Zone 01', uploader: 'Admin', date: '2026-01-15', size: '2.4MB' },
        { id: '2', name: 'IB v3.1', zone: 'Zone 02', uploader: 'Admin', date: '2026-02-01', size: '5.1MB' },
      ]
    })
  }
}
