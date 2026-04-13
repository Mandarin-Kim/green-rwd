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
- 아래 제공된 실측 데이터의 수치만 사용하세요. 데이터에 없는 수치를 절대 만들어내지 마세요.
- "글로벌 시장 규모 XX억 달러" 같은 출처 없는 숫자를 쓰지 마세요.
- 시장조사 기관명(예: IQVIA, Evaluate 등)을 절대 언급하지 마세요.

[작성 범위]
제공된 실측 데이터(HIRA, ClinicalTrials, CMS, PBS, NHS)를 바탕으로:
1. 핵심 수치 요약 (제공된 데이터에서만 인용)
2. 데이터에서 관찰되는 시장 트렌드 해석
3. 전략적 시사점 도출
4. 데이터 기반 향후 전망

한국어로 작성. 전문 용어는 영문 병기. 최소 2000자.

[섹션별 역할 분리 — 중복 절대 금지]
- 연령별 환자 분포 상세 분석 금지 → 역학(Epidemiology) 섹션에서 전담
- 지역별 의료기관 분포 상세 분석 금지 → 시장 세분화(Market Segmentation) 섹션에서 전담
- "고령화 사회", "인구 고령화", "65세 이상 증가"를 성장 요인으로 반복 기술 금지
- Executive Summary는 전체 보고서의 핵심 숫자와 전략적 결론만 1~2문장으로 압축`,
  },
  {
    id: 'market-overview',
    title: '시장 개요 (Market Overview)',
    description: '실측 데이터 기반 시장 현황 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'openai',
    tier: 'BASIC',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'epidemiology',
    title: '역학 분석 (Epidemiology)',
    description: 'HIRA 실측 기반 환자 분포 분석 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'anthropic',
    tier: 'BASIC',
    requiredData: ['hira'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'market-size-forecast',
    title: '시장 규모 및 예측 (Market Size & Forecast)',
    description: '실측 데이터 기반 시장 규모 + AI 성장 전망 분석',
    mode: 'data-with-ai-insight',
    aiProvider: 'openai',
    tier: 'BASIC',
    requiredData: ['hira', 'global', 'clinicaltrials'],
    systemPrompt: `당신은 제약/바이오 시장 예측 전문가입니다.

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

최소 1500자. 구체적 근거를 들어 분석하세요.

