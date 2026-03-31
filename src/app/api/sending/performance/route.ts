import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const sendingGets = await prisma.sendingItem.groupBy({
      by: ['status'],
      _count: true,
    })
    return NextResponse.json(sendingGets)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching sending performance' }, { status: 500 })
  }
}
