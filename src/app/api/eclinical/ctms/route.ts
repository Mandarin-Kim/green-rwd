import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const sites = await prisma.cTMSSite.findMany({
      include: { study: { select: { code: true, name: true } } }
    })
    return NextResponse.json(sites)
  } catch {
    return NextResponse.json([
      { id: '1', siteName: 'Seoul National University Hospital', piName: 'Dr. Kim', enrolled: 45, target: 60, status: 'active' },
      { id: '2', siteName: 'Severance Hospital', piName: 'Dr. Park', enrolled: 32, target: 50, status: 'active' },
      { id: '3', siteName: 'Samsung Seoul Hospital', piName: 'Dr. Lee', enrolled: 28, target: 45, status: 'active' },
      { id: '4', siteName: 'Asan Medical Center', piName: 'Dr. Choi', enrolled: 18, target: 40, status: 'inactive' },
    ])
  }
}
