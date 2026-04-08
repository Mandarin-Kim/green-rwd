import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-guard'
import { generateReport, ReportTier } from '@/lib/report-generator'

export const maxDuration = 120;

// 키워드로 slug 생성 (한글 → 영문 간단 변환)
function generateSlug(keywords: string[]): string {
  const base = keywords
    .join('-')
    .toLowerCase()
    .replace(/[가-힣]+/g, (match) => {
      // 간단한 한글→영문 매핑 (주요 의약용어)
      const map: Record<string, string> = {
        '비만': 'obesity', '당뇨': 'diabetes', '고혈압': 'hypertension',
        '암': 'cancer', '폐암': 'lung-cancer', '유방암': 'breast-cancer',
        '위암': 'gastric-cancer', '간암': 'liver-cancer', '대장암': 'colorectal-cancer',
        '치매': 'dementia', '파킨슨': 'parkinson', '우울증': 'depression',
        '관절염': 'arthritis', '아토피': 'atopic-dermatitis', '건선': 'psoriasis',
        '천식': 'asthma', '심부전': 'heart-failure', '뇌졸중': 'stroke',
        '골다공증': 'osteoporosis', '간염': 'hepatitis', '크론병': 'crohns',
        '루푸스': 'lupus', '빈혈': 'anemia', '갑상선': 'thyroid',
        '백혈병': 'leukemia', '림프종': 'lymphoma', '전립선암': 'prostate-cancer',
        '췌장암': 'pancreatic-cancer', '난소암': 'ovarian-cancer',
        '자궁경부암': 'cervical-cancer', '방광암': 'bladder-cancer',
        '신장암': 'kidney-cancer', '흑색종': 'melanoma',
        '다발성경화증': 'multiple-sclerosis', '에이즈': 'hiv-aids',
        '결핵': 'tuberculosis', '말라리아': 'malaria',
        '위고비': 'wegovy', '마운자로': 'mounjaro', '오젬픽': 'ozempic',
        '키트루다': 'keytruda', '옵디보': 'opdivo', '허셉틴': 'herceptin',
        '휴미라': 'humira', '리툭시맙': 'rituximab', '렘데시비르': 'remdesivir',
      }
      return map[match] || match.replace(/[가-힣]/g, '')
    })
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const timestamp = Date.now().toString(36)
  return `custom-${base}-${timestamp}`.substring(0, 80)
}

// 키워드에서 치료영역 자동 추정
function guessTherapeuticArea(keywords: string[]): string {
  const joined = keywords.join(' ').toLowerCase()
  const mapping: [RegExp, string][] = [
    [/암|cancer|종양|tumor|항암|onco|백혈병|림프종|흑색종|키트루다|옵디보|허셉틴|adc/i, '종양/항암'],
    [/당뇨|비만|대사|갑상선|diabetes|obesity|metabol|glp|세마글루타이드|티르제파타이드|위고비|오젬픽|마운자로/i, '대사질환'],
    [/관절|루푸스|건선|아토피|자가면역|autoimmune|크론|류마/i, '자가면역'],
    [/치매|파킨슨|뇌|신경|알츠하이머|간질|epilep|neuro|우울증|조현병/i, '신경질환'],
    [/mRNA|세포치료|유전자|바이오|CAR-T|항체|ADC|biosimilar/i, '바이오의약품'],
    [/디지털|DTx|원격|AI|모니터링|앱/i, '디지털헬스'],
    [/비타민|건기식|프로바이오|유산균|오메가|영양/i, '건기식'],
    [/심부전|심혈관|고혈압|뇌졸중|혈전|심장|SGLT2|ARNI/i, '심혈관'],
    [/천식|COPD|폐|호흡기|respiratory/i, '호흡기'],
    [/간염|간경|간섬유/i, '간질환'],
  ]

  for (const [pattern, area] of mapping) {
    if (pattern.test(joined)) return area
  }
  return '기타'
}

