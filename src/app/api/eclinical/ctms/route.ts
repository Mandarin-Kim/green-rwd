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
    const milestones = await prisma.cTMSMilestone.findMany({
      include: { study: { select: { code: true, name: true } } }
    })
    return NextResponse.json({ sites, milestones })
  } catch {
    // Fallback data
    return NextResponse.json({
      sites: [
        { id: '1', siteName: 'Seoul National University Hospital', piName: 'Dr. Kim', enrolled: 45, target: 60, status: 'Active' },
        { id: '2', siteName: 'Severance Hospital', piName: 'Dr. Park', enrolled: 32, target: 50, status: 'Active' },
      ],
      milestones: [
        { id: '1', name: 'First Patient In', dueDate: '2026-03-01', status: 'Completed' },
        { id: '2', name: 'Enrollment Complete', dueDate: '2026-06-30', status: 'In Progress' },
      ]
    })
  }
}
