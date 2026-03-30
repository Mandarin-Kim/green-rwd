import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const campaigns = await prisma.campaign.findMany(
      { createdById: session.user.id },
      { select: { id: true, name: true, createdAt: true } }
    )
    return NextResponse.json(campaigns)
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  
  try {
    const body = await req.json()
    
    const campaign = await prisma.campaign.create({
      data: {
        ...body,
        createdById: session.user.id,
      },
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: Instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
