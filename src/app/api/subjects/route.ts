import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { screeningId: { contains: search, mode: 'insensitive' } },
        { diagnosis: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (status && status !== 'all') where.status = status

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.subject.count({ where })
    ])

    return NextResponse.json({
      subjects,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Subjects GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, age, gender, diagnosis, site, phone, email } = body

    if (!name || !age || !gender || !diagnosis || !site) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    const lastSubject = await prisma.subject.findFirst({
      orderBy: { screeningId: 'desc' }
    })
    const lastNum = lastSubject
      ? parseInt(lastSubject.screeningId.replace('SCR-', ''))
      : 0
    const screeningId = `SCR-${String(lastNum + 1).padStart(4, '0')}`

    const subject = await prisma.subject.create({
      data: {
        screeningId, name, age: parseInt(String(age)), gender, diagnosis, site,
        phone: phone || null, email: email || null, status: 'screening'
      }
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    console.error('Subjects POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    if (data.enrollDate) data.enrollDate = new Date(data.enrollDate)

    const subject = await prisma.subject.update({
      where: { id },
      data
    })

    return NextResponse.json(subject)
  } catch (error) {
    console.error('Subjects PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    await prisma.subject.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subjects DELETE Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}