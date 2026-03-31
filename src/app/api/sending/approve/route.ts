import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  
  // Admin and Manager only
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const body = await req.json()
    const { id } = body
    
    const sending = await prisma.sendingItem.update(
      { where: { id }, data: { status: 'APPROVED' } }
    )
    return NextResponse.json(sending)
  } catch (err) {
    return NextResponse.json({ error: 'Error approving sending' }, { status: 500 })
  }
}
