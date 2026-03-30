import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const campaignId = searchParams.get('campaignId') || ''

    const where: Record<string, unknown> = {}

    if (type === 'approve') {
      where.status = 'pending'
    } else if (type === 'execute') {
      where.status = { in: ['approved', 'executing', 'paused'] }
    } else if (type === 'performance') {
      where.status = 'completed'
    }

    if (campaignId) where.campaignId = campaignId

    const sendings = await prisma.sending.findMany({
      where,
      include: { campaign: { select: { name: true, type: true, targetCount: true } } },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ sendings })
  } catch (error) {
    console.error('Sending GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId, totalCount } = body

    const sending = await prisma.sending.create({
      data: {
        campaignId,
        totalCount: totalCount || 0,
        status: 'pending'
      }
    })

    return NextResponse.json(sending, { status: 201 })
  } catch (error) {
    console.error('Sending POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'ID와 action이 필요합니다.' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        updateData.status = 'approved'
        updateData.approvedAt = new Date()
        updateData.approvedBy = '본부장님'
        break
      case 'reject':
        updateData.status = 'rejected'
        break
      case 'execute':
        updateData.status = 'executing'
        updateData.executedAt = new Date()
        break
      case 'pause':
        updateData.status = 'paused'
        break
      case 'resume':
        updateData.status = 'executing'
        break
      case 'complete':
        updateData.status = 'completed'
        updateData.completedAt = new Date()
        break
      default:
        return NextResponse.json({ error: '유효하지 않은 action' }, { status: 400 })
    }

    const sending = await prisma.sending.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(sending)
  } catch (error) {
    console.error('Sending PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}