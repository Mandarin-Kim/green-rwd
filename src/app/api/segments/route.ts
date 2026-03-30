import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const segments = await prisma.segment.findMany()
    return NextResponse.json(segments)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching segments' }, { status: 500 })
  }
}
