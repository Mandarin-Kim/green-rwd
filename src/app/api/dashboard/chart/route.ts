import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/types'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = session.user as SessionUser
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || '7d'

    let daysBack = 7
    if (period === '30d') {
      daysBack = 30
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    startDate.setHours(0, 0, 0, 0)

    let sendingData
    if (user.role === 'SPONSOR') {
      sendingData = await prisma.sending.findMany({
        where: {
          campaign: { userId: user.id },
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          successCount: true,
        },
      })
    } else if (user.role === 'ADMIN') {
      sendingData = await prisma.sending.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          successCount: true,
        },
      })
    } else {
      return NextResponse.json(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Aggregate by date
    const chartData: Record<string, number> = {}

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      chartData[dateStr] = 0
    }

    // Sum up sendings by date
    sendingData.forEach((sending) => {
      const dateStr = sending.createdAt.toISOString().split('T')[0]
      chartData[dateStr] = (chartData[dateStr] || 0) + sending.successCount
    })

    const result = Object.entries(chartData).map(([date, count]) => ({
      date,
      count,
    }))

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Chart data error:', error)
    return NextResponse.json(
      { success: false, error: '차트 데이터 조회 실패' },
      { status: 500 }
    )
  }
}
