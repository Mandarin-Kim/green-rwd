import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { indication: { contains: search, mode: 'insensitive' } },
        { pi: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (status && status !== 'all') where.status = status

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Projects GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phase, indication, pi, site, targetN, startDate } = body

    if (!name || !phase || !indication) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        name, phase, indication, pi: pi || '', site: site || '',
        targetN: targetN ? parseInt(String(targetN)) : 0,
        startDate: startDate ? new Date(startDate) : null, status: 'planning'
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Projects POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 })

    if (data.startDate) data.startDate = new Date(data.startDate)
    if (data.endDate) data.endDate = new Date(data.endDate)

    const project = await prisma.project.update({ where: { id }, data })
    return NextResponse.json(project)
  } catch (error) {
    console.error('Projects PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 })

    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Projects DELETE Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}