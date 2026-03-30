import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ segments })
  } catch (error) {
    console.error('Segments GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const segment = await prisma.segment.create({ data: body })
    return NextResponse.json(segment, { status: 201 })
  } catch (error) {
    console.error('Segments POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}