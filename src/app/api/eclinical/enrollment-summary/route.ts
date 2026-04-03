import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // Get all active studies
    const studies = (await prisma.study.findMany({
      select: {
        id: true,
        protocolNumber: true,
        title: true,
        targetEnrollment: true,
        currentEnrollment: true,
        status: true,
        sites: {
          select: {
            id: true,
            targetCount: true,
            enrolledCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })) as Array<{
      id: string
      protocolNumber: string
      title: string
      targetEnrollment: number
      currentEnrollment: number
      status: string
      sites: Array<{ id: string; targetCount: number; enrolledCount: number }>
    }>

    // Calculate summary
    const totalTarget = studies.reduce((sum, study) => sum + study.targetEnrollment, 0)
    const totalEnrolled = studies.reduce((sum, study) => sum + study.currentEnrollment, 0)

    // By study breakdown
    const byStudy = studies.map((study) => ({
      studyId: study.id,
      protocolNumber: study.protocolNumber,
      title: study.title,
      status: study.status,
      target: study.targetEnrollment,
      enrolled: study.currentEnrollment,
      percentage:
        study.targetEnrollment > 0
          ? Math.round((study.currentEnrollment / study.targetEnrollment) * 100)
          : 0,
      sites: study.sites.map((site) => ({
        siteId: site.id,
        target: site.targetCount,
        enrolled: site.enrolledCount,
      })),
    }))

    // By site breakdown (across all studies)
    const allSites = (await prisma.site.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        targetCount: true,
        enrolledCount: true,
        study: {
          select: {
            protocolNumber: true,
            title: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })) as Array<{
      id: string
      name: string
      code: string
      targetCount: number
      enrolledCount: number
      study: { protocolNumber: string; title: string } | null
    }>

    const bySite = allSites.map((site) => ({
      siteId: site.id,
      siteName: site.name,
      siteCode: site.code,
      studyProtocol: site.study?.protocolNumber,
      studyTitle: site.study?.title,
      target: site.targetCount,
      enrolled: site.enrolledCount,
      percentage:
        site.targetCount > 0 ? Math.round((site.enrolledCount / site.targetCount) * 100) : 0,
    }))

    const summary = {
      overall: {
        target: totalTarget,
        enrolled: totalEnrolled,
        percentage:
          totalTarget > 0 ? Math.round((totalEnrolled / totalTarget) * 100) : 0,
      },
      byStudy,
      bySite,
      studyCount: studies.length,
      siteCount: allSites.length,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: summary,
    })
  } catch (error) {
    console.error('Enrollment summary error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: '등록 현황 요약 조회 실패' },
      { status: 500 }
    )
  }
}
