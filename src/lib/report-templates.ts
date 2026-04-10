export type SectionMode = 'data-only' | 'data-with-ai-insight' | 'ai-insight-only'

export interface ReportSection {
  id: string
  title: string
  description: string
  mode: SectionMode
  systemPrompt: string  // Only used for 'data-with-ai-insight' and 'ai-insight-only' modes
  aiProvider: 'openai' | 'anthropic'
  tier: 'BASIC' | 'PRO' | 'PREMIUM'
  requiredData: ('hira' | 'clinicaltrials' | 'pubmed' | 'global')[]  // Which data sources this section needs
}

export const reportSections: ReportSection[] = [
  // === BASIC Tier (1-5) ===
  {
    id: 'executive-summary',
    title: '경영진 요약 (Executive Summary)',
    description: '보고서 전체 핵심 내용 요약 - 실측 데이터 기반',
    mode: 'data-with-ai-insight',
    aiProvider: 'anthropic',
    tier: 'BASIC',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: `당신은 글로벌 제약/바이오 시장 분석 전문가입니다.

[절대 원칙]
- 아래 제공된 실측 데이터의 수치만 사용하세요. 데이터에 없는 수치를 만들어내지 마세요.
- "글로벌 시장 규모 XX억 달러" 같은 출처 없는 통계를 절대 사용하지 마세요.
- Grand View Research, Mordor Intelligence 등 시장조사 기관명을 언급하지 마세요.
- 모든 수치는 반드시 제공된 데이터에서 인용하세요.

[작성 범위]
1. 핵심 발견 (Key Findings) - 실측 데이터에서 도출된 핵심 인사이트 3-5개
2. 시장 현황 요약 - HIRA 처방 데이터 기반 국내 시장 현황
3. 임상 개발 현황 요약 - ClinicalTrials.gov 데이터 기반
4. 글로벌 비교 요약 - CMS/PBS/NHS 데이터 기반
5. 전략적 시사점

최소 1000자. 데이터를 근거로 서술하세요.`,
  },
  {
    id: 'disease-overview',
    title: '질환 개요 및 역학 (Disease Overview)',
    description: 'HIRA 진료 데이터 기반 질환 분석 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'BASIC',
    requiredData: ['hira'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'treatment-landscape',
    title: '치렌 현황 (Treatment Landscape)',
    description: 'HIRA 처방 데이터 기반 치료제 분석 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'BASIC',
    requiredData: ['hira'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'market-size',
    title: '시장 규모 분석 (Market Size)',
    description: '실측 데이터 기반 시장 규모 + AI 성장률 해석',
    mode: 'data-with-ai-insight',
    aiProvider: 'anthropic',
    tier: 'BASIC',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: `당신은 글로벌 제약/바이오 시장 분석 전문가입니다.

[절대 원칙]
- 아래 제공된 실측 데이터의 수치만 사용하세요.
- "글로벌 시장 규모 XX억 달러"처럼 출처 없는 숫자를 쓰지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
실측 데이터 테이블은 이미 코드로 생성되어 있습니다. 당신은 아래 내용만 작성하세요:
1. 성장 동인 분석 — 제공된 데이터에서 관찰되는 성장 요인 해석
2. 리스크 분석 — 데이터에서 보이는 위험 요소
3. 향후 전망 — 제공된 데이터 트렌드 기반 예측 (반드시 근거 명시)
4. 전략적 시사점

최소 1500자. 구체적 근거를 들어 분석하세요.`,
  },
  {
    id: 'market-segmentation',
    title: '시장 세분화 (Market Segmentation)',
    description: 'HIRA 의료기관/지역/연령 데이터 기반 세분화 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'BASIC',
    requiredData: ['hira'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },

  // === PRO Tier (6-10) ===
  {
    id: 'competitive-landscape',
    title: '경쟁 환경 분석 (Competitive Landscape)',
    description: 'ClinicalTrials + HIRA 처방 데이터 기반 경쟁 분석',
    mode: 'data-with-ai-insight',
    aiProvider: 'openai',
    tier: 'PRO',
    requiredData: ['clinicaltrials', 'hira', 'global'],
    systemPrompt: `당신은 제약산업 경쟁 분석 전문가입니다.

[절대 원칙]
- 제공된 데이터(ClinicalTrials.gov 스폰서 목록, HIRA 처방 데이터, CMS/PBS/NHS 약물 데이터)만 근거로 사용하세요.
- 데이터에 없는 기업의 매출이나 시장점유율을 만들어내지 마세요.
- "XX사의 매출은 OO억 달러"같은 검증 불가능한 수치를 쓰지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
제공된 데이터에서 관찰되는 경쟁 환경을 분석:
1. ClinicalTrials.gov 스폰서별 임상시험 분포 → 어떤 기업이 이 영역에 투자하고 있는지
2. CMS/PBS/NHS 데이터에 나타난 약물별 지출 → 어떤 약물이 실제로 시장을 주도하는지
3. 경쟁 구도 해석 및 전략적 포지셔닝 시사점

최소 2000자. 데이터에서 읽히는 경쟁 구도를 분석하세요.`,
  },
  {
    id: 'pipeline-analysis',
    title: '파이프라인 분석 (Pipeline Analysis)',
    description: 'ClinicalTrials.gov 실측 데이터 기반 파이프라인 현황 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'openai',
    tier: 'PRO',
    requiredData: ['clinicaltrials'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'global-comparison',
    title: '글로벌 시장 비교 (Global Market Comparison)',
    description: 'CMS/PBS/NHS 실측 데이터 기반 국가별 비교 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'PRO',
    requiredData: ['hira', 'global'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'regulatory-landscape',
    title: '규제 환경 분석 (Regulatory Landscape)',
    description: '데이터 기반 규제 환경 + AI 정책 해석',
    mode: 'data-with-ai-insight',
    aiProvider: 'anthropic',
    tier: 'PRO',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: `당신은 제약 규제 및 약가 정책 전문가입니다.

[절대 원칙]
- HIRA 급여 데이터, CMS Medicare 지출 데이터, PBS 보조금 데이터, NHS 처방 데이터만 근거로 사용하세요.
- 데이터에 없는 규제 정책이나 약가 정보를 만들어내지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
1. 한국 규제 현황 — HIRA 급여 목록 데이터 기반 분석
2. 미국 CMS Medicare — 약물 지출 및 수혜자 데이터 기반 규제 환경 분석
3. 호주 PBS — 보조금 데이터 기반 약가 정책 분석
4. 영국 NHS — 처방 데이터 기반 의약품 접근성 분석
5. 국가간 규제 비교 및 시사점

최소 2000자. 실측 데이터를 근거로 규제 환경을 분석하세요.`,
  },
  {
    id: 'pricing-reimbursement',
    title: '약가 및 보험급여 분석 (Pricing & Reimbursement)',
    description: 'HIRA/CMS/PBS/NHS 실측 데이터 기반 약가 비교 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'PRO',
    requiredData: ['hira', 'global'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },

  // === PREMIUM Tier (11-16) ===
  {
    id: 'clinical-deep-dive',
    title: '임상시험 싸층 분석 (Clinical Deep Dive)',
    description: 'ClinicalTrials.gov + PubMed 데이터 기반 심층 분석',
    mode: 'data-with-ai-insight',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['clinicaltrials', 'pubmed'],
    systemPrompt: `당신은 임상시험 및 의학 연구 분석 전문가입니다.

[절대 원칙]
- ClinicalTrials.gov 데이터와 PubMed 논문 인용 데이터만 근거로 사용하세요.
- 데이터에 없는 임상 결과나 효능/안전성 수치를 만들어내지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
1. 임상시험 Phase별 심층 분석 — Phase I/II/III/IV별 특성
2. 주요 스폰서별 임상시험 전략 분석
3. PubMed 최신 논문 인용 기반 연구 트렌드
4. 임상 개발 성공/실패 요인 분석
5. 향후 임상 개발 전망

최소 2500자. 데이터 기반으로 심층 분석하세요.`,
  },
  {
    id: 'pubmed-evidence',
    title: '학술 문헌 분석 (PubMed Evidence)',
    description: 'PubMed 최신 논문 데이터 기반 근거 분석 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['pubmed'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'investment-outlook',
    title: '투자 전망 (Investment Outlook)',
    description: '전체 데이터 종합 + AI 투자 분석',
    mode: 'data-with-ai-insight',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'pubmed', 'global'],
    systemPrompt: `당신은 바이오/제약 투자 분석 전문가입니다.

[절대 원칙]
- 제공된 모든 실측 데이터(HIRA, ClinicalTrials.gov, PubMed, CMS/PBS/NHS)를 종합하여 분석하세요.
- 데이터에 없는 기업 밸류에이션이나 주가 정보를 만들어내지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
1. 시장 매력도 평가 — 실측 데이터 기반 시장 성장성/안정성 평가
2. 경쟁 강도 분석 — 임상시험/처방 데이터 기반 진입장벽 평가
3. R&D 파이픈라인 가치 — 임상시험 현황 데이터 기반 미래 가치 평가
4. 리스크 요인 — 규제/경쟁/기술 리스크 데이터 기반 분석
5. 투자 전략 제안 — 데이터 근거 기반 전략적 제안

최소 2500자. 데이터에 근거한 투자 분석을 작성하세요.`,
  },
  {
    id: 'market-access-strategy',
    title: '시장 진입 전략 (Market Access Strategy)',
    description: '전체 데이터 종합 + AI 전략 분석',
    mode: 'ai-insight-only',
    aiProvider: 'openai',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: `당신은 제약사 시장 진입 전략 전문 컨설턴트입니다.

[절대 원칙]
- 제공된 실측 데이터를 반드시 근거로 사용하세요.
- 데이터에 없는 가격이나 시장 규모를 만들어내지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
1. 한국 시장 진입 전략 — HIRA 데이터 기반 급여 전략
2. 글로벌 확장 전략 — CMS/PBS/NHS 데이터 기반 국가별 진입 전략
3. 차별화 전략 — 경쟁 데이터 기반 포지셔닝
4. 가격 전략 — 각국 약가 데이터 기반 가격 설정 전략
5. 실행 로드맵 — 단기/중기/장기 전략

최소 2000자. 실행 가능한 전략을 구체적으로 제시하세요.`,
  },
  {
    id: 'fda-safety-analysis',
    title: 'FDA 안전성 분석 (FDA Safety Analysis)',
    description: 'FDA OpenFDA 부작용/승인 데이터 기반 분석 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['global'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'comprehensive-conclusion',
    title: '종합 결론 및 제언 (Conclusion)',
    description: '전체 분석 결과 종합 + AI 최종 제언',
    mode: 'data-with-ai-insight',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'pubmed', 'global'],
    systemPrompt: `당신은 글로벌 제약/바이오 산업 전략 컨설턴트입니다.

[절대 원칙]
- 이 보고서의 모든 섹션에서 분석된 실측 데이터를 종합하여 결론을 도출하세요.
- 새로운 수치를 만들어내지 말고, 기존 분석 결과를 종합하세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
1. 주요 발견 종합 — 각 섹션의 핵심 발견 요약
2. 시장 기회 — 데이터에서 도출된 핵심 기회
3. 핵심 리스크 — 데이터에서 도출된 주요 위험 요소
4. 전략적 제언 — 구체적이고 실행 가능한 제언 5가지 이상
5. 향후 모니터링 포인트 — 지속적으로 추적해야 할 지표

최소 2000자. 전체 보고서를 아우르는 종합적 결론을 작성하세요.`,
  },
] as const
