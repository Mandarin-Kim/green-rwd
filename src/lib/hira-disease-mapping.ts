/**
 * 보고서 카탈로그 ↔ HIRA 질병코드(ICD-10) 매핑
 *
 * 각 보고서 slug에 대응하는 HIRA 질병코드를 매핑합니다.
 * HIRA 질병정보서비스는 ICD-10 기반 상병코드를 사용합니다.
 *
 * 참고: 복합 질환(예: 면역항암 전체)은 대표 코드 여러 개를 배열로 지정합니다.
 */

export interface DiseaseMapping {
  slug: string;
  diseaseCodes: string[];      // HIRA ICD-10 상병코드(들)
  diseaseNames: string[];      // HIRA 검색용 질병명
  category: 'disease' | 'drug' | 'platform';  // disease=질환별, drug=약물/치료플랫폼별, platform=디지털/건기식
  description: string;
}

/**
 * 30개 보고서 카탈로그 → HIRA 질병코드 매핑 테이블
 *
 * category 설명:
 * - disease: HIRA 질병정보서비스에서 직접 환자수/진료비 조회 가능
 * - drug: 의약품사용정보서비스로 약물 기반 시장 데이터 조회
 * - platform: 특정 질병코드가 없는 플랫폼/기술 카테고리 (추정치 사용)
 */
