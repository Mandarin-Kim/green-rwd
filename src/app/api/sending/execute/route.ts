import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // Admin only
  const userRole = (session.user as { role: string }).role
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id } = body

    const sending = await prisma.sending.update({
      where: { id },
      data: { status: 'EXECUTING', executedAt: new Date() },
    })
    return NextResponse.json(sending)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error executing sending' },
      { status: 500 }
    )
  }
}
