import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ageGroups = searchParams.get('ageGroups')?.split(',').filter(Boolean) || []
    const genders = searchParams.get('genders')?.split(',').filter(Boolean) || []
    const regions = searchParams.get('regions')?.split(',').filter(Boolean) || []
    const channels = searchParams.get('channels')?.split(',').filter(Boolean) || []

    const where: Record<string, unknown> = {}
    if (ageGroups.length > 0) where.ageGroup = { in: ageGroups }
    if (genders.length > 0) where.gender = { in: genders }
    if (regions.length > 0) where.region = { in: regions }
    if (channels.length > 0) where.channel = { in: channels }

    const records = await prisma.rWDRecord.findMany({ where })

    return NextResponse.json({
      records,
      total: records.length,
      costPerPerson: 4720
    })
  } catch (error) {
    console.error('RWD GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}