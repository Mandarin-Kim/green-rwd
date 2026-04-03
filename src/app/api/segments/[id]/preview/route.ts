import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import { success, unauthorized, notFound, serverError } from '@/lib/api-response'

interface PatientPreview {
  id: string
  gender?: string | null
  ageGroup?: string | null
  region?: string | null
}

interface PreviewResponse {
  segmentId: string
  totalCount: number
  ageDistribution: Record<string, number>
  genderRatio: Record<string, number>
  regionDistribution: Record<string, number>
  sampleRecords: PatientPreview[]
}

/**
 * GET /api/segments/[id]/preview
 * 세그먼트 매칭 환자 미리보기
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    // 세그먼트 확인
    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
      include: {
        patients: {
          select: {
            patient: {
              select: {
                id: true,
                gender: true,
                ageGroup: true,
                region: true,
              },
            },
          },
        },
      },
    })

    if (!segment) {
      return notFound('세그먼트를 찾을 수 없습니다.')
    }

    // 매칭 환자 전체 추출
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchedPatients = segment.patients.map((ps: any) => ps.patient)

    // 통계 계산
    const ageDistribution: Record<string, number> = {}
    const genderRatio: Record<string, number> = {}
    const regionDistribution: Record<string, number> = {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchedPatients.forEach((patient: any) => {
      // 나이대 분포
      if (patient.ageGroup) {
        ageDistribution[patient.ageGroup] = (ageDistribution[patient.ageGroup] || 0) + 1
      }

      // 성별 비율
      if (patient.gender) {
        genderRatio[patient.gender] = (genderRatio[patient.gender] || 0) + 1
      }

      // 지역 분포
      if (patient.region) {
        regionDistribution[patient.region] =
          (regionDistribution[patient.region] || 0) + 1
      }
    })

    // 샘플 데이터: 무작위로 10명 선택 (또는 전체가 10명 이하면 전체)
    const sampleRecords = matchedPatients
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        id: p.id,
        gender: p.gender,
        ageGroup: p.ageGroup,
        region: p.region,
      }))

    const data: PreviewResponse = {
      segmentId: segment.id,
      totalCount: matchedPatients.length,
      ageDistribution,
      genderRatio,
      regionDistribution,
      sampleRecords,
    }

    return success(data)
  } catch (error) {
    console.error(`[GET /api/segments/${params.id}/preview] Error:`, error)
    return serverError('세그먼트 미리보기 조회 중 오류가 발생했습니다.')
  }
}
