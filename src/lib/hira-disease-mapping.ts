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

/**
 * 커스텀 보고서용: 질환명(indication)으로 동적 ICD-10 코드 매핑
 *
 * 기존 DISEASE_MAPPING에 slug이 없는 커스텀 보고서에서도
 * HIRA 데이터를 조회할 수 있도록 질환명 기반 자동 매핑 제공
 */
const INDICATION_TO_ICD10: Record<string, { codes: string[]; names: string[]; description: string }> = {
  // ── 혈액암/골수 질환 ──
  '골수섬유증': { codes: ['D47.1', 'D75.8'], names: ['골수섬유증', '원발성 골수섬유증'], description: '골수섬유증' },
  '골수이형성증후군': { codes: ['D46'], names: ['골수이형성증후군', 'MDS'], description: '골수이형성증후군' },
  '다발골수종': { codes: ['C90.0'], names: ['다발골수종', '다발성 골수종'], description: '다발골수종' },
  '급성골수성백혈병': { codes: ['C92.0'], names: ['급성골수성백혈병', 'AML'], description: '급성골수성백혈병' },
  '만성골수성백혈병': { codes: ['C92.1'], names: ['만성골수성백혈병', 'CML'], description: '만성골수성백혈병' },
  '급성림프구성백혈병': { codes: ['C91.0'], names: ['급성림프구성백혈병', 'ALL'], description: '급성림프구성백혈병' },
  '만성림프구성백혈병': { codes: ['C91.1'], names: ['만성림프구성백혈병', 'CLL'], description: '만성림프구성백혈병' },
  '호지킨림프종': { codes: ['C81'], names: ['호지킨림프종', '호지킨병'], description: '호지킨림프종' },
  '비호지킨림프종': { codes: ['C82', 'C83', 'C85'], names: ['비호지킨림프종', 'NHL'], description: '비호지킨림프종' },
  '진성적혈구증가증': { codes: ['D45'], names: ['진성적혈구증가증', 'PV'], description: '진성적혈구증가증' },
  '본태성혈소판증가증': { codes: ['D47.3'], names: ['본태성혈소판증가증', 'ET'], description: '본태성혈소판증가증' },

  // ── 주요 고형암 ──
  '폐암': { codes: ['C34'], names: ['폐암', '기관지폐암'], description: '폐암' },
  '비소세포폐암': { codes: ['C34'], names: ['비소세포폐암', 'NSCLC'], description: '비소세포폐암' },
  '소세포폐암': { codes: ['C34'], names: ['소세포폐암', 'SCLC'], description: '소세포폐암' },
  '유방암': { codes: ['C50'], names: ['유방암'], description: '유방암' },
  '대장암': { codes: ['C18', 'C19', 'C20'], names: ['대장암', '결장암', '직장암'], description: '대장암' },
  '위암': { codes: ['C16'], names: ['위암', '위장암'], description: '위암' },
  '간암': { codes: ['C22'], names: ['간암', '간세포암'], description: '간암' },
  '전립선암': { codes: ['C61'], names: ['전립선암'], description: '전립선암' },
  '췌장암': { codes: ['C25'], names: ['췌장암'], description: '췌장암' },
  '갑상선암': { codes: ['C73'], names: ['갑상선암'], description: '갑상선암' },
  '방광암': { codes: ['C67'], names: ['방광암'], description: '방광암' },
  '난소암': { codes: ['C56'], names: ['난소암'], description: '난소암' },
  '자궁경부암': { codes: ['C53'], names: ['자궁경부암'], description: '자궁경부암' },
  '신장암': { codes: ['C64'], names: ['신장암', '신세포암'], description: '신장암' },
  '흑색종': { codes: ['C43'], names: ['흑색종', '악성흑색종', '멜라노마'], description: '흑색종' },
  '두경부암': { codes: ['C10', 'C11', 'C12', 'C13', 'C14'], names: ['두경부암'], description: '두경부암' },
  '담도암': { codes: ['C22.1', 'C23', 'C24'], names: ['담도암', '담낭암'], description: '담도암' },
  '식도암': { codes: ['C15'], names: ['식도암'], description: '식도암' },

  // ── 내분비/대사 ──
  '당뇨병': { codes: ['E11', 'E10'], names: ['당뇨병', '제2형당뇨병'], description: '당뇨병' },
  '비만': { codes: ['E66'], names: ['비만', '고도비만'], description: '비만' },
  '고지혈증': { codes: ['E78'], names: ['이상지질혈증', '고지혈증'], description: '이상지질혈증' },
  '통풍': { codes: ['M10'], names: ['통풍'], description: '통풍' },
  '갑상선기능저하증': { codes: ['E03'], names: ['갑상선기능저하증'], description: '갑상선기능저하증' },
  '갑상선기능항진증': { codes: ['E05'], names: ['갑상선기능항진증'], description: '갑상선기능항진증' },

  // ── 자가면역/염증 ──
  '류마티스관절염': { codes: ['M05', 'M06'], names: ['류마티스관절염', 'RA'], description: '류마티스관절염' },
  '아토피피부염': { codes: ['L20'], names: ['아토피피부염'], description: '아토피피부염' },
  '건선': { codes: ['L40'], names: ['건선'], description: '건선' },
  '크론병': { codes: ['K50'], names: ['크론병'], description: '크론병' },
  '궤양성대장염': { codes: ['K51'], names: ['궤양성대장염'], description: '궤양성대장염' },
  '전신홍반루푸스': { codes: ['M32'], names: ['전신홍반루푸스', 'SLE', '루푸스'], description: '전신홍반루푸스' },
  '강직성척추염': { codes: ['M45'], names: ['강직성척추염'], description: '강직성척추염' },

  // ── 신경계 ──
  '알츠하이머': { codes: ['G30', 'F00'], names: ['알츠하이머', '알츠하이머병'], description: '알츠하이머병' },
  '파킨슨병': { codes: ['G20'], names: ['파킨슨병'], description: '파킨슨병' },
  '다발성경화증': { codes: ['G35'], names: ['다발성경화증', 'MS'], description: '다발성경화증' },
  '편두통': { codes: ['G43'], names: ['편두통'], description: '편두통' },
  '간질': { codes: ['G40'], names: ['간질', '뇌전증', '간질발작'], description: '뇌전증' },
  '우울증': { codes: ['F32', 'F33'], names: ['우울증', '주요우울장애'], description: '우울증' },
  '조현병': { codes: ['F20'], names: ['조현병', '정신분열증'], description: '조현병' },

  // ── 심혈관/호흡기 ──
  '심부전': { codes: ['I50'], names: ['심부전'], description: '심부전' },
  '고혈압': { codes: ['I10', 'I11'], names: ['고혈압', '본태성고혈압'], description: '고혈압' },
  '관상동맥질환': { codes: ['I25'], names: ['관상동맥질환', '협심증'], description: '관상동맥질환' },
  '심방세동': { codes: ['I48'], names: ['심방세동'], description: '심방세동' },
  '천식': { codes: ['J45'], names: ['천식', '기관지천식'], description: '천식' },
  'COPD': { codes: ['J44'], names: ['만성폐쇄성폐질환', 'COPD'], description: 'COPD' },
  '폐섬유증': { codes: ['J84.1'], names: ['특발성폐섬유증', 'IPF'], description: '폐섬유증' },
  '폐동맥고혈압': { codes: ['I27.0'], names: ['폐동맥고혈압', 'PAH'], description: '폐동맥고혈압' },

  // ── 간/소화기 ──
  '비알코올지방간': { codes: ['K76.0', 'K75.8'], names: ['비알코올지방간', 'NASH', 'NAFLD'], description: 'NASH/NAFLD' },
  'B형간염': { codes: ['B18.1'], names: ['만성B형간염', 'B형간염'], description: 'B형간염' },
  'C형간염': { codes: ['B18.2'], names: ['만성C형간염', 'C형간염'], description: 'C형간염' },
  '간경변': { codes: ['K74'], names: ['간경변', '간경화증'], description: '간경변' },

  // ── 비뇨기/신장 ──
  '만성신장병': { codes: ['N18'], names: ['만성신장병', 'CKD', '만성신부전'], description: '만성신장병' },
  '과민성방광': { codes: ['N32.8'], names: ['과민성방광', 'OAB'], description: '과민성방광' },

  // ── 안과 ──
  '황반변성': { codes: ['H35.3'], names: ['나이관련황반변성', 'AMD', '황반변성'], description: '황반변성' },
  '녹내장': { codes: ['H40'], names: ['녹내장'], description: '녹내장' },

  // ── 근골격 ──
  '골다공증': { codes: ['M81'], names: ['골다공증'], description: '골다공증' },
  '퇴행성관절염': { codes: ['M17'], names: ['무릎관절증', '퇴행성관절염'], description: '퇴행성관절염' },

  // ── 희귀질환 ──
  '헌팅턴병': { codes: ['G10'], names: ['헌팅턴병'], description: '헌팅턴병' },
  '낭포성섬유증': { codes: ['E84'], names: ['낭포성섬유증'], description: '낭포성섬유증' },
  '근위축성측삭경화증': { codes: ['G12.2'], names: ['근위축성측삭경화증', 'ALS'], description: 'ALS' },
  '척수근위축증': { codes: ['G12.0', 'G12.1'], names: ['척수근위축증', 'SMA'], description: 'SMA' },
  '듀센근이영양증': { codes: ['G71.0'], names: ['듀센근이영양증', 'DMD'], description: 'DMD' },
  '파브리병': { codes: ['E75.2'], names: ['파브리병'], description: '파브리병' },
  '고셔병': { codes: ['E75.2'], names: ['고셔병'], description: '고셔병' },
  '혈우병': { codes: ['D66', 'D67'], names: ['혈우병', '혈우병A', '혈우병B'], description: '혈우병' },
};

