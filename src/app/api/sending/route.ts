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

    return NextResponse.json(sendings)
  } catch {
    return NextResponse.json([
      { id: '1', campaignId: 'CP-2026-001', totalCount: 1500, executedCount: 0, status: 'pending', approvedAt: '', approvedBy: '' },
      { id: '2', campaignId: 'CP-2026-002', totalCount: 800, executedCount: 800, status: 'completed', approvedAt: '2026-03-20', approvedBy: 'ë³¸ë¶ì¥ë' },
      { id: '3', campaignId: 'CP-2026-003', totalCount: 2000, executedCount: 1200, status: 'executing', approvedAt: '2026-03-25', approvedBy: 'ë³¸ë¶ì¥ë' },
      { id: '4', campaignId: 'CP-2026-004', totalCount: 500, executedCount: 0, status: 'ready', approvedAt: '2026-03-28', approvedBy: 'ë§¤ëì ' },
      { id: '5', campaignId: 'CP-2026-005', totalCount: 1200, executedCount: 0, status: 'pending', approvedAt: '', approvedBy: '' },
    ])
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
      return NextResponse.json({ error: 'IDì actionì´ íìí©ëë¤.' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        updateData.status = 'approved'
        updateData.approvedAt = new Date()
        updateData.approvedBy = 'ë³¸ë¶ì¥ë'
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
        return NextResponse.json({ error: 'ì í¨íì§ ìì action' }, { status: 400 })
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