export const DISEASE_MAPPING: DiseaseMapping[] = [
  // ── 종양/항암 (8개) ──
  {
    slug: 'nsclc-market-korea-2025',
    diseaseCodes: ['C34'],          // 기관지 및 폐의 악성신생물
    diseaseNames: ['폐암', '비소세포폐암'],
    category: 'disease',
    description: '비소세포폐암',
  },
  {
    slug: 'breast-cancer-market-korea-2025',
    diseaseCodes: ['C50'],          // 유방의 악성신생물
    diseaseNames: ['유방암'],
    category: 'disease',
    description: '유방암',
  },
  {
    slug: 'crc-market-korea-2025',
    diseaseCodes: ['C18', 'C19', 'C20'],  // 결장, 직장S상결장, 직장
    diseaseNames: ['대장암', '결장암', '직장암'],
    category: 'disease',
    description: '대장암',
  },
  {
    slug: 'gastric-cancer-market-korea-2025',
    diseaseCodes: ['C16'],          // 위의 악성신생물
    diseaseNames: ['위암'],
    category: 'disease',
    description: '위암',
  },
  {
    slug: 'hematologic-cancer-market-korea-2025',
    diseaseCodes: ['C81', 'C82', 'C83', 'C85', 'C91', 'C92'],  // 림프종, 백혈병
    diseaseNames: ['혈액암', '림프종', '백혈병'],
    category: 'disease',
    description: '혈액암',
  },
  {
    slug: 'hcc-market-korea-2025',
    diseaseCodes: ['C22'],          // 간 및 간내담관의 악성신생물
    diseaseNames: ['간암', '간세포암'],
    category: 'disease',
    description: '간세포암',
  },
  {
    slug: 'prostate-cancer-market-korea-2025',
    diseaseCodes: ['C61'],          // 전립선의 악성신생물
    diseaseNames: ['전립선암'],
    category: 'disease',
    description: '전립선암',
  },
  {
    slug: 'immuno-oncology-market-korea-2025',
    diseaseCodes: ['C34', 'C43', 'C64'],  // 폐암+흑색종+신장암 (면역항암 주요 적응증)
    diseaseNames: ['면역항암'],
    category: 'drug',
    description: '면역항암 전체',
  },

  // ── 대사질환 (5개) ──
  {
    slug: 'type2-diabetes-market-korea-2025',
    diseaseCodes: ['E11'],          // 제2형 당뇨병
    diseaseNames: ['제2형 당뇨병', '당뇨병'],
    category: 'disease',
    description: '제2형 당뇨병',
  },
  {
    slug: 'obesity-market-korea-2025',
    diseaseCodes: ['E66'],          // 비만
    diseaseNames: ['비만'],
    category: 'disease',
    description: '비만',
  },
  {
    slug: 'dyslipidemia-market-korea-2025',
    diseaseCodes: ['E78'],          // 지질단백질대사장애 및 기타 지혈증
    diseaseNames: ['이상지질혈증', '고지혈증'],
    category: 'disease',
    description: '이상지질혈증',
  },
  {
    slug: 'nash-market-korea-2025',
    diseaseCodes: ['K75', 'K76'],   // 기타 염증성 간질환, 기타 간의 질환
    diseaseNames: ['비알코올성지방간', 'NASH'],
    category: 'disease',
    description: 'NASH/MASH',
  },
  {
    slug: 'gout-market-korea-2025',
    diseaseCodes: ['M10'],          // 통풍
    diseaseNames: ['통풍'],
    category: 'disease',
    description: '통풍',
  },

  // ── 자가면역 (4개) ──
  {
    slug: 'ra-market-korea-2025',
    diseaseCodes: ['M05', 'M06'],   // 혈청양성 류마티스관절염, 기타 류마티스관절염
    diseaseNames: ['류마티스 관절염'],
    category: 'disease',
    description: '류마티스 관절염',
  },
  {
    slug: 'atopic-dermatitis-market-korea-2025',
    diseaseCodes: ['L20'],          // 아토피피부염
    diseaseNames: ['아토피 피부염'],
    category: 'disease',
    description: '아토피 피부염',
  },
  {
    slug: 'psoriasis-market-korea-2025',
    diseaseCodes: ['L40'],          // 건선
    diseaseNames: ['건선'],
    category: 'disease',
    description: '건선',
  },
  {
    slug: 'ibd-market-korea-2025',
    diseaseCodes: ['K50', 'K51'],   // 크론병, 궤양성대장염
    diseaseNames: ['크론병', '궤양성대장염', '염증성장질환'],
    category: 'disease',
    description: '염증성 장질환',
  },

  // ── 신경질환 (3개) ──
  {
    slug: 'alzheimer-market-korea-2025',
    diseaseCodes: ['G30', 'F00'],   // 알츠하이머병, 알츠하이머병에서의 치매
    diseaseNames: ['알츠하이머', '치매'],
    category: 'disease',
    description: '알츠하이머병',
  },
  {
    slug: 'migraine-market-korea-2025',
    diseaseCodes: ['G43'],          // 편두통
    diseaseNames: ['편두통'],
    category: 'disease',
    description: '편두통',
  },
  {
    slug: 'ms-market-korea-2025',
    diseaseCodes: ['G35'],          // 다발성경화증
    diseaseNames: ['다발성경화증'],
    category: 'disease',
    description: '다발성경화증',
  },

  // ── 바이오의약품 (4개) - drug/platform 카테고리 ──
  {
    slug: 'biosimilar-market-korea-2025',
    diseaseCodes: ['M05', 'C50', 'C82'],  // 주요 바이오시밀러 적응증
    diseaseNames: ['바이오시밀러'],
    category: 'drug',
    description: '바이오시밀러 전체',
  },
  {
    slug: 'adc-market-korea-2025',
    diseaseCodes: ['C50', 'C67'],   // 유방암+방광암 (ADC 주요 적응증)
    diseaseNames: ['ADC'],
    category: 'drug',
    description: 'ADC 치료 전체',
  },
  {
    slug: 'cell-gene-therapy-market-korea-2025',
    diseaseCodes: ['C83', 'C85', 'C91'],  // B세포림프종, 백혈병 (CAR-T 적응증)
    diseaseNames: ['세포치료', 'CAR-T'],
    category: 'drug',
    description: '세포/유전자치료 전체',
  },
  {
    slug: 'mrna-market-korea-2025',
    diseaseCodes: ['U07', 'C43'],   // COVID-19, 흑색종 (mRNA 백신/암백신)
    diseaseNames: ['mRNA'],
    category: 'platform',
    description: 'mRNA 치료 전체',
  },

  // ── 디지털헬스 (3개) - platform 카테고리 ──
  {
    slug: 'dtx-market-korea-2025',
    diseaseCodes: ['F32', 'G47'],   // 우울증, 수면장애 (DTx 주요 적응증)
    diseaseNames: ['디지털치료제'],
    category: 'platform',
    description: '디지털 치료제 전체',
  },
  {
    slug: 'ai-drug-discovery-market-korea-2025',
    diseaseCodes: [],               // 특정 질병코드 없음
    diseaseNames: ['AI 신약개발'],
    category: 'platform',
    description: 'AI 신약개발',
  },
  {
    slug: 'telemedicine-market-korea-2025',
    diseaseCodes: [],               // 특정 질병코드 없음
    diseaseNames: ['원격의료'],
    category: 'platform',
    description: '원격의료 전체',
  },

  // ── 심혈관 (1개) ──
  {
    slug: 'heart-failure-market-korea-2025',
    diseaseCodes: ['I50'],          // 심부전
    diseaseNames: ['심부전'],
    category: 'disease',
    description: '심부전',
  },

  // ── 건기식 (2개) - platform 카테고리 ──
  {
    slug: 'probiotics-market-korea-2025',
    diseaseCodes: ['K59'],          // 기타 기능성 장장애
    diseaseNames: ['프로바이오틱스'],
    category: 'platform',
    description: '프로바이오틱스',
  },
  {
    slug: 'vitamin-supplement-market-korea-2025',
    diseaseCodes: ['E55', 'E56'],   // 비타민D 결핍, 기타 비타민 결핍
    diseaseNames: ['비타민 보충제'],
    category: 'platform',
    description: '비타민/미네랄 보충제',
  },
];

/**
 * slug로 매핑 정보 조회
 */
export function getMappingBySlug(slug: string): DiseaseMapping | undefined {
  return DISEASE_MAPPING.find(m => m.slug === slug);
}

/**
 * HIRA에서 조회 가능한 질환 목록만 필터
 */
export function getHiraQueryableItems(): DiseaseMapping[] {
  return DISEASE_MAPPING.filter(m => m.diseaseCodes.length > 0);
}