/**
 * 커스텀 보고서용: indication(질환명)으로 동적 매핑 생성
 *
 * 1) 먼저 DISEASE_MAPPING에서 slug으로 검색
 * 2) 없으면 INDICATION_TO_ICD10에서 질환명으로 부분 매칭
 * 3) 없으면 null 반환
 */
export function getMappingBySlugOrIndication(slug: string, indication?: string): DiseaseMapping | undefined {
  // 1) 기존 매핑에서 slug 검색
  const bySlug = DISEASE_MAPPING.find(m => m.slug === slug);
  if (bySlug) return bySlug;

  // 2) indication으로 동적 매핑
  if (indication) {
    const normalizedIndication = indication.trim();

    // 정확 매칭 시도
    if (INDICATION_TO_ICD10[normalizedIndication]) {
      const match = INDICATION_TO_ICD10[normalizedIndication];
      return {
        slug,
        diseaseCodes: match.codes,
        diseaseNames: match.names,
        category: 'disease',
        description: match.description,
      };
    }

    // 부분 매칭 시도 (질환명이 키워드를 포함하는 경우)
    for (const [key, value] of Object.entries(INDICATION_TO_ICD10)) {
      if (normalizedIndication.includes(key) || key.includes(normalizedIndication)) {
        return {
          slug,
          diseaseCodes: value.codes,
          diseaseNames: value.names,
          category: 'disease',
          description: value.description,
        };
      }
    }

    // 영문 indication도 시도 (예: "myelofibrosis" → "골수섬유증")
    const englishToKorean: Record<string, string> = {
      'myelofibrosis': '골수섬유증',
      'myelodysplastic': '골수이형성증후군',
      'multiple myeloma': '다발골수종',
      'leukemia': '백혈병',
      'lymphoma': '림프종',
      'lung cancer': '폐암',
      'nsclc': '비소세포폐암',
      'breast cancer': '유방암',
      'colorectal': '대장암',
      'gastric cancer': '위암',
      'liver cancer': '간암',
      'prostate cancer': '전립선암',
      'pancreatic cancer': '췌장암',
      'melanoma': '흑색종',
      'diabetes': '당뇨병',
      'obesity': '비만',
      'hypertension': '고혈압',
      'heart failure': '심부전',
      'asthma': '천식',
      'copd': 'COPD',
      'alzheimer': '알츠하이머',
      'parkinson': '파킨슨병',
      'depression': '우울증',
      'rheumatoid arthritis': '류마티스관절염',
      'psoriasis': '건선',
      'atopic dermatitis': '아토피피부염',
      'crohn': '크론병',
      'gout': '통풍',
    };

    const lowerIndication = normalizedIndication.toLowerCase();
    for (const [eng, kor] of Object.entries(englishToKorean)) {
      if (lowerIndication.includes(eng)) {
        if (INDICATION_TO_ICD10[kor]) {
          const match = INDICATION_TO_ICD10[kor];
          return {
            slug,
            diseaseCodes: match.codes,
            diseaseNames: match.names,
            category: 'disease',
            description: match.description,
          };
        }
      }
    }
  }

  return undefined;
}
