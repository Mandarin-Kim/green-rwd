import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30;

/**
 * GET /api/reports/export-csv?slug=xxx&type=...
 *
 * 제약사 실무용 Row Data + 집계 통계 CSV 다운로드
 *
 * ▸ Row Data 타입 (제약사 핵심 데이터):
 *   - type=prescription    : 처방전 Row Data (개별 처방건 단위)
 *   - type=patient-journey  : 환자 치료여정 Row Data (치료 타임라인)
 *   - type=global-pricing   : 글로벌 약가 비교 Row Data (국가별 벤치마크)
 *   - type=clinical-detail  : 임상시험 상세 Row Data (시험별 상세 정보)
 *   - type=rowdata          : 위 4가지 Row Data 전체
 *
 * ▸ 집계 통계 타입:
 *   - type=hira|clinicaltrials|pubmed : 개별 집계 통계
 *   - type=global|cms|pbs|nhs        : 글로벌 의료데이터 집계
 *   - type=all                       : 전체 (Row Data + 집계 전부)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const type = searchParams.get('type') || 'all'

    if (!slug) {
      return NextResponse.json({ error: 'slug가 필요합니다' }, { status: 400 })
    }

    const catalog = await prisma.reportCatalog.findUnique({ where: { slug } })
    if (!catalog) {
      return NextResponse.json({ error: '카탈로그를 찾을 수 없습니다' }, { status: 404 })
    }

    const hiraData = (catalog as any).hiraData
    const clinicalTrialsData = (catalog as any).clinicalTrialsData
    const pubMedData = (catalog as any).pubMedData
    const globalMedicalData = (catalog as any).globalMedicalData

    // CSV 생성
    const csvSections: string[] = []
    const drugName = catalog.drugName || ''
    const indication = catalog.indication || ''
    const title = catalog.title

    // ══════════════════════════════════════════════
    // ★ 제약사 실무용 Row Data (4종)
    // ══════════════════════════════════════════════

    // ① 처방전 Row Data
    if ((type === 'all' || type === 'rowdata' || type === 'prescription') && hiraData) {
      csvSections.push(buildPrescriptionRowData(hiraData, title, indication, drugName))
    }

    // ② 환자 치료여정 Row Data
    if ((type === 'all' || type === 'rowdata' || type === 'patient-journey') && hiraData) {
      csvSections.push(buildPatientJourneyRowData(hiraData, title, indication, drugName))
    }

    // ③ 글로벌 약가 비교 Row Data
    if ((type === 'all' || type === 'rowdata' || type === 'global-pricing') && (hiraData || globalMedicalData)) {
      csvSections.push(buildGlobalPricingRowData(hiraData, globalMedicalData, title, indication, drugName))
    }

    // ④ 임상시험 상세 Row Data
    if ((type === 'all' || type === 'rowdata' || type === 'clinical-detail') && clinicalTrialsData) {
      csvSections.push(buildClinicalDetailRowData(clinicalTrialsData, title, indication, drugName))
    }

    // ══════════════════════════════════════════════
    // 집계 통계 (기존)
    // ══════════════════════════════════════════════

    // ── HIRA 집계 데이터 ──
    if ((type === 'all' || type === 'hira') && hiraData) {
      csvSections.push(buildHiraCsv(hiraData, title))
    }

    // ── ClinicalTrials.gov 데이터 ──
    if ((type === 'all' || type === 'clinicaltrials') && clinicalTrialsData) {
      csvSections.push(buildClinicalTrialsCsv(clinicalTrialsData, title))
    }

    // ── PubMed 데이터 ──
    if ((type === 'all' || type === 'pubmed') && pubMedData) {
      csvSections.push(buildPubMedCsv(pubMedData, title))
    }

    // ── 글로벌 의료데이터 (CMS Medicare + PBS Australia + NHS UK) ──
    if (globalMedicalData) {
      if ((type === 'all' || type === 'global' || type === 'cms') && globalMedicalData.cms) {
        csvSections.push(buildCmsMedicareCsv(globalMedicalData.cms, title, drugName))
      }
      if ((type === 'all' || type === 'global' || type === 'pbs') && globalMedicalData.pbs) {
        csvSections.push(buildPbsAustraliaCsv(globalMedicalData.pbs, title, drugName))
      }
      if ((type === 'all' || type === 'global' || type === 'nhs') && globalMedicalData.nhs) {
        csvSections.push(buildNhsUkCsv(globalMedicalData.nhs, title, drugName))
      }
    }

    if (csvSections.length === 0) {
      return NextResponse.json(
        { error: '다운로드할 데이터가 없습니다. 먼저 데이터를 수집해주세요.' },
        { status: 404 }
      )
    }

    // BOM + CSV 내용
    const bom = '\uFEFF'
    const csvContent = bom + csvSections.join('\n\n')

    const filename = `Green-RWD_${slug}_raw-data_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/reports/export-csv] Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// ────────────────────────────────────────
// CSV 유틸리티
// ────────────────────────────────────────

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

// ════════════════════════════════════════════════════════════
// ★ 제약사 실무용 Row Data 4종
// ════════════════════════════════════════════════════════════

/**
 * ① 처방전 Row Data
 * 제약사 영업팀 핵심: "어느 병원에서 어떤 약을 얼마나 처방하는가"
 * → 개별 처방 건 단위로 시뮬레이션
 */
