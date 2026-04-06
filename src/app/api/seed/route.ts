import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, SessionUser } from '@/types'

/**
 * POST /api/seed
 * 데모 데이터 시드 (Admin 전용)
 * - ReportCatalog 10건
 * - Study 5건 + Site 각 2~3개
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
    if (user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // --- ReportCatalog 시드 ---
    const reportSeeds = [
      {
        title: '심부전(HFrEF) 치료제 시장 분석 2026',
        slug: 'hfref-market-2026',
        description: 'ARNI, SGLT2i 등 심부전 치료제의 국내 시장규모, 처방 패턴, 경쟁 구도를 분석한 보고서입니다.',
        categories: ['질환별', '시장규모'],
        therapeuticArea: '심혈관',
        drugName: 'Entresto (Sacubitril/Valsartan)',
        indication: '심부전 (HFrEF)',
        region: 'KR',
        marketSizeKrw: BigInt(320000000000),
        patientPool: 85000,
        availableTiers: ['BASIC', 'PRO', 'PREMIUM'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
      {
        title: '제2형 당뇨병 GLP-1 RA 시장 전망',
        slug: 'dm2-glp1ra-market',
        description: 'GLP-1 수용체 작용제(세마글루타이드, 둘라글루타이드 등)의 시장 성장성과 파이프라인을 분석합니다.',
        categories: ['약물별', '시장규모'],
        therapeuticArea: '내분비',
        drugName: 'Ozempic (Semaglutide)',
        indication: '제2형 당뇨병',
        region: 'KR',
        marketSizeKrw: BigInt(580000000000),
        patientPool: 320000,
        availableTiers: ['BASIC', 'PRO', 'PREMIUM'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
      {
        title: 'NSCLC 면역항암제 경쟁 분석',
        slug: 'nsclc-immunotherapy-competition',
        description: '비소세포폐암(NSCLC) 1차 치료에서 PD-1/PD-L1 억제제의 경쟁 구도와 시장 점유율을 분석합니다.',
        categories: ['질환별', '경쟁분석'],
        therapeuticArea: '종양학',
        drugName: 'Keytruda (Pembrolizumab)',
        indication: '비소세포폐암 (NSCLC)',
        region: 'KR',
        marketSizeKrw: BigInt(450000000000),
        patientPool: 28000,
        availableTiers: ['BASIC', 'PRO', 'PREMIUM'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
      {
        title: '고혈압 ARB/CCB 복합제 처방 트렌드',
        slug: 'hypertension-arb-ccb-trend',
        description: 'ARB/CCB 복합제의 처방 패턴 변화와 제네릭 시장 동향을 분석합니다.',
        categories: ['약물별', '시장규모'],
        therapeuticArea: '심혈관',
        drugName: 'Exforge (Amlodipine/Valsartan)',
        indication: '고혈압',
        region: 'KR',
        marketSizeKrw: BigInt(280000000000),
        patientPool: 1200000,
        availableTiers: ['BASIC', 'PRO'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
      {
        title: '류마티스 관절염 JAK 억제제 시장 보고서',
        slug: 'ra-jak-inhibitor-market',
        description: 'JAK 억제제(토파시티닙, 바리시티닙 등)의 시장 현황과 바이오시밀러 영향을 분석합니다.',
        categories: ['질환별', '약물별'],
        therapeuticArea: '면역학',
        drugName: 'Xeljanz (Tofacitinib)',
        indication: '류마티스 관절염',
        region: 'KR',
        marketSizeKrw: BigInt(180000000000),
        patientPool: 45000,
        availableTiers: ['BASIC', 'PRO', 'PREMIUM'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
      {
        title: '아토피 피부염 생물학적제제 시장 분석',
        slug: 'atopic-dermatitis-biologics',
        description: '듀필루맙, 트랄로키누맙 등 아토피 피부염 생물학적제제의 시장 성장률과 파이프라인을 분석합니다.',
        categories: ['질환별', '시장규모'],
        therapeuticArea: '피부과',
        drugName: 'Dupixent (Dupilumab)',
        indication: '아토피 피부염',
        region: 'KR',
        marketSizeKrw: BigInt(95000000000),
        patientPool: 160000,
        availableTiers: ['BASIC', 'PRO'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
      {
        title: '비만 치료제 시장 전망 2026-2030',
        slug: 'obesity-market-outlook-2026',
        description: 'GLP-1 기반 비만 치료제(위고비, 젭바운드 등)의 글로벌 및 국내 시장 전망을 분석합니다.',
        categories: ['시장규모', '경쟁분석'],
        therapeuticArea: '내분비',
        drugName: 'Wegovy (Semaglutide)',
        indication: '비만',
        region: 'KR',
        marketSizeKrw: BigInt(120000000000),
        patientPool: 500000,
        availableTiers: ['BASIC', 'PRO', 'PREMIUM'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
      {
        title: '만성신장질환 SGLT2i 적응증 확대 분석',
        slug: 'ckd-sglt2i-expansion',
        description: 'SGLT2 억제제의 CKD 적응증 확대에 따른 시장 영향과 처방 변화를 분석합니다.',
        categories: ['약물별', '시장규모'],
        therapeuticArea: '신장내과',
        drugName: 'Forxiga (Dapagliflozin)',
        indication: '만성신장질환 (CKD)',
        region: 'KR',
        marketSizeKrw: BigInt(75000000000),
        patientPool: 200000,
        availableTiers: ['BASIC', 'PRO', 'PREMIUM'],
        priceBasic: 500000,
        pricePro: 1500000,
        pricePremium: 3000000,
      },
    ]

    // 기존 데이터 확인
    const existingReports = await prisma.reportCatalog.count()
    let reportResult = `기존 ${existingReports}건 유지`

    if (existingReports === 0) {
      for (const seed of reportSeeds) {
        await prisma.reportCatalog.create({ data: seed })
      }
      reportResult = `${reportSeeds.length}건 생성 완료`
    }

    // --- Study + Site 시드 ---
    const existingStudies = await prisma.study.count()
    let studyResult = `기존 ${existingStudies}건 유지`

    if (existingStudies === 0) {
      const studySeeds = [
        {
          protocolNumber: 'GR-HF-2026-001',
          title: 'Entresto Phase III 심부전 환자 등록 연구',
          phase: 'Phase III',
          status: 'ACTIVE' as const,
          sponsorName: '노바티스',
          indication: '심부전 (HFrEF)',
          targetEnrollment: 300,
          currentEnrollment: 187,
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-12-31'),
          sites: [
            { name: '서울대학교병원', code: 'SNUH-01', piName: '김OO 교수', address: '서울시 종로구', targetCount: 100, enrolledCount: 68 },
            { name: '연세대학교 세브란스병원', code: 'SEV-01', piName: '이OO 교수', address: '서울시 서대문구', targetCount: 100, enrolledCount: 72 },
            { name: '삼성서울병원', code: 'SMC-01', piName: '박OO 교수', address: '서울시 강남구', targetCount: 100, enrolledCount: 47 },
          ],
        },
        {
          protocolNumber: 'GR-DM-2026-002',
          title: '제2형 당뇨 GLP-1 RA 비교 효과 연구',
          phase: 'Phase IV',
          status: 'ACTIVE' as const,
          sponsorName: '노보노디스크',
          indication: '제2형 당뇨병',
          targetEnrollment: 500,
          currentEnrollment: 234,
          startDate: new Date('2026-02-01'),
          endDate: new Date('2027-06-30'),
          sites: [
            { name: '아산병원', code: 'AMC-01', piName: '최OO 교수', address: '서울시 송파구', targetCount: 200, enrolledCount: 112 },
            { name: '고려대학교 안암병원', code: 'KUA-01', piName: '정OO 교수', address: '서울시 성북구', targetCount: 150, enrolledCount: 67 },
            { name: '분당서울대병원', code: 'SNUBH-01', piName: '한OO 교수', address: '경기도 성남시', targetCount: 150, enrolledCount: 55 },
          ],
        },
        {
          protocolNumber: 'GR-ONC-2026-003',
          title: 'NSCLC 1차 면역항암 병용요법 등록 연구',
          phase: 'Phase II',
          status: 'PLANNING' as const,
          sponsorName: 'MSD',
          indication: '비소세포폐암 (NSCLC)',
          targetEnrollment: 150,
          currentEnrollment: 0,
          startDate: new Date('2026-06-01'),
          endDate: new Date('2027-12-31'),
          sites: [
            { name: '국립암센터', code: 'NCC-01', piName: '송OO 교수', address: '경기도 고양시', targetCount: 75, enrolledCount: 0 },
            { name: '서울아산병원', code: 'AMC-02', piName: '강OO 교수', address: '서울시 송파구', targetCount: 75, enrolledCount: 0 },
          ],
        },
        {
          protocolNumber: 'GR-AD-2026-004',
          title: '아토피 피부염 듀필루맙 장기 안전성 연구',
          phase: 'Phase IV',
          status: 'ACTIVE' as const,
          sponsorName: '사노피',
          indication: '아토피 피부염',
          targetEnrollment: 200,
          currentEnrollment: 143,
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-09-30'),
          sites: [
            { name: '서울대학교병원 피부과', code: 'SNUH-DER', piName: '윤OO 교수', address: '서울시 종로구', targetCount: 100, enrolledCount: 78 },
            { name: '세브란스병원 피부과', code: 'SEV-DER', piName: '조OO 교수', address: '서울시 서대문구', targetCount: 100, enrolledCount: 65 },
          ],
        },
        {
          protocolNumber: 'GR-CKD-2026-005',
          title: 'CKD 환자 대상 SGLT2i 신장 보호 효과 연구',
          phase: 'Phase III',
          status: 'ACTIVE' as const,
          sponsorName: '아스트라제네카',
          indication: '만성신장질환 (CKD)',
          targetEnrollment: 400,
          currentEnrollment: 95,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2027-09-30'),
          sites: [
            { name: '서울대학교병원 신장내과', code: 'SNUH-NEP', piName: '임OO 교수', address: '서울시 종로구', targetCount: 150, enrolledCount: 42 },
            { name: '삼성서울병원 신장내과', code: 'SMC-NEP', piName: '유OO 교수', address: '서울시 강남구', targetCount: 150, enrolledCount: 33 },
            { name: '서울성모병원', code: 'CMC-01', piName: '배OO 교수', address: '서울시 서초구', targetCount: 100, enrolledCount: 20 },
          ],
        },
      ]

      for (const seed of studySeeds) {
        const { sites, ...studyData } = seed
        await prisma.study.create({
          data: {
            ...studyData,
            sites: {
              create: sites,
            },
          },
        })
      }
      studyResult = `${studySeeds.length}건 + Site ${studySeeds.reduce((a, s) => a + s.sites.length, 0)}건 생성 완료`
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        reports: reportResult,
        studies: studyResult,
      },
    })
  } catch (error) {
    console.error('[POST /api/seed] Error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: `시드 데이터 생성 실패: ${error}` },
      { status: 500 }
    )
  }
}
