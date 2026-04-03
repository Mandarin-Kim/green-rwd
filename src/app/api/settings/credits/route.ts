import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser } from '@/types'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = session.user as SessionUser

    // Get user's org
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        orgId: true,
      },
    })

    if (!userRecord || !userRecord.orgId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '조직을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Get current credit balance
    const org = await prisma.organization.findUnique({
      where: { id: userRecord.orgId },
      select: {
        id: true,
        creditBalance: true,
      },
    })

    if (!org) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '조직을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')

    const skip = (page - 1) * PAGE_SIZE

    // Get credit transactions
    const transactions = await prisma.creditTransaction.findMany({
      where: {
        orgId: userRecord.orgId,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        balance: true,
        description: true,
        reference: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    })

    const total = await prisma.creditTransaction.count({
      where: {
        orgId: userRecord.orgId,
      },
    })

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        currentBalance: org.creditBalance,
        transactions,
      },
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Credits fetch error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '크레딧 정보 조회 실패' },
      { status: 500 }
    )
  }
}
