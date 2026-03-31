import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const projects = await prisma.project.findMany()
    return NextResponse.json(projects)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching projects' }, { status: 500 })
  }
}