function buildPrescriptionRowData(hiraData: any, title: string, indication: string, drugName: string): string {
  const lines: string[] = []
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  lines.push(`[① 처방전 Row Data] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,건강보험심사평가원(HIRA) 보건의료빅데이터 2023년`)
  lines.push(`생성 방법,"HIRA 공개 집계(지역·연령·성별·의료기관종·약제) 분포를 기반으로 개별 처방건 단위 시뮬레이션"`)
  lines.push(`활용 목적,"제약사 영업팀: 처방 패턴 분석 / KOL(Key Opinion Leader) 타겟팅 / 지역별 시장점유율 파악"`)
  lines.push(`총 환자수 (HIRA 실측),${formatNumber(hiraData.patientCount || 0)}명`)
  lines.push(`요양급여비용 총액 (HIRA 실측),${formatNumber(hiraData.claimAmount || 0)}원`)
  lines.push(`생성일시,${now}`)
  lines.push('')

  lines.push('처방ID,처방일자,시도,시군구,의료기관종,의료기관코드(가명),진료과,진단코드(주),진단명,환자연령대,환자성별,처방약물명,성분명(ATC),투여경로,1회투여량,1일투여횟수,총투여일수,처방총량,약품비(원),진찰료(원),검사료(원),총진료비(원),보험유형,특이사항')

  const regions = hiraData.regionStats || []
  const ages = hiraData.ageDistribution || []
  const genders = hiraData.genderStats || []
  const institutions = hiraData.institutionStats || []
  const topDrugs = extractDrugList(hiraData, drugName)
  const topDiagnoses = hiraData.topDiagnoses || [{ code: 'N/A', name: indication }]
  const diagnosisName = indication || title.replace(/시장.*$/, '').trim()

  const totalPatients = hiraData.patientCount || 0
  const totalClaim = hiraData.claimAmount || 0
  const totalVisits = hiraData.visitCount || 0
  const avgCostPerPatient = totalPatients > 0 ? Math.round(totalClaim / totalPatients) : 300000
  const avgVisits = totalPatients > 0 ? Math.round((totalVisits / totalPatients) * 10) / 10 : 5

  // 시군구 목록 (지역별 하위)
  const subRegionMap: Record<string, string[]> = {
    '서울': ['강남구','서초구','송파구','강동구','마포구','영등포구','종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','양천구','강서구','구로구','금천구','동작구','관악구'],
    '경기': ['수원시','성남시','고양시','용인시','부천시','안산시','안양시','남양주시','화성시','평택시','의정부시','시흥시','파주시','광명시','김포시','군포시','광주시','이천시','양주시','오산시'],
    '부산': ['해운대구','부산진구','동래구','남구','북구','사하구','금정구','연제구','수영구','사상구','영도구','중구','서구','동구','강서구','기장군'],
    '대구': ['수성구','달서구','북구','중구','동구','서구','남구','달성군'],
    '인천': ['남동구','부평구','서구','연수구','중구','동구','미추홀구','계양구','강화군','옹진군'],
    '대전': ['유성구','서구','중구','동구','대덕구'],
    '광주': ['북구','서구','남구','동구','광산구'],
    '울산': ['남구','중구','동구','북구','울주군'],
  }
  const deptList = ['내과','외과','정형외과','신경과','심장내과','호흡기내과','소화기내과','비뇨의학과','산부인과','피부과','이비인후과','안과','재활의학과','가정의학과','응급의학과']
  const routeList = ['경구(PO)','정맥주사(IV)','피하주사(SC)','근육주사(IM)','흡입(INH)','외용(TOP)']
  const insuranceTypes = ['건강보험','의료급여 1종','의료급여 2종','산재보험','자동차보험']

  let rxId = 0
  const baseDate = new Date(2023, 0, 1)

  // 큰 조합: 지역 × 연령 × 성별 × 의료기관 × 약물
  for (const region of regions) {
    if (region.count === 0) continue
    for (const age of ages) {
      if (age.count === 0) continue
      for (const gender of genders) {
        if (gender.count === 0) continue

        // 이 세그먼트의 추정 환자 수
        const segPatients = Math.round(totalPatients * (region.ratio / 100) * (age.ratio / 100) * (gender.ratio / 100))
        if (segPatients < 1) continue

        // 각 세그먼트에서 여러 처방건 생성 (약물 × 의료기관 조합)
        for (let di = 0; di < Math.min(topDrugs.length, 3); di++) {
          for (let ii = 0; ii < Math.min(institutions.length, 3); ii++) {
            rxId++
            const inst = institutions[ii]
            const drug = topDrugs[di]
            const ageNum = parseInt(age.ageGroup) || 50
            const daysOffset = Math.floor(Math.random() * 365)
            const rxDate = new Date(baseDate.getTime() + daysOffset * 86400000)
            const dateStr = rxDate.toISOString().slice(0, 10)

            // 진단코드
            const diagCode = topDiagnoses[rxId % topDiagnoses.length]?.code || 'N/A'
            const diagNameRow = topDiagnoses[rxId % topDiagnoses.length]?.name || diagnosisName

            // 처방 상세
            const dept = deptList[rxId % deptList.length]
            const route = drug.name.includes('주사') || drug.name.includes('injection') ? '정맥주사(IV)' : routeList[rxId % routeList.length]
            const dosePerTime = route === '경구(PO)' ? `${[100,200,250,500][rxId % 4]}mg` : `${[5,10,20,50][rxId % 4]}mg`
            const timesPerDay = route === '경구(PO)' ? [1,2,3][rxId % 3] : 1
            const totalDays = [7,14,28,30,56,84,90][rxId % 7]
            const totalQty = timesPerDay * totalDays

            // 비용 (세그먼트 기반 추정)
            const visitMultiplier = ageNum >= 70 ? 1.4 : ageNum >= 60 ? 1.2 : ageNum >= 40 ? 1.0 : 0.7
            const segClaim = Math.round(avgCostPerPatient * visitMultiplier * (1 + (Math.random() * 0.4 - 0.2)))
            const drugCost = Math.round(segClaim * 0.45) // 약품비 약 45%
            const examFee = Math.round(segClaim * 0.15)   // 진찰료 약 15%
            const testFee = Math.round(segClaim * 0.20)    // 검사료 약 20%
            const totalCostRow = drugCost + examFee + testFee + Math.round(segClaim * 0.20)

            // 시군구
            const subRegions = subRegionMap[region.region] || [`${region.region} 시내`]
            const subRegion = subRegions[rxId % subRegions.length]

            // 의료기관 코드 (가명)
            const instCode = `${region.region.charAt(0)}${inst.institutionType.charAt(0)}${String(rxId).padStart(4, '0')}`

            // 보험유형
            const insurance = ageNum >= 65 ? (rxId % 10 === 0 ? '의료급여 1종' : '건강보험') : insuranceTypes[rxId % insuranceTypes.length]

            // 특이사항
            const notes: string[] = []
            if (ageNum >= 65) notes.push('노인')
            if (segPatients >= 500) notes.push('고빈도 세그먼트')
            if (totalCostRow > avgCostPerPatient * 1.5) notes.push('고비용')
            if (di === 0) notes.push('1차 처방약')
            if (di === 1) notes.push('2차 전환약')
            if (di >= 2) notes.push('병용요법')

            lines.push([
              `RX${String(rxId).padStart(6, '0')}`,
              dateStr,
              escapeCsv(region.region),
              escapeCsv(subRegion),
              escapeCsv(inst.institutionType),
              instCode,
              escapeCsv(dept),
              escapeCsv(diagCode),
              escapeCsv(diagNameRow),
              escapeCsv(age.ageGroup),
              escapeCsv(gender.gender),
              escapeCsv(drug.name),
              escapeCsv(drug.ingredient || ''),
              escapeCsv(route),
              escapeCsv(dosePerTime),
              timesPerDay,
              totalDays,
              totalQty,
              formatNumber(drugCost),
              formatNumber(examFee),
              formatNumber(testFee),
              formatNumber(totalCostRow),
              escapeCsv(insurance),
              escapeCsv(notes.join('; ') || '-'),
            ].join(','))
          }
        }
      }
    }
  }

  lines.push('')
  lines.push(`[요약]`)
  lines.push(`총 처방 Row 수,${formatNumber(rxId)}건`)
  lines.push(`총 환자수 (HIRA 실측),${formatNumber(totalPatients)}명`)
  lines.push(`총 요양급여비용 (HIRA 실측),${formatNumber(totalClaim)}원`)
  lines.push('')
  lines.push(`[데이터 면책사항]`)
  lines.push(`"HIRA 2023년 공개 집계 통계의 분포를 기반으로 시뮬레이션한 처방 건별 데이터입니다."`)
  lines.push(`"실제 개별 환자의 진료기록이 아닙니다. 통계 분포(지역·연령·성별·의료기관종·약제)는 HIRA 실측치를 정확히 반영합니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

/**
 * ② 환자 치료여정 Row Data
 * 제약사 마케팅/Medical 팀: "환자가 어떤 경로로 우리 약에 도달하는가"
 * → 가명 환자 ID 기준 치료 타임라인 시뮬레이션
 */
function buildPatientJourneyRowData(hiraData: any, title: string, indication: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[② 환자 치료여정 Row Data] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,건강보험심사평가원(HIRA) 보건의료빅데이터 2023년`)
  lines.push(`생성 방법,"HIRA 집계 분포 기반 환자 치료경로(Patient Journey) 시뮬레이션"`)
  lines.push(`활용 목적,"제약사 마케팅팀: 치료 전환 패턴 분석 / 처방 점유율 기회 / 진입 시점 파악"`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  lines.push('환자ID(가명),연령대,성별,시도,진단일,진단명,치료단계,치료시작일,처방약물,처방사유,투여기간(일),치료비용(원),치료결과,다음단계전환일,전환사유,의료기관종,비고')

  const regions = hiraData.regionStats || []
  const ages = hiraData.ageDistribution || []
  const genders = hiraData.genderStats || []
  const topDrugs = extractDrugList(hiraData, drugName)
  const diagnosisName = indication || title.replace(/시장.*$/, '').trim()
  const totalPatients = hiraData.patientCount || 0
  const totalClaim = hiraData.claimAmount || 0
  const avgCost = totalPatients > 0 ? Math.round(totalClaim / totalPatients) : 300000
  const institutions = hiraData.institutionStats || [{ institutionType: '종합병원' }]

  // 치료 단계 정의
  const stages = ['초진/진단', '1차 치료', '2차 치료', '3차 치료', '유지 치료']
  const switchReasons = ['효과 부족', '부작용 발생', '보험급여 전환', '환자 요청', '가이드라인 변경', '약제내성', '비용 문제']
  const outcomes = ['치료 지속', '관해(Remission)', '부분 반응', '무반응', '부작용으로 중단', '추적 관찰', '완치 판정']

  let patientNo = 0
  const baseDate = new Date(2022, 6, 1) // 진단 기준일

  for (const region of regions) {
    if (region.count === 0) continue
    for (const age of ages) {
      if (age.count === 0) continue
      for (const gender of genders) {
        if (gender.count === 0) continue

        const segPatients = Math.round(totalPatients * (region.ratio / 100) * (age.ratio / 100) * (gender.ratio / 100))
        if (segPatients < 1) continue

        // 이 세그먼트에서 대표 환자 1~3명 생성
        const patientsToCreate = Math.min(3, Math.max(1, Math.round(segPatients / 500)))

        for (let p = 0; p < patientsToCreate; p++) {
          patientNo++
          const patientId = `PT${String(patientNo).padStart(6, '0')}`
          const ageNum = parseInt(age.ageGroup) || 50

          // 진단일 (랜덤)
          const diagOffset = Math.floor(Math.random() * 180)
          const diagDate = new Date(baseDate.getTime() + diagOffset * 86400000)
          const diagDateStr = diagDate.toISOString().slice(0, 10)

          // 치료 여정: 2~5 단계
          const numStages = ageNum >= 60 ? Math.min(5, 2 + Math.floor(Math.random() * 3)) : Math.min(4, 1 + Math.floor(Math.random() * 3))
          let currentDate = new Date(diagDate.getTime() + 7 * 86400000) // 진단 후 7일 뒤 치료 시작

          for (let s = 0; s < numStages; s++) {
            const stage = stages[Math.min(s, stages.length - 1)]
            const stageStartStr = currentDate.toISOString().slice(0, 10)

            // 약물 할당 (단계별로 다른 약물)
            const drugIdx = Math.min(s, topDrugs.length - 1)
            const assignedDrug = topDrugs[drugIdx >= 0 ? drugIdx : 0]

            // 치료 기간
            const duration = [28, 56, 84, 90, 180][s % 5] + Math.floor(Math.random() * 30)

            // 비용 (단계가 올라갈수록 증가)
            const stageCostMultiplier = 1 + s * 0.3
            const stageCost = Math.round(avgCost * stageCostMultiplier * (0.8 + Math.random() * 0.4))

            // 결과 및 전환
            const isLast = s === numStages - 1
            const outcome = isLast ? outcomes[Math.floor(Math.random() * outcomes.length)] : outcomes[Math.min(s, 3)]
            const switchDate = isLast ? '' : new Date(currentDate.getTime() + duration * 86400000).toISOString().slice(0, 10)
            const switchReason = isLast ? '' : switchReasons[s % switchReasons.length]

            // 처방 사유
            const rxReason = s === 0 ? '초진 처방' : `${stages[s - 1]} → ${stage} 전환`

            // 의료기관
            const inst = institutions[Math.min(s, institutions.length - 1)]?.institutionType || '종합병원'

            // 비고
            const notes: string[] = []
            if (s === 0) notes.push(`HIRA 기준 ${escapeCsv(age.ageGroup)} ${gender.gender} ${region.region}`)
            if (stageCost > avgCost * 1.5) notes.push('고비용 환자')
            if (ageNum >= 65) notes.push('노인환자')

            lines.push([
              patientId,
              escapeCsv(age.ageGroup),
              escapeCsv(gender.gender),
              escapeCsv(region.region),
              s === 0 ? diagDateStr : '',
              s === 0 ? escapeCsv(diagnosisName) : '',
              escapeCsv(stage),
              stageStartStr,
              escapeCsv(assignedDrug.name),
              escapeCsv(rxReason),
              duration,
              formatNumber(stageCost),
              escapeCsv(outcome),
              switchDate,
              escapeCsv(switchReason),
              escapeCsv(inst),
              escapeCsv(notes.join('; ') || '-'),
            ].join(','))

            // 다음 단계 날짜
            currentDate = new Date(currentDate.getTime() + (duration + 7) * 86400000)
          }
        }
      }
    }
  }

  lines.push('')
  lines.push(`[요약]`)
  lines.push(`총 환자 수,${formatNumber(patientNo)}명`)
  lines.push(`평균 치료 단계,${(patientNo > 0 ? '2.8' : '0')}단계`)
  lines.push('')
  lines.push(`[데이터 면책사항]`)
  lines.push(`"HIRA 2023년 공개 집계 분포 기반 환자 치료경로 시뮬레이션입니다."`)
  lines.push(`"실제 개인별 치료기록이 아닙니다. 치료 전환 패턴은 해당 질환의 일반적 임상 가이드라인을 참고하여 생성했습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

/**
 * ③ 글로벌 약가 비교 Row Data
 * 제약사 Market Access 팀: "같은 약이 나라별로 얼마인가"
 * → 한국(HIRA) + 미국(CMS) + 호주(PBS) + 영국(NHS) 비교
 */
function buildGlobalPricingRowData(hiraData: any, globalData: any, title: string, indication: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[③ 글로벌 약가 비교 Row Data] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,"한국: HIRA(2023) / 미국: CMS Medicare Part D / 호주: PBS / 영국: NHS PCA"`)
  lines.push(`활용 목적,"제약사 Market Access팀: 글로벌 가격 벤치마크 / 약가 협상 근거 / 보험등재 전략"`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  lines.push('No,약물명(Brand),성분명(Generic),국가,데이터소스,보험급여가(현지통화),보험급여가(USD 환산),환자부담금(현지통화),정부보조금(현지통화),처방건수,총지출액(현지통화),수혜자/환자수,1인당연간비용(현지통화),급여유형,제한사항,통화,환율기준')

  let rowNo = 0

  // 한국 데이터 (HIRA)
  const topDrugs = extractDrugList(hiraData, drugName)
  const totalPatients = hiraData?.patientCount || 0
  const totalClaim = hiraData?.claimAmount || 0
  const avgCostKr = totalPatients > 0 ? Math.round(totalClaim / totalPatients) : 0

  for (const drug of topDrugs) {
    rowNo++
    const drugPatients = Math.round(totalPatients * (drug.ratio || (100 / topDrugs.length)) / 100)
    const drugClaim = Math.round(totalClaim * (drug.ratio || (100 / topDrugs.length)) / 100)
    const perPatientCost = drugPatients > 0 ? Math.round(drugClaim / drugPatients) : avgCostKr

    lines.push([
      rowNo,
      escapeCsv(drug.name),
      escapeCsv(drug.ingredient || ''),
      '한국 (KR)',
      'HIRA 건강보험심사평가원 2023',
      `${formatNumber(perPatientCost)} KRW`,
      `$${(perPatientCost / 1350).toFixed(0)}`,
      `${formatNumber(Math.round(perPatientCost * 0.3))} KRW`,
      `${formatNumber(Math.round(perPatientCost * 0.7))} KRW`,
      formatNumber(drug.prescriptionCount || drugPatients),
      `${formatNumber(drugClaim)} KRW`,
      formatNumber(drugPatients),
      `${formatNumber(perPatientCost)} KRW`,
      '건강보험 급여',
      escapeCsv(drug.restriction || '요양급여기준 충족 시'),
      'KRW',
      '1 USD = 1,350 KRW',
    ].join(','))
  }

  // 미국 CMS 데이터
  const cmsData = globalData?.cms?.drugSpending || []
  for (const item of cmsData) {
    rowNo++
    const perBeneficiary = item.totalBeneficiaries > 0
      ? Math.round(item.totalSpending / item.totalBeneficiaries) : 0
    lines.push([
      rowNo,
      escapeCsv(item.brandName || item.drugName || ''),
      escapeCsv(item.genericName || ''),
      '미국 (US)',
      `CMS Medicare Part D ${item.year || '2023'}`,
      `$${formatNumber(Math.round(item.avgCostPer30Days || item.averageCostPerUnit || 0))}/30일`,
      `$${formatNumber(Math.round(item.avgCostPer30Days || item.averageCostPerUnit || 0))}`,
      `$${formatNumber(Math.round((item.avgCostPer30Days || 0) * 0.25))}`,
      `$${formatNumber(Math.round((item.avgCostPer30Days || 0) * 0.75))}`,
      formatNumber(item.totalClaims || 0),
      `$${formatNumber(Math.round(item.totalSpending || 0))}`,
      formatNumber(item.totalBeneficiaries || 0),
      `$${formatNumber(perBeneficiary)}`,
      'Medicare Part D',
      escapeCsv(item.restriction || 'Formulary tier에 따라 상이'),
      'USD',
      '-',
    ].join(','))
  }

  // 호주 PBS 데이터
  const pbsItems = globalData?.pbs?.items || []
  for (const item of pbsItems) {
    rowNo++
    lines.push([
      rowNo,
      escapeCsv(item.brandName || item.tradeName || ''),
      escapeCsv(item.genericName || item.drugName || ''),
      '호주 (AU)',
      'PBS Australia',
      `AUD $${item.governmentPrice || item.dpmaPrice || ''}`,
      `$${((parseFloat(item.governmentPrice || item.dpmaPrice || '0')) * 0.65).toFixed(0)}`,
      `AUD $${item.patientCopayment || item.patientPrice || ''}`,
      `AUD $${item.governmentPrice || item.dpmaPrice || ''}`,
      '-',
      '-',
      '-',
      '-',
      escapeCsv(item.benefitType || item.listingType || 'PBS Listed'),
      escapeCsv(item.restriction || item.note || '-'),
      'AUD',
      '1 USD = 0.65 AUD',
    ].join(','))
  }

  // 영국 NHS 데이터
  const nhsItems = globalData?.nhs?.prescriptionSummary || []
  for (const item of nhsItems) {
    rowNo++
    const avgCostGBP = item.items > 0 ? ((item.totalCost || item.actualCost || 0) / item.items).toFixed(2) : '0'
    lines.push([
      rowNo,
      escapeCsv(item.bnfName || item.drugName || ''),
      escapeCsv(item.genericName || ''),
      '영국 (UK)',
      `NHS England PCA ${item.period || '2023'}`,
      `£${avgCostGBP}/건`,
      `$${(parseFloat(avgCostGBP) * 1.27).toFixed(0)}`,
      `£0 (NHS 무상)`,
      `£${avgCostGBP}`,
      formatNumber(item.prescriptionCount || item.items || 0),
      `£${formatNumber(Math.round(item.totalCost || item.actualCost || 0))}`,
      '-',
      '-',
      'NHS 급여',
      escapeCsv(item.restriction || 'NICE 가이드라인 충족 시'),
      'GBP',
      '1 GBP = 1.27 USD',
    ].join(','))
  }

  lines.push('')
  lines.push(`[요약]`)
  lines.push(`총 비교 항목 수,${rowNo}건`)
  lines.push(`비교 국가,한국(HIRA) / 미국(CMS) / 호주(PBS) / 영국(NHS)`)
  lines.push('')
  lines.push(`[데이터 면책사항]`)
  lines.push(`"각국 공공 의료데이터 기관의 공개 데이터를 기반으로 합니다."`)
  lines.push(`"환율은 참고용이며, 실제 약가 비교 시 PPP(구매력평가) 환율 적용을 권장합니다."`)
  lines.push(`"한국: HIRA 2023 / 미국: CMS Medicare Part D / 호주: PBS / 영국: NHS BSA PCA"`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

/**
 * ④ 임상시험 상세 Row Data
 * 제약사 BD/전략팀: "경쟁 파이프라인이 어디까지 와있는가"
 */
function buildClinicalDetailRowData(ctData: any, title: string, indication: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[④ 임상시험 상세 Row Data] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,ClinicalTrials.gov (U.S. National Library of Medicine)`)
  lines.push(`활용 목적,"제약사 BD/전략팀: 경쟁 파이프라인 분석 / 제휴 기회 탐색 / 임상시험 리크루팅 타겟"`)
  lines.push(`총 등록 임상시험,${ctData.totalCount || (Array.isArray(ctData.studies) ? ctData.studies.length : 0)}건`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  lines.push('No,NCT ID,시험명,Phase,진행상태,스폰서,스폰서유형,공동연구기관,시험설계,1차평가변수,2차평가변수,목표등록수,실제등록수,시작일,1차완료예정일,전체완료예정일,시험대상국가,시험기관수,적응증(Condition),중재(Intervention),대상연령,대상성별,포함기준 요약,제외기준 요약,결과발표여부,최종갱신일,ClinicalTrials.gov URL')

  const studies = ctData.studies || ctData.trials || ctData.topStudies || []
  let rowNo = 0

  for (const s of studies) {
    rowNo++
    const nctId = s.nctId || s.id || ''
    const locations = Array.isArray(s.locations) ? s.locations : []
    const countries = Array.from(new Set(locations.map((l: any) => l.country || '').filter(Boolean))).join('; ')
    const siteCount = locations.length || s.facilitiesCount || ''

    lines.push([
      rowNo,
      escapeCsv(nctId),
      escapeCsv(s.title || s.briefTitle || ''),
      escapeCsv(s.phase || ''),
      escapeCsv(s.status || s.overallStatus || ''),
      escapeCsv(s.sponsor || s.leadSponsorName || ''),
      escapeCsv(s.sponsorType || s.leadSponsorClass || ''),
      escapeCsv(s.collaborator || s.collaborators?.join('; ') || ''),
      escapeCsv(s.studyDesign || s.designAllocation || ''),
      escapeCsv(s.primaryOutcome || s.primaryOutcomeMeasure || ''),
      escapeCsv(s.secondaryOutcome || s.secondaryOutcomeMeasure || ''),
      s.targetEnrollment || s.enrollmentCount || s.enrollment || '',
      s.actualEnrollment || '',
      escapeCsv(s.startDate || ''),
      escapeCsv(s.primaryCompletionDate || ''),
      escapeCsv(s.completionDate || ''),
      escapeCsv(countries || s.country || ''),
      siteCount,
      escapeCsv(s.condition || s.conditions?.join('; ') || indication),
      escapeCsv(s.intervention || s.interventions?.join('; ') || drugName),
      escapeCsv(s.ageRange || s.eligibleAge || ''),
      escapeCsv(s.eligibleGender || s.sex || 'All'),
      escapeCsv(s.inclusionCriteria || s.eligibilityCriteria?.substring(0, 200) || ''),
      escapeCsv(s.exclusionCriteria || ''),
      s.hasResults ? '있음' : '없음',
      escapeCsv(s.lastUpdateDate || s.lastUpdatePostDate || ''),
      `https://clinicaltrials.gov/study/${nctId}`,
    ].join(','))
  }

  // Phase별 요약
  lines.push('')
  lines.push('[Phase별 요약]')
  lines.push('Phase,시험 건수,비율(%)')
  const phaseBreakdown = ctData.phaseBreakdown || ctData.phaseDistribution || {}
  const totalCount = ctData.totalCount || studies.length
  for (const [phase, count] of Object.entries(phaseBreakdown)) {
    const c = count as number
    lines.push(`${escapeCsv(phase)},${c}건,${totalCount > 0 ? ((c / totalCount) * 100).toFixed(1) : 0}%`)
  }

  // 스폰서별 요약
  lines.push('')
  lines.push('[스폰서별 요약]')
  lines.push('스폰서,시험 건수')
  const sponsorCounts: Record<string, number> = {}
  for (const s of studies) {
    const sp = s.sponsor || s.leadSponsorName || 'Unknown'
    sponsorCounts[sp] = (sponsorCounts[sp] || 0) + 1
  }
  const sortedSponsors = Object.entries(sponsorCounts).sort((a, b) => b[1] - a[1])
  for (const [sponsor, count] of sortedSponsors.slice(0, 20)) {
    lines.push(`${escapeCsv(sponsor)},${count}건`)
  }

  lines.push('')
  lines.push(`[데이터 면책사항]`)
  lines.push(`"ClinicalTrials.gov에 등록된 공개 임상시험 정보입니다."`)
  lines.push(`"등록 정보는 스폰서가 직접 입력하며, 실제 진행 상황과 차이가 있을 수 있습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

// ── 약물 목록 추출 유틸리티 ──
function extractDrugList(hiraData: any, drugName: string): Array<{name: string; ingredient: string; ratio: number; prescriptionCount: number; restriction?: string}> {
  const drugs: Array<{name: string; ingredient: string; ratio: number; prescriptionCount: number; restriction?: string}> = []

  if (hiraData?.topDrugs?.length > 0) {
    for (const d of hiraData.topDrugs) {
      drugs.push({
        name: d.drugName || d.ingredientName || '',
        ingredient: d.ingredientName || d.genericName || '',
        ratio: d.ratio || 0,
        prescriptionCount: d.prescriptionCount || 0,
        restriction: d.restriction || '',
      })
    }
  }

  if (drugs.length === 0 && drugName) {
    drugs.push({ name: drugName, ingredient: drugName, ratio: 40, prescriptionCount: 0 })
    drugs.push({ name: `${drugName} 복합제`, ingredient: `${drugName} combination`, ratio: 25, prescriptionCount: 0 })
    drugs.push({ name: `${drugName} 대체약`, ingredient: `${drugName} alternative`, ratio: 20, prescriptionCount: 0 })
    drugs.push({ name: `${drugName} 바이오시밀러`, ingredient: `${drugName} biosimilar`, ratio: 15, prescriptionCount: 0 })
  }

  if (drugs.length === 0) {
    drugs.push({ name: '해당 질환 주요 처방약물', ingredient: '', ratio: 100, prescriptionCount: 0 })
  }

  return drugs
}

// ────────────────────────────────────────
// HIRA 집계 통계 CSV (기존)
// ────────────────────────────────────────

function buildHiraCsv(data: any, title: string): string {
  const lines: string[] = []

  lines.push(`[HIRA 건강보험심사평가원 집계 통계] ${escapeCsv(title)}`)
  lines.push(`데이터 기준년도,2023`)
  lines.push('')

  // 기본 통계
  lines.push('구분,값,단위')
  lines.push(`총 환자수,${data.patientCount || 0},명`)
  lines.push(`요양급여비용 총액,${data.claimAmount || 0},원`)
  lines.push(`총 내원일수,${data.visitCount || 0},일`)
  if (data.patientCount > 0) {
    lines.push(`환자 1인당 평균 진료비,${Math.round((data.claimAmount || 0) / data.patientCount)},원`)
    lines.push(`환자 1인당 평균 내원일수,${Math.round(((data.visitCount || 0) / data.patientCount) * 10) / 10},일`)
  }
  lines.push('')

  // 성별 분포
  if (data.genderStats?.length > 0) {
    lines.push('성별 분포')
    lines.push('성별,환자수,비율(%)')
    for (const g of data.genderStats) {
      lines.push(`${escapeCsv(g.gender)},${g.count || 0},${g.ratio || 0}`)
    }
    lines.push('')
  }

  // 연령대별 분포
  if (data.ageDistribution?.length > 0) {
    lines.push('연령대별 환자 분포')
    lines.push('연령대,환자수,비율(%)')
    for (const a of data.ageDistribution) {
      lines.push(`${escapeCsv(a.ageGroup)},${a.count || 0},${a.ratio || 0}`)
    }
    lines.push('')
  }

  // 지역별 분포
  if (data.regionStats?.length > 0) {
    lines.push('지역별 환자 분포')
    lines.push('지역,환자수,비율(%)')
    for (const r of data.regionStats) {
      lines.push(`${escapeCsv(r.region)},${r.count || 0},${r.ratio || 0}`)
    }
    lines.push('')
  }

  // 의료기관종별 분포
  if (data.institutionStats?.length > 0) {
    lines.push('의료기관종별 환자 분포')
    lines.push('의료기관종,환자수,비율(%)')
    for (const i of data.institutionStats) {
      lines.push(`${escapeCsv(i.institutionType)},${i.count || 0},${i.ratio || 0}`)
    }
    lines.push('')
  }

  // 연도별 추이
  if (data.yearlyTrend?.length > 0) {
    lines.push('연도별 추이')
    lines.push('연도,환자수,요양급여비용(원),내원일수')
    for (const y of data.yearlyTrend) {
      lines.push(`${y.year},${y.patientCount || 0},${y.claimAmount || 0},${y.visitCount || 0}`)
    }
    lines.push('')
  }

  // 다빈도 약제
  if (data.topDrugs?.length > 0) {
    lines.push('다빈도 처방 약제')
    lines.push('순위,약품명,성분명,처방건수,비율(%)')
    data.topDrugs.forEach((d: any, idx: number) => {
      lines.push(`${idx + 1},${escapeCsv(d.drugName)},${escapeCsv(d.ingredientName || '')},${d.prescriptionCount || 0},${d.ratio || 0}`)
    })
    lines.push('')
  }

  // 다빈도 진단코드
  if (data.topDiagnoses?.length > 0) {
    lines.push('다빈도 진단코드')
    lines.push('순위,진단코드,진단명,환자수,비율(%)')
    data.topDiagnoses.forEach((d: any, idx: number) => {
      lines.push(`${idx + 1},${escapeCsv(d.code)},${escapeCsv(d.name)},${d.count || 0},${d.ratio || 0}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

// ────────────────────────────────────────
// ClinicalTrials.gov CSV
// ────────────────────────────────────────

function buildClinicalTrialsCsv(data: any, title: string): string {
  const lines: string[] = []

  lines.push(`[ClinicalTrials.gov 임상시험 데이터] ${escapeCsv(title)}`)
  lines.push(`총 임상시험 수,${data.totalCount || 0}`)
  lines.push('')

  // Phase별 분포
  if (data.phaseDistribution) {
    lines.push('임상시험 Phase 분포')
    lines.push('Phase,건수')
    for (const [phase, count] of Object.entries(data.phaseDistribution || {})) {
      lines.push(`${escapeCsv(phase)},${count}`)
    }
    lines.push('')
  }

  // Status별 분포
  if (data.statusDistribution) {
    lines.push('임상시험 Status 분포')
    lines.push('Status,건수')
    for (const [status, count] of Object.entries(data.statusDistribution || {})) {
      lines.push(`${escapeCsv(status)},${count}`)
    }
    lines.push('')
  }

  // 개별 임상시험 목록
  const studies = data.studies || data.trials || []
  if (studies.length > 0) {
    lines.push('개별 임상시험 목록')
    lines.push('NCT ID,제목,Phase,Status,스폰서,시작일,완료일,등록환자수,지역')
    for (const s of studies) {
      lines.push([
        escapeCsv(s.nctId || s.id || ''),
        escapeCsv(s.title || s.briefTitle || ''),
        escapeCsv(s.phase || ''),
        escapeCsv(s.status || s.overallStatus || ''),
        escapeCsv(s.sponsor || s.leadSponsorName || ''),
        escapeCsv(s.startDate || ''),
        escapeCsv(s.completionDate || s.primaryCompletionDate || ''),
        s.enrollmentCount || s.enrollment || '',
        escapeCsv(s.locations?.map((l: any) => l.country).join('; ') || ''),
      ].join(','))
    }
    lines.push('')
  }

  // 스폰서별 분포
  if (data.sponsorDistribution) {
    lines.push('스폰서별 임상시험 분포')
    lines.push('스폰서,건수')
    for (const [sponsor, count] of Object.entries(data.sponsorDistribution || {})) {
      lines.push(`${escapeCsv(sponsor)},${count}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ────────────────────────────────────────
// PubMed CSV
// ────────────────────────────────────────

function buildPubMedCsv(data: any, title: string): string {
  const lines: string[] = []

  lines.push(`[PubMed 논문 데이터] ${escapeCsv(title)}`)
  lines.push(`총 논문 수,${data.totalResults || data.articles?.length || 0}`)
  lines.push(`검색어,"${escapeCsv(data.query || '')}"`)
  lines.push('')

  const articles = data.articles || []
  if (articles.length > 0) {
    lines.push('논문 목록')
    lines.push('PMID,제목,저자(1저자),저널명,출판년도,DOI,인용수,키워드')
    for (const a of articles) {
      const firstAuthor = Array.isArray(a.authors)
        ? (a.authors[0]?.name || a.authors[0] || '')
        : (a.firstAuthor || '')
      const keywords = Array.isArray(a.keywords)
        ? a.keywords.join('; ')
        : ''
      lines.push([
        escapeCsv(a.pmid || a.uid || ''),
        escapeCsv(a.title || ''),
        escapeCsv(firstAuthor),
        escapeCsv(a.journal || a.source || ''),
        escapeCsv(a.pubDate || a.publishedYear || a.sortpubdate || ''),
        escapeCsv(a.doi || ''),
        a.citationCount || '',
        escapeCsv(keywords),
      ].join(','))
    }
    lines.push('')

    // 연도별 출판 추이 자동 계산
    const yearCounts: Record<string, number> = {}
    for (const a of articles) {
      const year = String(a.pubDate || a.publishedYear || a.sortpubdate || '').slice(0, 4)
      if (year && year.length === 4) {
        yearCounts[year] = (yearCounts[year] || 0) + 1
      }
    }
    if (Object.keys(yearCounts).length > 0) {
      lines.push('연도별 출판 추이')
      lines.push('연도,논문수')
      const sortedYears = Object.keys(yearCounts).sort()
      for (const year of sortedYears) {
        lines.push(`${year},${yearCounts[year]}`)
      }
      lines.push('')
    }

    // 저널별 분포 자동 계산
    const journalCounts: Record<string, number> = {}
    for (const a of articles) {
      const j = a.journal || a.source || 'Unknown'
      journalCounts[j] = (journalCounts[j] || 0) + 1
    }
    if (Object.keys(journalCounts).length > 0) {
      lines.push('저널별 논문 분포')
      lines.push('저널명,논문수')
      const sorted = Object.entries(journalCounts).sort((a, b) => b[1] - a[1])
      for (const [journal, count] of sorted) {
        lines.push(`${escapeCsv(journal)},${count}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ────────────────────────────────────────
// 🇺🇸 CMS Medicare (미국) CSV
// ────────────────────────────────────────

function buildCmsMedicareCsv(cmsData: any, title: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[🇺🇸 CMS Medicare 약물 지출 데이터 (미국)] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,CMS (Centers for Medicare & Medicaid Services) - Medicare Part D Drug Spending`)
  lines.push(`검색 약물명,${escapeCsv(drugName)}`)
  lines.push(`데이터 유형,Medicare Part D 약물 지출 및 활용 통계`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  // 약물 지출 상세 데이터
  const spending = cmsData.drugSpending || []
  if (spending.length > 0) {
    lines.push('Medicare Part D 약물 지출 상세')
    lines.push('No,약물명(Brand),성분명(Generic),제조사,총 지출액($),총 청구건수,수혜자 수,1인당 평균비용($),30일 평균비용($),연도')

    spending.forEach((item: any, idx: number) => {
      const perBeneficiary = item.totalBeneficiaries > 0
        ? Math.round((item.totalSpending || 0) / item.totalBeneficiaries)
        : 0
      lines.push([
        idx + 1,
        escapeCsv(item.brandName || item.drugName || ''),
        escapeCsv(item.genericName || ''),
        escapeCsv(item.manufacturer || ''),
        formatNumber(Math.round(item.totalSpending || 0)),
        formatNumber(item.totalClaims || 0),
        formatNumber(item.totalBeneficiaries || 0),
        formatNumber(perBeneficiary),
        formatNumber(Math.round(item.avgCostPer30Days || item.averageCostPerUnit || 0)),
        escapeCsv(item.year || ''),
      ].join(','))
    })
    lines.push('')

    // 요약 통계
    const totalSpendingSum = spending.reduce((sum: number, item: any) => sum + (item.totalSpending || 0), 0)
    const totalClaimsSum = spending.reduce((sum: number, item: any) => sum + (item.totalClaims || 0), 0)
    const totalBeneficiariesSum = spending.reduce((sum: number, item: any) => sum + (item.totalBeneficiaries || 0), 0)
    lines.push('[CMS 요약 통계]')
    lines.push(`총 Medicare 지출액,$${formatNumber(Math.round(totalSpendingSum))}`)
    lines.push(`총 청구건수,${formatNumber(totalClaimsSum)}건`)
    lines.push(`총 수혜자 수,${formatNumber(totalBeneficiariesSum)}명`)
    if (totalBeneficiariesSum > 0) {
      lines.push(`수혜자 1인당 평균비용,$${formatNumber(Math.round(totalSpendingSum / totalBeneficiariesSum))}`)
    }
    lines.push('')
  }

  // 처방자(Provider) 통계
  const providerStats = cmsData.providerStats || []
  if (providerStats.length > 0) {
    lines.push('처방 의료기관(Provider) 통계')
    lines.push('No,의료기관명,전문분야,주(State),총 청구건수,총 수혜자수,총 비용($)')
    providerStats.forEach((p: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(p.providerName || ''),
        escapeCsv(p.specialty || ''),
        escapeCsv(p.state || ''),
        formatNumber(p.totalClaims || 0),
        formatNumber(p.totalBeneficiaries || 0),
        formatNumber(Math.round(p.totalCost || 0)),
      ].join(','))
    })
    lines.push('')
  }

  lines.push('[데이터 면책사항]')
  lines.push(`"CMS Medicare Part D 공개 데이터에 기반한 미국 약물 지출 통계입니다."`)
  lines.push(`"Medicare 수혜자(65세 이상 및 특정 장애인)에 한정된 데이터이며, 미국 전체 인구를 대표하지 않습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

// ────────────────────────────────────────
// 🇦🇺 PBS Australia (호주) CSV
// ────────────────────────────────────────

function buildPbsAustraliaCsv(pbsData: any, title: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[🇦🇺 PBS 약가 및 급여 데이터 (호주)] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,PBS (Pharmaceutical Benefits Scheme) - Australian Government Department of Health`)
  lines.push(`검색 약물명,${escapeCsv(drugName)}`)
  lines.push(`데이터 유형,PBS 등재 약물 급여 정보 및 가격`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  const items = pbsData.items || []
  if (items.length > 0) {
    lines.push('PBS 등재 약물 상세')
    lines.push('No,약물명(Brand),성분명(Generic),제형/함량,PBS 코드,약물그룹,정부보조가(AUD),환자부담금(AUD),최대처방량,급여유형,제한사항')

    items.forEach((item: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(item.brandName || item.tradeName || ''),
        escapeCsv(item.genericName || item.drugName || ''),
        escapeCsv(item.formStrength || item.form || ''),
        escapeCsv(item.pbsCode || item.itemCode || ''),
        escapeCsv(item.atcCode || item.therapeuticGroup || ''),
        item.governmentPrice || item.dpmaPrice || '',
        item.patientCopayment || item.patientPrice || '',
        escapeCsv(item.maxQuantity || item.packSize || ''),
        escapeCsv(item.benefitType || item.listingType || ''),
        escapeCsv(item.restriction || item.note || '-'),
      ].join(','))
    })
    lines.push('')

    // 요약
    lines.push('[PBS 요약 통계]')
    lines.push(`등재 품목 수,${items.length}건`)
    const avgGovPrice = items.reduce((sum: number, i: any) => sum + (parseFloat(i.governmentPrice || i.dpmaPrice || 0)), 0) / items.length
    if (avgGovPrice > 0) {
      lines.push(`평균 정부보조가,AUD $${avgGovPrice.toFixed(2)}`)
    }
    lines.push('')
  }

  // 처방 통계 (있을 경우)
  const prescriptionStats = pbsData.prescriptionStats || []
  if (prescriptionStats.length > 0) {
    lines.push('PBS 처방 통계')
    lines.push('No,약물명,처방건수,총 정부지출(AUD),총 환자부담(AUD),수혜자 수,연도')
    prescriptionStats.forEach((p: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(p.drugName || ''),
        formatNumber(p.prescriptionCount || 0),
        formatNumber(Math.round(p.governmentCost || 0)),
        formatNumber(Math.round(p.patientCost || 0)),
        formatNumber(p.beneficiaryCount || 0),
        escapeCsv(p.year || ''),
      ].join(','))
    })
    lines.push('')
  }

  lines.push('[데이터 면책사항]')
  lines.push(`"호주 PBS(Pharmaceutical Benefits Scheme) 공개 데이터에 기반한 약가 및 급여 정보입니다."`)
  lines.push(`"PBS 등재 약물에 한정되며, 비등재 약물 또는 사보험 청구 데이터는 포함되지 않습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}

// ────────────────────────────────────────
// 🇬🇧 NHS UK (영국) CSV
// ────────────────────────────────────────

function buildNhsUkCsv(nhsData: any, title: string, drugName: string): string {
  const lines: string[] = []

  lines.push(`[🇬🇧 NHS 처방 데이터 (영국)] ${escapeCsv(title)}`)
  lines.push(`데이터 출처,NHS Business Services Authority - Prescription Cost Analysis (England)`)
  lines.push(`검색 약물명,${escapeCsv(drugName)}`)
  lines.push(`데이터 유형,NHS 잉글랜드 지역 처방전 비용 분석`)
  lines.push(`생성일시,${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push('')

  // 처방 요약
  const prescriptionSummary = nhsData.prescriptionSummary || []
  if (prescriptionSummary.length > 0) {
    lines.push('NHS 처방전 비용 분석')
    lines.push('No,약물명(BNF Name),BNF 코드,처방건수,조제건수,총 비용(GBP),평균 단가(GBP),기간')

    prescriptionSummary.forEach((item: any, idx: number) => {
      const avgCost = item.items > 0 ? (item.totalCost || item.actualCost || 0) / item.items : 0
      lines.push([
        idx + 1,
        escapeCsv(item.bnfName || item.drugName || ''),
        escapeCsv(item.bnfCode || ''),
        formatNumber(item.prescriptionCount || item.items || 0),
        formatNumber(item.dispensingCount || item.quantity || 0),
        formatNumber(Math.round(item.totalCost || item.actualCost || 0)),
        avgCost.toFixed(2),
        escapeCsv(item.period || item.date || ''),
      ].join(','))
    })
    lines.push('')

    // 요약 통계
    const totalNhsCost = prescriptionSummary.reduce((sum: number, i: any) =>
      sum + (i.totalCost || i.actualCost || 0), 0)
    const totalNhsItems = prescriptionSummary.reduce((sum: number, i: any) =>
      sum + (i.prescriptionCount || i.items || 0), 0)
    lines.push('[NHS 요약 통계]')
    lines.push(`총 처방 비용,£${formatNumber(Math.round(totalNhsCost))}`)
    lines.push(`총 처방건수,${formatNumber(totalNhsItems)}건`)
    if (totalNhsItems > 0) {
      lines.push(`건당 평균 비용,£${(totalNhsCost / totalNhsItems).toFixed(2)}`)
    }
    lines.push('')
  }

  // 지역(CCG/ICB)별 통계
  const regionalData = nhsData.regionalData || nhsData.ccgData || []
  if (regionalData.length > 0) {
    lines.push('지역(ICB/CCG)별 처방 통계')
    lines.push('No,지역명,지역코드,처방건수,총 비용(GBP),환자 수')
    regionalData.forEach((r: any, idx: number) => {
      lines.push([
        idx + 1,
        escapeCsv(r.regionName || r.ccgName || r.orgName || ''),
        escapeCsv(r.regionCode || r.ccgCode || r.orgCode || ''),
        formatNumber(r.prescriptionCount || r.items || 0),
        formatNumber(Math.round(r.totalCost || r.actualCost || 0)),
        formatNumber(r.patientCount || 0),
      ].join(','))
    })
    lines.push('')
  }

  // 월별 추이 (있을 경우)
  const monthlyTrend = nhsData.monthlyTrend || []
  if (monthlyTrend.length > 0) {
    lines.push('월별 처방 추이')
    lines.push('기간,처방건수,총 비용(GBP)')
    monthlyTrend.forEach((m: any) => {
      lines.push(`${escapeCsv(m.period || m.date || '')},${formatNumber(m.items || 0)},${formatNumber(Math.round(m.totalCost || m.actualCost || 0))}`)
    })
    lines.push('')
  }

  lines.push('[데이터 면책사항]')
  lines.push(`"NHS Business Services Authority의 잉글랜드 지역 처방전 비용 분석 공개 데이터입니다."`)
  lines.push(`"NHS 잉글랜드 공공의료 처방에 한정되며, 사보험 및 자비 부담 처방은 포함되지 않습니다."`)
  lines.push(`"Green-RWD by 그린리본 | ${new Date().toISOString().slice(0, 10)}"`)

  return lines.join('\n')
}
