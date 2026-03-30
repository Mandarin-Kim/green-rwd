import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''

    const where: Record<string, unknown> = {}
    if (category) where.category = category

    const settings = await prisma.setting.findMany({ where })

    const grouped: Record<string, Record<string, string>> = {}
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = {}
      grouped[s.category][s.key] = s.value
    }

    return NextResponse.json({ settings: grouped })
  } catch (error) {
    console.error('Settings GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, settings } = body

    if (!category || !settings) {
      return NextResponse.json({ error: 'category와 settings가 필요합니다.' }, { status: 400 })
    }

    const results = await Promise.all(
      Object.entries(settings as Record<string, string>).map(([key, value]) =>
        prisma.setting.upsert({
          where: { category_key: { category, key } },
          update: { value: String(value) },
          create: { category, key, value: String(value) }
        })
      )
    )

    return NextResponse.json({ success: true, updated: results.length })
  } catch (error) {
    console.error('Settings PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}