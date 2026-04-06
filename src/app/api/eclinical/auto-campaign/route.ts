import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser } from '@/types'

/**
 * POST /api/eclinical/auto-campaign
 * 임상시험 기반 리크루팅 캠페인 자동 생성
 * body: { studyId: string }
 *
 * - Study 정보를 읽어 캠페인 이름/목표/콘텐츠를 자동 구성
 * - 상태: DRAFT (나중에 승인 플로우)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = session.user as SessionUser
    if (!['ADMIN', 'SPONSOR'].includes(user.role)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '캠페인 생성 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { studyId } = body

    if (!studyId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'studyId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 임상시험 정보 조회
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: { sites: true },
    })

    if (!study) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '해당 임상시험을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const remaining = study.targetEnrollment - study.currentEnrollment
    const siteNames = study.sites.map(s => s.name).join(', ')

    // 캠페인 자동 생성 (userId 필드 사용 - Prisma Campaign 모델 기준)
    const campaignData: Record<string, unknown> = {
      name: `[리크루팅] ${study.title}`,
      description: `임상시험 ${study.protocolNumber} 기반 자동 생성 캠페인`,
      status: 'DRAFT',
      channelType: 'SMS',
      objective: `${study.indication} 환자 대상 ${study.phase || ''} 임상시험 참여자 모집. 현재 ${study.currentEnrollment}/${study.targetEnrollment}명 등록 완료, 추가 ${remaining}명 모집 필요.`,
      targetCount: remaining,
      contentTitle: `${study.indication} 임상시험 참여 안내`,
      contentBody: `안녕하세요, {이름}님.\n\n현재 ${study.sponsorName || ''}에서 진행 중인 "${study.title}" 임상시험에 참여하실 수 있습니다.\n\n■ 대상: ${study.indication} 환자\n■ 연구 단계: ${study.phase || '-'}\n■ 참여 기관: ${siteNames}\n■ 프로토콜: ${study.protocolNumber}\n\n참여를 원하시면 가까운 참여 기관에 문의해 주세요.\n\n감사합니다.\n그리리본 eClinical`,
      userId: user.id,
    }

    // orgId가 있으면 추가
    if (user.orgId) {
      campaignData.orgId = user.orgId
    }

    const campaign = await prisma.campaign.create({
      data: campaignData as any,
    })

    return NextResponse.json<ApiResponse>(
      { success: true, data: campaign },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/eclinical/auto-campaign] Error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: `캠페인 자동 생성 실패: ${error}` },
      { status: 500 }
    )
  }
}
