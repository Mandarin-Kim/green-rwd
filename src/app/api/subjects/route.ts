import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const subjects = await prisma.subject.findMany()
    return NextResponse.json(subjects)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching subjects' }, { status: 500 })
  }
}
