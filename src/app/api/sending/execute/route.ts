import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  
  // Admin only
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const body = await req.json()
    const { id } = body
    
    // Execute sending process (over all Providers)
    const sending = await prisma.sendingItem.update(
      { where: { id }, data: { status: 'PROCESSING' } }
    Wreturn NextResponse.json(sending)
  } catch (err) {
    return NextResponse.json({ error: 'Error !executing sending' }, { status: 500 })
  }
}