[섹션별 역할 분리 — 중복 절대 금지]
- 인구 고령화는 전체 텍스트에서 1~2문장 이내로만 언급하고 이후 반복 금지
- 연령별 세부 분포(65세 이상 몇 %, 70대 몇 % 등) 분석 금지 → 역학 섹션 전담
- 지역별 환자 수 분석 금지 → 시장 세분화 섹션 전담
- 성장 동인은 임상시험 파이프라인, 치료 접근성, 보험급여 확대 등 데이터 기반 요인에 집중`,
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
    description: 'CMS·PBS·NHS 실측 데이터 기반 국가별 비교 (100% 데이터)',
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
- 아래 제공된 실측 데이터만 근거로 사용하세요.
- HIRA 데이터에서 관찰되는 한국 건강보험 시스템 특성을 분석하세요.
- 출처 없는 수치를 만들어내지 마세요.

[작성 범위]
제공된 데이터를 바탕으로:
1. 한국 급여 체계 분석 — HIRA 데이터에서 보이는 급여비, 환자부담 구조 해석
2. 국가별 보험 시스템 비교 — 한국(HIRA) vs 미국(CMS Medicare) vs 영국(NHS) vs 호주(PBS) 차이점
3. 규제 환경이 시장에 미치는 영향 해석
4. 정책 전망 및 시사점

최소 1500자.`,
  },
  {
    id: 'literature-review',
    title: '학술 문헌 분석 (Literature Review)',
    description: 'PubMed 실측 데이터 기반 최신 연구 동향',
    mode: 'data-with-ai-insight',
    aiProvider: 'anthropic',
    tier: 'PRO',
    requiredData: ['pubmed'],
    systemPrompt: `당신은 의약학 문헌 분석 전문가입니다.

[절대 원칙]
- 아래 제공된 PubMed 논문 목록만 인용하세요. 제공되지 않은 논문을 만들어내지 마세요.
- 논문 제목, 저자, 저널명을 정확히 인용하세요.
- 존재하지 않는 DOI나 PMID를 만들지 마세요.

[작성 범위]
제공된 PubMed 논문 데이터를 분석하여:
1. 최근 연구 트렌드 요약 — 주요 연구 주제와 방향
2. 핵심 논문 3~5편 상세 분석 — 제공된 초록 기반
3. 연구 결과가 시장에 미치는 영향 해석
4. 향후 연구 방향 및 임상적 시사점

최소 1500자. 모든 인용은 [1], [2] 형태로 본문 내 표기하세요.`,
  },

  // === PREMIUM Tier (11-16) ===
  {
    id: 'patient-segmentation-rwd',
    title: '환자 세그먼테이션 및 RWD 분석',
    description: 'HIRA 실측 데이터 기반 환자군 심층 분석 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'openai',
    tier: 'PREMIUM',
    requiredData: ['hira'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
  {
    id: 'market-drivers-restraints',
    title: '시장 동인 및 저해요인 (Drivers & Restraints)',
    description: '데이터 기반 성장/억제 요인 분석',
    mode: 'ai-insight-only',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: `당신은 시장 동인 및 리스크 분석 전문가입니다.

[절대 원칙]
- 아래 제공된 실측 데이터에서 관찰되는 사실만 근거로 사용하세요.
- "XX 시장은 OO억 달러 규모"처럼 출처 없는 수치를 쓰지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.
- 각 동인/저해요인에 대해 반드시 제공된 데이터에서 근거를 인용하세요.

[작성 범위]
제공된 실측 데이터를 분석하여:
1. 성장 동인 (Drivers) 5~7가지 — 각각 데이터 근거와 함께
2. 저해 요인 (Restraints) 5~7가지 — 각각 데이터 근거와 함께
3. 기회 (Opportunities) — 데이터에서 발견되는 기회
4. 위협 (Threats) — 데이터에서 감지되는 위협
5. 각 요인별 영향도(High/Medium/Low) 평가

최소 2500자. 마크다운 표 최소 2개 포함.`,
  },
  {
    id: 'porters-five-forces',
    title: "Porter's Five Forces 분석",
    description: '데이터 기반 산업 구조 분석',
    mode: 'ai-insight-only',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: `당신은 산업 전략 분석 전문가입니다.

[절대 원칙]
- 제공된 실측 데이터를 근거로 각 Force를 분석하세요.
- 출처 없는 수치나 시장조사 기관명을 쓰지 마세요.
- ClinicalTrials 스폰서 데이터 → 신규 진입자/경쟁 강도 판단 근거
- HIRA 의료기관 데이터 → 구매자/공급자 교섭력 판단 근거
- CMS/PBS/NHS 가격 비교 → 가격 교섭력 판단 근거

[작성 범위]
Porter's Five Forces 각각을:
1. 기존 경쟁자 간 경쟁 (Rivalry) — 강도 1~5점 + 근거
2. 신규 진입자의 위협 (New Entrants) — 강도 1~5점 + 근거
3. 대체재의 위협 (Substitutes) — 강도 1~5점 + 근거
4. 공급자의 교섭력 (Supplier Power) — 강도 1~5점 + 근거
5. 구매자의 교섭력 (Buyer Power) — 강도 1~5점 + 근거

마크다운 표로 정리. 최소 2000자.`,
  },
  {
    id: 'pest-analysis',
    title: 'PEST 분석',
    description: '데이터 기반 거시환경 분석',
    mode: 'ai-insight-only',
    aiProvider: 'openai',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'global'],
    systemPrompt: `당신은 거시환경 분석 전문가입니다.

[절대 원칙]
- 제공된 실측 데이터(HIRA, ClinicalTrials, CMS, PBS, NHS)를 근거로 분석하세요.
- 출처 없는 수치를 만들지 마세요.
- 시장조사 기관명을 절대 언급하지 마세요.

[작성 범위]
각 요소를 제공된 데이터 근거로 분석:
1. Political — HIRA/CMS/PBS/NHS 데이터에서 보이는 정책 방향
2. Economic — HIRA 급여비, CMS 지출, NHS 비용 등 실측 데이터 기반 경제적 영향
3. Social — HIRA 연령대/성별 분포에서 보이는 인구학적 트렌드
4. Technological — ClinicalTrials 임상 단계별 분포에서 보이는 기술 트렌드

각 항목별 영향도 High/Medium/Low 평가. 최소 2000자.`,
  },
  {
    id: 'strategic-recommendations',
    title: '전략적 권고사항 (Strategic Recommendations)',
    description: '전체 실측 데이터 기반 전략 제안',
    mode: 'ai-insight-only',
    aiProvider: 'anthropic',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'pubmed', 'global'],
    systemPrompt: `당신은 제약 비즈니스 전략 컨설턴트입니다.

[절대 원칙]
- 아래 제공된 모든 실측 데이터를 종합 분석하여 전략을 제안하세요.
- 모든 권고사항은 반드시 제공된 데이터에서 근거를 인용하세요.
- 출처 없는 수치나 시장조사 기관명을 쓰지 마세요.
- "시장 규모 XX억 달러" 같은 검증 불가능한 숫자를 쓰지 마세요.

[작성 범위]
실측 데이터 기반 전략적 권고:
1. 시장 진입/확대 전략 — HIRA 환자 분포, 지역별 데이터 근거
2. 제품 포지셔닝 — ClinicalTrials 경쟁 현황, 글로벌 약가 비교 근거
3. 타겟 환자군 전략 — HIRA 연령대/성별/지역 데이터 근거
4. 약가/보험 전략 — HIRA vs CMS vs NHS vs PBS 가격 비교 근거
5. 임상시험 전략 — ClinicalTrials 현황 + PubMed 연구 동향 근거
6. 그린리본 플랫폼 활용 전략 (타겟마케팅, 임상시험 리크루팅)
7. 3~5년 실행 로드맵

최소 2500자. 구체적이고 실행 가능한 권고사항만.`,
  },
  {
    id: 'references',
    title: '참고문헌 및 데이터 출처',
    description: '전체 데이터 출처 명세 (100% 데이터)',
    mode: 'data-only',
    aiProvider: 'openai',
    tier: 'PREMIUM',
    requiredData: ['hira', 'clinicaltrials', 'pubmed', 'global'],
    systemPrompt: '',  // data-only: AI 사용 안 함
  },
]