// POST /api/reports/custom - 키워드 기반 커스텀 보고서 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keywords, tier = 'BASIC' } = body

    // keywords: string[] — 질환, 약품, 키워드 등
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: '최소 1개 이상의 키워드를 입력해주세요' },
        { status: 400 }
      )
    }

    if (keywords.length > 10) {
      return NextResponse.json(
        { error: '키워드는 최대 10개까지 입력 가능합니다' },
        { status: 400 }
      )
    }

    if (!['BASIC', 'PRO', 'PREMIUM'].includes(tier)) {
      return NextResponse.json({ error: '유효하지 않은 티어입니다' }, { status: 400 })
    }

    const cleanKeywords = keywords.map((k: string) => k.trim()).filter((k: string) => k.length > 0)
    if (cleanKeywords.length === 0) {
      return NextResponse.json({ error: '유효한 키워드를 입력해주세요' }, { status: 400 })
    }

    const therapeuticArea = guessTherapeuticArea(cleanKeywords)
    const slug = generateSlug(cleanKeywords)
    const title = `${cleanKeywords.join(' + ')} 시장 분석 보고서 2025-2030`
    const description = `${cleanKeywords.join(', ')} 키워드 기반 AI 시장 분석 보고서입니다. HIRA 실측 데이터, ClinicalTrials.gov 임상시험 정보, PubMed 논문 인용을 포함합니다.`

    // 약품명과 질환명 분리 (첫 번째 = 질환, 두 번째 = 약품으로 가정, 나머지는 설명에 포함)
    const indication = cleanKeywords[0] || ''
    const drugName = cleanKeywords.length > 1 ? cleanKeywords.slice(1).join(', ') : cleanKeywords[0]

    console.log(`[Custom Report] Keywords: ${cleanKeywords.join(', ')} | Area: ${therapeuticArea} | Slug: ${slug}`)

    // 트랜잭션: 유저 확보 + 카탈로그 생성 + 주문 생성
    const txResult = await prisma.$transaction(async (tx) => {
      // 1) 유저 확보
      let userId: string | undefined
      const sessionUser = await getSessionUser(request)
      if (sessionUser?.id) {
        const dbUser = await tx.user.findUnique({ where: { id: sessionUser.id } })
        if (dbUser) userId = dbUser.id
      }
      if (!userId) {
        let guestUser = await tx.user.findUnique({ where: { email: 'guest@green-rwd.system' } })
        if (!guestUser) {
          guestUser = await tx.user.create({
            data: { email: 'guest@green-rwd.system', name: '게스트', role: 'USER' },
          })
        }
        userId = guestUser.id
      }

      // 2) 카탈로그 생성
      const catalog = await tx.reportCatalog.create({
        data: {
          title,
          slug,
          description,
          categories: [therapeuticArea],
          therapeuticArea,
          drugName,
          indication,
          region: 'KR',
          availableTiers: ['BASIC', 'PRO', 'PREMIUM'],
          priceBasic: 500000,
          pricePro: 1500000,
          pricePremium: 3000000,
          isActive: true,
        },
      })

      console.log(`[Custom Report] Catalog created: ${catalog.id} (${slug})`)

      // 3) 주문 생성
      const priceMap: Record<string, number> = { BASIC: 500000, PRO: 1500000, PREMIUM: 3000000 }
      const order = await tx.reportOrder.create({
        data: {
          catalogId: catalog.id,
          userId,
          tier: tier as ReportTier,
          price: priceMap[tier],
          status: 'GENERATING',
          progress: 0,
          startedAt: new Date(),
        },
      })

      return { catalog, order }
    })

    const { catalog, order } = txResult

    // ── 동기 보고서 생성 ──
    try {
      const sections = await generateReport({
        catalogId: catalog.id,
        slug: catalog.slug,
        title: catalog.title,
        drugName: catalog.drugName || '',
        indication: catalog.indication || '',
        therapeuticArea: catalog.therapeuticArea || '',
        tier: tier as ReportTier,
        onProgress: async (progress: number, sectionTitle: string) => {
          try {
            await prisma.reportOrder.update({
              where: { id: order.id },
              data: { progress },
            })
            console.log(`[Custom Progress] ${slug}: ${progress}% - ${sectionTitle}`)
          } catch (e) {
            console.error('[Progress Update Error]', e)
          }
        },
      })

      // 완료
      await prisma.reportOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          sections: sections as any,
          completedAt: new Date(),
        },
      })

      console.log(`[Custom Report] Completed: ${title}`)

      return NextResponse.json({
        success: true,
        data: {
          orderId: order.id,
          catalogSlug: catalog.slug,
          status: 'COMPLETED',
          progress: 100,
          message: '커스텀 보고서 생성이 완료되었습니다',
        },
      })
    } catch (genError) {
      console.error('[Custom Report Generation Error]', genError)
      await prisma.reportOrder.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          errorMessage: genError instanceof Error ? genError.message : '보고서 생성 실패',
          completedAt: new Date(),
        },
      })
      return NextResponse.json(
        { error: '보고서 생성 중 오류가 발생했습니다', details: genError instanceof Error ? genError.message : '' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Custom Report Error]', error)
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
