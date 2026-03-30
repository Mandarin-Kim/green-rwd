import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ===== 시장보고서 =====
  await prisma.marketReport.createMany({
    data: [
      { title: 'Entresto (Sacubitril/Valsartan) 시장 분석', categories: ['심혈관', '심부전'], marketSize: '2.8조원', patients: '심부전 환자', patientCount: 245000, tier: 'Tier1', region: '글로벌' },
      { title: 'Keytruda (Pembrolizumab) NSCLC 시장', categories: ['항암', '면역항암'], marketSize: '5.2조원', patients: 'NSCLC 환자', patientCount: 380000, tier: 'Tier1', region: '글로벌' },
      { title: 'Ozempic (Semaglutide) 비만/당뇨 시장', categories: ['대사질환', '당뇨'], marketSize: '4.1조원', patients: '제2형 당뇨 환자', patientCount: 520000, tier: 'Tier1', region: '글로벌' },
      { title: 'Leqembi (Lecanemab) 알츠하이머 시장', categories: ['CNS', '알츠하이머'], marketSize: '1.5조원', patients: '초기 알츠하이머 환자', patientCount: 180000, tier: 'Tier2', region: '미국' },
      { title: 'Dupixent (Dupilumab) 아토피 시장', categories: ['면역', '피부'], marketSize: '3.3조원', patients: '중등도-중증 아토피 환자', patientCount: 290000, tier: 'Tier1', region: '글로벌' },
      { title: 'Jardiance (Empagliflozin) 심부전 적응증 확대', categories: ['심혈관', '대사질환'], marketSize: '1.9조원', patients: '심부전 동반 당뇨 환자', patientCount: 156000, tier: 'Tier2', region: '한국' }
    ]
  })

  // ===== RWD 데이터 =====
  await prisma.rWDRecord.createMany({
    data: [
      { ageGroup: '50-59세', gender: '남', icd10: 'I50.0', diagnosis: '울혈성 심부전', medication: 'Entresto', region: '서울', channel: '처방데이터', lastActivity: '2024-01-15' },
      { ageGroup: '60-69세', gender: '여', icd10: 'I50.1', diagnosis: '좌심부전', medication: 'Entresto', region: '경기', channel: '보험청구', lastActivity: '2024-01-12' },
      { ageGroup: '40-49세', gender: '남', icd10: 'C34.1', diagnosis: '비소세포폐암', medication: 'Keytruda', region: '서울', channel: '처방데이터', lastActivity: '2024-01-18' },
      { ageGroup: '70-79세', gender: '여', icd10: 'I50.9', diagnosis: '심부전(상세불명)', medication: 'Jardiance', region: '부산', channel: 'EMR', lastActivity: '2024-01-10' },
      { ageGroup: '50-59세', gender: '남', icd10: 'C34.9', diagnosis: 'NSCLC', medication: 'Keytruda', region: '대전', channel: '처방데이터', lastActivity: '2024-01-20' },
      { ageGroup: '60-69세', gender: '남', icd10: 'E11.9', diagnosis: '제2형 당뇨', medication: 'Ozempic', region: '서울', channel: '보험청구', lastActivity: '2024-01-14' },
      { ageGroup: '30-39세', gender: '여', icd10: 'L20.9', diagnosis: '아토피 피부염', medication: 'Dupixent', region: '인천', channel: 'EMR', lastActivity: '2024-01-16' },
      { ageGroup: '40-49세', gender: '여', icd10: 'G30.0', diagnosis: '초기 알츠하이머', medication: 'Leqembi', region: '서울', channel: '처방데이터', lastActivity: '2024-01-08' },
      { ageGroup: '60-69세', gender: '남', icd10: 'I50.0', diagnosis: '울혈성 심부전', medication: 'Entresto', region: '광주', channel: '보험청구', lastActivity: '2024-01-22' },
      { ageGroup: '50-59세', gender: '여', icd10: 'C34.1', diagnosis: '비소세포폐암', medication: 'Keytruda', region: '대구', channel: 'EMR', lastActivity: '2024-01-19' },
      { ageGroup: '70-79세', gender: '남', icd10: 'E11.5', diagnosis: '당뇨병성 합병증', medication: 'Jardiance', region: '경기', channel: '보험청구', lastActivity: '2024-01-11' },
      { ageGroup: '40-49세', gender: '여', icd10: 'L20.0', diagnosis: '중등도 아토피', medication: 'Dupixent', region: '서울', channel: '처방데이터', lastActivity: '2024-01-21' },
      { ageGroup: '80세 이상', gender: '여', icd10: 'G30.1', diagnosis: '알츠하이머 치매', medication: 'Leqembi', region: '경기', channel: 'EMR', lastActivity: '2024-01-05' },
      { ageGroup: '50-59세', gender: '남', icd10: 'I50.1', diagnosis: '좌심부전', medication: 'Entresto', region: '서울', channel: '처방데이터', lastActivity: '2024-01-17' },
      { ageGroup: '60-69세', gender: '여', icd10: 'E11.9', diagnosis: '제2형 당뇨', medication: 'Ozempic', region: '부산', channel: '보험청구', lastActivity: '2024-01-13' }
    ]
  })

  // ===== 세그먼트 =====
  await prisma.segment.createMany({
    data: [
      { name: 'HF-Entresto 타겟', patientCount: 3240, status: 'active', tags: ['심부전', 'Entresto', '50대이상'] },
      { name: 'NSCLC-IO 후보', patientCount: 1850, status: 'active', tags: ['폐암', 'Keytruda', '면역항암'] },
      { name: 'T2DM-GLP1 전환대상', patientCount: 5120, status: 'active', tags: ['당뇨', 'Ozempic', 'GLP-1'] },
      { name: 'AD-Early Stage', patientCount: 980, status: 'active', tags: ['알츠하이머', 'Leqembi', '초기'] },
      { name: 'Atopy-Moderate-Severe', patientCount: 2750, status: 'archived', tags: ['아토피', 'Dupixent', '중등도이상'] }
    ]
  })

  // ===== 캠페인 =====
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: { name: 'Entresto HF 인식 캠페인', type: '이메일', status: 'active', targetCount: 3240, sentCount: 2890, openRate: 32.5, clickRate: 8.7, responsible: '김연구', startDate: new Date('2024-01-01') }
    }),
    prisma.campaign.create({
      data: { name: 'Keytruda NSCLC 임상 모집', type: 'SMS', status: 'active', targetCount: 1850, sentCount: 1200, openRate: 45.2, clickRate: 12.3, responsible: '박의사', startDate: new Date('2024-01-15') }
    }),
    prisma.campaign.create({
      data: { name: 'Ozempic T2DM 전환 안내', type: '우편', status: 'completed', targetCount: 5120, sentCount: 5120, openRate: 28.1, clickRate: 5.6, responsible: '이마케터', startDate: new Date('2023-12-01'), endDate: new Date('2024-01-31') }
    })
  ])

  // ===== 발송 =====
  await prisma.sending.createMany({
    data: [
      { campaignId: campaigns[0].id, status: 'pending', totalCount: 2340 },
      { campaignId: campaigns[1].id, status: 'approved', totalCount: 850, approvedBy: '본부장님', approvedAt: new Date('2024-01-20') },
      { campaignId: campaigns[2].id, status: 'completed', totalCount: 5120, sentCount: 5120, successCount: 4980, failCount: 140, executedAt: new Date('2024-01-01'), completedAt: new Date('2024-01-02') }
    ]
  })

  // ===== 대상자 =====
  const subjects = await Promise.all([
    prisma.subject.create({ data: { screeningId: 'SCR-0001', name: '김철수', age: 55, gender: '남', diagnosis: '울혈성 심부전', site: '서울대병원', status: 'enrolled', enrollDate: new Date('2024-01-05') } }),
    prisma.subject.create({ data: { screeningId: 'SCR-0002', name: '박영희', age: 63, gender: '여', diagnosis: '좌심부전', site: '삼성서울병원', status: 'screening' } }),
    prisma.subject.create({ data: { screeningId: 'SCR-0003', name: '이민호', age: 48, gender: '남', diagnosis: 'NSCLC Stage III', site: '아산병원', status: 'eligible' } }),
    prisma.subject.create({ data: { screeningId: 'SCR-0004', name: '최수진', age: 72, gender: '여', diagnosis: '심부전(상세불명)', site: '세브란스병원', status: 'enrolled', enrollDate: new Date('2024-01-10') } }),
    prisma.subject.create({ data: { screeningId: 'SCR-0005', name: '정대한', age: 51, gender: '남', diagnosis: 'NSCLC Stage II', site: '서울대병원', status: 'withdrawn' } }),
    prisma.subject.create({ data: { screeningId: 'SCR-0006', name: '한미영', age: 45, gender: '여', diagnosis: '중등도 아토피', site: '고대안암병원', status: 'screening' } }),
    prisma.subject.create({ data: { screeningId: 'SCR-0007', name: '오진우', age: 67, gender: '남', diagnosis: '제2형 당뇨', site: '분당서울대', status: 'eligible' } }),
    prisma.subject.create({ data: { screeningId: 'SCR-0008', name: '윤서연', age: 78, gender: '여', diagnosis: '초기 알츠하이머', site: '삼성서울병원', status: 'screening' } })
  ])

  // ===== 프로젝트 =====
  await prisma.project.createMany({
    data: [
      { name: 'GR-HF-2024 심부전 RWD 연구', phase: 'Phase III', indication: '울혈성 심부전', pi: '김교수', site: '서울대병원', targetN: 300, enrolledN: 128, status: 'recruiting', startDate: new Date('2024-01-01') },
      { name: 'GR-ONC-NSCLC IO 임상', phase: 'Phase II', indication: 'NSCLC', pi: '박교수', site: '아산병원', targetN: 200, enrolledN: 45, status: 'recruiting', startDate: new Date('2024-02-01') },
      { name: 'GR-AD-Early 알츠하이머 연구', phase: 'Phase III', indication: '초기 알츠하이머', pi: '이교수', site: '삼성서울병원', targetN: 150, enrolledN: 0, status: 'planning', startDate: new Date('2024-06-01') }
    ]
  })

  // ===== eClinical: Studies =====
  const studies = await Promise.all([
    prisma.study.create({ data: { code: 'GR-ONC-2024-001', name: 'Entresto HF Phase III', phase: 'Phase III', indication: '심부전' } }),
    prisma.study.create({ data: { code: 'GR-CNS-2024-002', name: 'NSCLC IO Study', phase: 'Phase II', indication: 'NSCLC' } }),
    prisma.study.create({ data: { code: 'GR-CV-2024-003', name: 'Early AD Trial', phase: 'Phase III', indication: '알츠하이머' } })
  ])

  // ===== EDC Forms =====
  await prisma.eDCForm.createMany({
    data: [
      { studyId: studies[0].id, formName: 'Informed Consent', version: '2.0', status: 'active', submissions: 128, queries: 3 },
      { studyId: studies[0].id, formName: 'Demographics', version: '1.1', status: 'active', submissions: 128, queries: 0 },
      { studyId: studies[0].id, formName: 'Medical History', version: '1.0', status: 'active', submissions: 125, queries: 5 },
      { studyId: studies[0].id, formName: 'Vital Signs', version: '1.2', status: 'active', submissions: 890, queries: 12 },
      { studyId: studies[0].id, formName: 'Echocardiogram', version: '1.0', status: 'active', submissions: 256, queries: 2 },
      { studyId: studies[1].id, formName: 'Informed Consent', version: '1.0', status: 'active', submissions: 45, queries: 1 },
      { studyId: studies[1].id, formName: 'Tumor Assessment', version: '2.1', status: 'active', submissions: 38, queries: 8 },
      { studyId: studies[1].id, formName: 'Lab Results', version: '1.0', status: 'active', submissions: 142, queries: 4 }
    ]
  })

  // ===== CTMS Sites & Milestones =====
  await prisma.cTMSSite.createMany({
    data: [
      { studyId: studies[0].id, siteName: '서울대병원', pi: '김교수', status: 'active', enrolled: 45, target: 80 },
      { studyId: studies[0].id, siteName: '삼성서울병원', pi: '이교수', status: 'active', enrolled: 38, target: 70 },
      { studyId: studies[0].id, siteName: '아산병원', pi: '박교수', status: 'active', enrolled: 28, target: 80 },
      { studyId: studies[0].id, siteName: '세브란스병원', pi: '최교수', status: 'active', enrolled: 17, target: 70 }
    ]
  })

  await prisma.cTMSMilestone.createMany({
    data: [
      { studyId: studies[0].id, name: 'First Patient In', dueDate: new Date('2024-01-15'), status: 'completed' },
      { studyId: studies[0].id, name: '50% Enrollment', dueDate: new Date('2024-06-30'), status: 'pending' },
      { studyId: studies[0].id, name: 'Last Patient In', dueDate: new Date('2024-12-31'), status: 'pending' },
      { studyId: studies[0].id, name: 'Database Lock', dueDate: new Date('2025-06-30'), status: 'pending' }
    ]
  })

  // ===== SAE Reports =====
  await prisma.sAEReport.createMany({
    data: [
      { studyId: studies[0].id, subjectId: subjects[0].id, site: '서울대병원', event: '급성 신부전', severity: 'severe', reportDate: new Date('2024-01-20'), status: 'open' },
      { studyId: studies[0].id, subjectId: subjects[3].id, site: '세브란스병원', event: '저혈압 실신', severity: 'moderate', reportDate: new Date('2024-01-18'), status: 'under-review' },
      { studyId: studies[0].id, subjectId: subjects[0].id, site: '서울대병원', event: '고칼륨혈증', severity: 'moderate', reportDate: new Date('2024-01-22'), status: 'open' },
      { studyId: studies[1].id, subjectId: subjects[2].id, site: '아산병원', event: '면역관련 폐렴', severity: 'severe', reportDate: new Date('2024-01-25'), status: 'open' },
      { studyId: studies[1].id, subjectId: subjects[4].id, site: '서울대병원', event: '간독성 Grade 3', severity: 'severe', reportDate: new Date('2024-01-15'), status: 'closed' }
    ]
  })

  // ===== AE Summary =====
  await prisma.aESummary.createMany({
    data: [
      { studyId: studies[0].id, term: '저혈압', total: 23, mild: 15, moderate: 6, severe: 2 },
      { studyId: studies[0].id, term: '어지러움', total: 18, mild: 14, moderate: 4, severe: 0 },
      { studyId: studies[0].id, term: '고칼륨혈증', total: 12, mild: 7, moderate: 4, severe: 1 },
      { studyId: studies[0].id, term: '신기능 저하', total: 8, mild: 3, moderate: 3, severe: 2 },
      { studyId: studies[0].id, term: '기침', total: 15, mild: 13, moderate: 2, severe: 0 },
      { studyId: studies[0].id, term: '피로', total: 20, mild: 16, moderate: 4, severe: 0 },
      { studyId: studies[0].id, term: '오심', total: 10, mild: 8, moderate: 2, severe: 0 },
      { studyId: studies[1].id, term: '면역관련 폐렴', total: 5, mild: 1, moderate: 2, severe: 2 },
      { studyId: studies[1].id, term: '피부 발진', total: 12, mild: 9, moderate: 3, severe: 0 },
      { studyId: studies[1].id, term: '갑상선 기능저하', total: 8, mild: 6, moderate: 2, severe: 0 }
    ]
  })

  // ===== eTMF Documents =====
  await prisma.eTMFDocument.createMany({
    data: [
      { studyId: studies[0].id, name: 'Protocol v2.0', zone: 'Zone 01', uploader: '김연구', date: new Date('2024-01-05'), size: '2.4MB' },
      { studyId: studies[0].id, name: 'IB (Investigator Brochure)', zone: 'Zone 02', uploader: '김연구', date: new Date('2024-01-03'), size: '8.1MB' },
      { studyId: studies[0].id, name: 'IRB Approval Letter', zone: 'Zone 03', uploader: '박행정', date: new Date('2024-01-10'), size: '520KB' },
      { studyId: studies[0].id, name: 'Site Initiation Visit Report', zone: 'Zone 04', uploader: '이모니터', date: new Date('2024-01-20'), size: '1.8MB' },
      { studyId: studies[0].id, name: 'Monitoring Report #1', zone: 'Zone 05', uploader: '이모니터', date: new Date('2024-02-01'), size: '3.2MB' },
      { studyId: studies[0].id, name: 'SAE Narrative', zone: 'Zone 06', uploader: '김연구', date: new Date('2024-01-22'), size: '780KB' }
    ]
  })

  // ===== eConsent Forms =====
  await prisma.eConsentForm.createMany({
    data: [
      { studyId: studies[0].id, formName: '주 동의서 (Main ICF)', version: '2.0', status: 'active', signedCount: 128, totalCount: 135 },
      { studyId: studies[0].id, formName: '유전체 분석 동의서', version: '1.1', status: 'active', signedCount: 95, totalCount: 135 },
      { studyId: studies[0].id, formName: '바이오뱅크 동의서', version: '1.0', status: 'active', signedCount: 108, totalCount: 135 },
      { studyId: studies[0].id, formName: '선택적 약물유전체 동의서', version: '1.0', status: 'draft', signedCount: 0, totalCount: 0 },
      { studyId: studies[0].id, formName: '영상의학 부수연구 동의서', version: '1.0', status: 'active', signedCount: 72, totalCount: 135 }
    ]
  })

  // ===== eConsent Records =====
  for (const subj of subjects.slice(0, 5)) {
    await prisma.eConsentRecord.create({
      data: {
        studyId: studies[0].id,
        subjectId: subj.id,
        mainConsent: subj.status === 'enrolled' ? 'signed' : 'pending',
        genomicConsent: subj.status === 'enrolled' ? 'signed' : 'pending',
        biobankConsent: subj.status === 'enrolled' ? 'signed' : 'declined',
        signedAt: subj.status === 'enrolled' ? new Date() : null
      }
    })
  }

  // ===== IWRS Assignments =====
  await prisma.iWRSAssignment.createMany({
    data: [
      { studyId: studies[0].id, subjectId: subjects[0].id, group: 'Treatment', kit: 'KIT-A-001', date: new Date('2024-01-05'), status: 'active' },
      { studyId: studies[0].id, subjectId: subjects[3].id, group: 'Control', kit: 'KIT-B-015', date: new Date('2024-01-10'), status: 'active' },
      { studyId: studies[1].id, subjectId: subjects[2].id, group: 'Treatment', kit: 'KIT-C-008', date: new Date('2024-02-01'), status: 'active' }
    ]
  })

  // ===== 설정 =====
  await prisma.setting.createMany({
    data: [
      { category: 'basic', key: 'companyName', value: '그린리본' },
      { category: 'basic', key: 'platformName', value: 'Green-RWD' },
      { category: 'basic', key: 'adminEmail', value: 'kgr@green-ribbon.co.kr' },
      { category: 'basic', key: 'timezone', value: 'Asia/Seoul' },
      { category: 'notification', key: 'emailEnabled', value: 'true' },
      { category: 'notification', key: 'smsEnabled', value: 'true' },
      { category: 'notification', key: 'saeAlert', value: 'true' },
      { category: 'notification', key: 'approvalAlert', value: 'true' },
      { category: 'system', key: 'dataRetentionDays', value: '365' },
      { category: 'system', key: 'maxUploadSize', value: '50MB' },
      { category: 'system', key: 'apiRateLimit', value: '1000' }
    ]
  })

  console.log('✅ Seed completed!')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })