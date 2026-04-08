/**
 * ClinicalTrials.gov API v2 통합 모듈
 *
 * 역할:
 * 1. ClinicalTrials.gov API v2를 통한 임상시험 데이터 조회
 * 2. 약물명 + 적응증으로 진행 중인 임상시험 검색
 * 3. 상 구조화된 임상시험 데이터 반환
 * 4. 타임아웃으로 인한 요청 차단 (최대 8초)
 */

export interface ClinicalTrial {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  enrollment: number;
  sponsor: string;
  startDate?: string;
  completionDate?: string;
}

export interface ClinicalTrialsData {
  totalCount: number;
  phaseBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  topStudies: ClinicalTrial[];
}

/**
 * ClinicalTrials.gov에서 임상시험 검색
 * @param drugName 약물명 (조건: "drug1 OR drug2" 형식 지원)
 * @param indication 적응증 (예: "Type 2 Diabetes")
 * @returns 구조화된 임상시험 데이터 또는 null (에러 시)
 */
export async function fetchClinicalTrials(
  drugName: string,
  indication: string
): Promise<ClinicalTrialsData | null> {
  const MAX_TIMEOUT = 8000; // 8초 타임아웃
  const API_URL = 'https://clinicaltrials.gov/api/v2/studies';

  try {
    // AbortController로 타임아웃 구현
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);

    const queryParams = new URLSearchParams({
      'query.cond': indication,
      'query.intr': drugName,
      'countTotal': 'true',
      'pageSize': '10',
      'sort': 'LastUpdatePostDate:desc',
    });

    console.log(`[ClinicalTrials] Fetching: drug="${drugName}", indication="${indication}"`)

    const response = await fetch(`${API_URL}?${queryParams.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[ClinicalTrials] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // 응답 구조 검증
    if (!data.totalCount || !Array.isArray(data.studies)) {
      console.log(`[ClinicalTrials] No studies found for: ${drugName} / ${indication}`);
      return null;
    }

    // Phase 및 Status 분류
    const phaseBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    const topStudies: ClinicalTrial[] = [];

    for (const study of data.studies) {
      const protocolSection = study.protocolSection;
      if (!protocolSection) continue;

      const identModule = protocolSection.identificationModule;
      const statusModule = protocolSection.statusModule;
      const designModule = protocolSection.designModule;
      const sponsorModule = protocolSection.sponsorCollaboratorsModule;

      if (!identModule || !statusModule || !designModule) continue;

      // Phase 추출
      const phases = designModule.phases || [];
      const phaseStr = phases.length > 0 ? phases[0] : 'Not Specified';

      // Status 추출
      const status = statusModule.overallStatus || 'Unknown';

      // Enrollment 추출
      const enrollment = designModule.enrollmentInfo?.count || 0;

      // Sponsor 추출
      const sponsor = sponsorModule?.leadSponsor?.name || 'Unknown';

      // 날짜 추출
      const startDate = statusModule.startDateStruct?.date;
      const completionDate = statusModule.completionDateStruct?.date;

      // 분류 집계
      phaseBreakdown[phaseStr] = (phaseBreakdown[phaseStr] || 0) + 1;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      // Top 10 studies 추가
      if (topStudies.length < 10) {
        topStudies.push({
          nctId: identModule.nctId || '',
          title: identModule.briefTitle || '',
          phase: phaseStr,
          status,
          enrollment,
          sponsor,
          startDate,
          completionDate,
        });
      }
    }

    console.log(`[ClinicalTrials] Retrieved ${data.totalCount} studies, phase breakdown:`, phaseBreakdown);

    return {
      totalCount: data.totalCount,
      phaseBreakdown,
      statusBreakdown,
      topStudies,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[ClinicalTrials] Request timeout (>8s): ${drugName} / ${indication}`);
    } else {
      console.error(`[ClinicalTrials] Fetch error:`, error);
    }
    return null;
  }
}

/**
 * 임상시험 데이터를 보고서용 마크다운 섹션으로 포맷
 * @param data ClinicalTrialsData
 * @returns 마크다운 형식의 섹션 문자열
 */
export function formatClinicalTrialsForReport(data: ClinicalTrialsData | null): string {
  if (!data) {
    return `## 임상시험 현황

ClinicalTrials.gov 데이터 조회를 실패했습니다. 최신 임상시험 정보는 ClinicalTrials.gov에서 직접 확인하시기 바랍니다.
`;
  }

  // Phase 분류 포맷
  const phaseItems = Object.entries(data.phaseBreakdown)
    .sort(([a], [b]) => {
      const order: Record<string, number> = {
        'Phase 1': 1,
        'Phase 2': 2,
        'Phase 3': 3,
        'Phase 4': 4,
        'Not Specified': 5,
      };
      return (order[a] || 99) - (order[b] || 99);
    })
    .map(([phase, count]) => `- ${phase}: ${count}건`)
    .join('\n');

  // Status 분류 포맷
  const statusItems = Object.entries(data.statusBreakdown)
    .sort(([a], [b]) => (data.statusBreakdown[b] || 0) - (data.statusBreakdown[a] || 0))
    .map(([status, count]) => `- ${status}: ${count}건`)
    .join('\n');

  // Top Studies 테이블 생성
  const tableRows = data.topStudies
    .map((study) => {
      const enrollmentStr = study.enrollment > 0 ? study.enrollment.toString() : '-';
      return `| ${study.nctId} | ${study.title.substring(0, 50)}... | ${study.phase} | ${study.status} | ${enrollmentStr} |`;
    })
    .join('\n');

  return `## 임상시험 현황

### 개요
ClinicalTrials.gov에서 조회한 임상시험 데이터 (최신 10건)

**전체 임상시험 건수**: ${data.totalCount}건

### 임상단계별 분류
${phaseItems}

### 상태별 분류
${statusItems}

### 주요 임상시험 (상위 10건)

| NCT ID | 시험명 | 단계 | 상태 | 등록환자 수 |
|--------|--------|------|------|-----------|
${tableRows}

*자료출처: ClinicalTrials.gov (미국 NIH)*
`;
}
