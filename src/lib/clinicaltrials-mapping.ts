/**
 * 보고서 카탈로그 → ClinicalTrials.gov 검색어 매핑
 *
 * 각 보고서 slug에 대응하는 ClinicalTrials.gov 검색 파라미터 매핑
 * - drug: 약물/치료제명 (OR 연산자로 여러 약물명 지원)
 * - condition: 적응증 (ClinicalTrials.gov 표준 용어)
 */

export interface ClinicalTrialsSearchParams {
  drug: string;
  condition: string;
}

export const CLINICAL_TRIALS_MAPPING: Record<string, ClinicalTrialsSearchParams> = {
  // ── 종양/항암 (8개) ──
  'nsclc-market-korea-2025': {
    drug: 'pembrolizumab OR nivolumab OR atezolizumab OR sintilimab',
    condition: 'Non-Small Cell Lung Cancer',
  },
  'breast-cancer-market-korea-2025': {
    drug: 'trastuzumab OR pertuzumab OR T-DM1 OR lumretuzumab',
    condition: 'Breast Cancer',
  },
  'crc-market-korea-2025': {
    drug: 'bevacizumab OR cetuximab OR panitumumab OR regorafenib OR encorafenib',
    condition: 'Colorectal Cancer',
  },
  'gastric-cancer-market-korea-2025': {
    drug: 'trastuzumab OR ramucirumab OR nivolumab OR pembrolizumab',
    condition: 'Gastric Cancer',
  },
  'hematologic-cancer-market-korea-2025': {
    drug: 'rituximab OR ibrutinib OR venetoclax OR bortezomib',
    condition: 'Hematologic Neoplasm',
  },
  'hcc-market-korea-2025': {
    drug: 'sorafenib OR lenvatinib OR atezolizumab OR bevacizumab',
    condition: 'Hepatocellular Carcinoma',
  },
  'prostate-cancer-market-korea-2025': {
    drug: 'abiraterone OR enzalutamide OR docetaxel OR cabazitaxel',
    condition: 'Prostate Cancer',
  },
  'immuno-oncology-market-korea-2025': {
    drug: 'pembrolizumab OR nivolumab OR atezolizumab OR durvalumab OR avelumab',
    condition: 'Cancer',
  },

  // ── 대사질환 (5개) ──
  'type2-diabetes-market-korea-2025': {
    drug: 'metformin OR semaglutide OR tirzepatide OR dulaglutide',
    condition: 'Type 2 Diabetes',
  },
  'obesity-market-korea-2025': {
    drug: 'semaglutide OR tirzepatide OR orlistat OR liraglutide',
    condition: 'Obesity',
  },
  'dyslipidemia-market-korea-2025': {
    drug: 'atorvastatin OR rosuvastatin OR bempedoic acid OR inclisiran',
    condition: 'Dyslipidemias',
  },
  'nash-market-korea-2025': {
    drug: 'pioglitazone OR obeticholic acid OR FXR agonist',
    condition: 'Non-alcoholic Fatty Liver Disease',
  },
  'gout-market-korea-2025': {
    drug: 'allopurinol OR febuxostat OR pegloticase',
    condition: 'Gout',
  },

  // ── 자가면역 (4개) ──
  'ra-market-korea-2025': {
    drug: 'TNF inhibitor OR methotrexate OR abatacept OR rituximab',
    condition: 'Rheumatoid Arthritis',
  },
  'atopic-dermatitis-market-korea-2025': {
    drug: 'dupilumab OR baricitinib OR tralokinumab OR abrocitinib',
    condition: 'Dermatitis, Atopic',
  },
  'psoriasis-market-korea-2025': {
    drug: 'TNF inhibitor OR secukinumab OR ixekizumab OR guselkumab',
    condition: 'Psoriasis',
  },
  'ibd-market-korea-2025': {
    drug: 'TNF inhibitor OR vedolizumab OR ustekinumab OR ozanimod',
    condition: 'Inflammatory Bowel Diseases',
  },

  // ── 신경질환 (3개) ──
  'alzheimer-market-korea-2025': {
    drug: 'lecanemab OR aducanumab OR donepezil OR memantine',
    condition: "Alzheimer Disease",
  },
  'migraine-market-korea-2025': {
    drug: 'erenumab OR fremanezumab OR galcanezumab OR eptinezumab',
    condition: 'Migraine',
  },
  'ms-market-korea-2025': {
    drug: 'interferon beta OR glatiramer OR fingolimod OR natalizumab',
    condition: 'Multiple Sclerosis',
  },

  // ── 바이오의약품 (4개) ──
  'biosimilar-market-korea-2025': {
    drug: 'biosimilar OR filgrastim OR infliximab OR trastuzumab',
    condition: 'Cancer OR Rheumatoid Arthritis',
  },
  'adc-market-korea-2025': {
    drug: 'antibody drug conjugate OR T-DM1 OR trastuzumab deruxtecan OR sacituzumab',
    condition: 'Breast Cancer OR Lung Cancer',
  },
  'cell-gene-therapy-market-korea-2025': {
    drug: 'CAR-T OR tisagenlecleucel OR axicabtagene OR brexucabtagene',
    condition: 'B-cell Lymphoma OR Leukemia',
  },
  'mrna-market-korea-2025': {
    drug: 'mRNA vaccine OR BNT111 OR BNT112 OR BNT113',
    condition: 'Melanoma OR Cancer OR COVID-19',
  },

  // ── 디지털헬스 (3개) ──
  'dtx-market-korea-2025': {
    drug: 'digital therapeutic OR prescription digital therapy',
    condition: 'Depression OR Sleep Disorder',
  },
  'ai-drug-discovery-market-korea-2025': {
    drug: 'AI drug discovery OR machine learning',
    condition: 'Drug Discovery',
  },
  'telemedicine-market-korea-2025': {
    drug: 'telemedicine OR remote consultation OR virtual care',
    condition: 'Chronic Disease',
  },

  // ── 심혈관 (1개) ──
  'heart-failure-market-korea-2025': {
    drug: 'SGLT2 inhibitor OR sacubitril OR valsartan OR dapagliflozin',
    condition: 'Heart Failure',
  },

  // ── 건기식 (2개) ──
  'probiotics-market-korea-2025': {
    drug: 'probiotic OR lactobacillus OR bifidobacterium',
    condition: 'Gastrointestinal Disorder',
  },
  'vitamin-supplement-market-korea-2025': {
    drug: 'vitamin D OR vitamin B12 OR mineral supplement',
    condition: 'Vitamin Deficiency',
  },
};

/**
 * slug로 ClinicalTrials.gov 검색 파라미터 조회
 * @param slug 보고서 카탈로그 slug
 * @returns ClinicalTrials.gov 검색 파라미터 또는 null
 */
export function getSearchParamsBySlug(slug: string): ClinicalTrialsSearchParams | null {
  return CLINICAL_TRIALS_MAPPING[slug] || null;
}

/**
 * 모든 매핑 slug 목록 반환
 */
export function getAllMappedSlugs(): string[] {
  return Object.keys(CLINICAL_TRIALS_MAPPING);
}
