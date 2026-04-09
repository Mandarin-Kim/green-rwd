/**
 * Drug name and indication translator from Korean to English
 * Used for international medical API queries
 */

/**
 * Mapping of Korean drug names to English equivalents
 */
const koreanDrugMapping: Record<string, string> = {
  // Oncology - NSCLC (비소세포폐암)
  '비소세포폐암': 'Non-Small Cell Lung Cancer',
  'NSCLC': 'Non-Small Cell Lung Cancer',
  '넥사바': 'Sorafenib',
  '타그리소': 'Osimertinib',
  '아바스틴': 'Bevacizumab',
  '얄루타': 'Abiraterone',

  // Oncology - Breast Cancer (유방암)
  '유방암': 'Breast Cancer',
  '헤르셉틴': 'Trastuzumab',
  '팩리탁셀': 'Paclitaxel',
  '패티티피':'Pertuzumab',
  '카디렉스': 'Cadazolid',

  // Oncology - Colorectal Cancer (대장암)
  '대장암': 'Colorectal Cancer',
  '에르비툭스': 'Cetuximab',
  '캠토':'Irinotecan',

  // Oncology - Other
  '악성종양': 'Malignant Neoplasm',
  '암': 'Cancer',
  '종양': 'Tumor',

  // Cardiovascular (심혈관계)
  '심부전': 'Heart Failure',
  '고혈압': 'Hypertension',
  '협심증': 'Angina',
  '심근경색': 'Myocardial Infarction',
  '부정맥': 'Arrhythmia',
  '심방세동': 'Atrial Fibrillation',
  '중풍': 'Stroke',
  '뇌중풍': 'Cerebrovascular Stroke',

  // Metabolic (대사질환)
  '당뇨병': 'Diabetes Mellitus',
  '제2형당뇨': 'Type 2 Diabetes',
  '고지혈증': 'Dyslipidemia',
  '비만': 'Obesity',
  '대사증후군': 'Metabolic Syndrome',

  // Respiratory (호흡기계)
  '천식': 'Asthma',
  '만성폐쇄성폐질환': 'Chronic Obstructive Pulmonary Disease',
  'COPD': 'Chronic Obstructive Pulmonary Disease',
  '폐렴': 'Pneumonia',
  '폐포체액': 'Pulmonary Edema',

  // Gastrointestinal (소화기계)
  '위궤양': 'Gastric Ulcer',
  '십이지장궤양': 'Duodenal Ulcer',
  '역류성식도염': 'Gastroesophageal Reflux Disease',
  'GERD': 'Gastroesophageal Reflux Disease',
  '염증성장질환': 'Inflammatory Bowel Disease',
  '크론병': 'Crohn\'s Disease',
  '궤양성대장염': 'Ulcerative Colitis',

  // Endocrine (내분비계)
  '갑상선질환': 'Thyroid Disease',
  '갑상선암': 'Thyroid Cancer',
  '저갑상선증': 'Hypothyroidism',
  '갑상선기능항진증': 'Hyperthyroidism',
  '골다공증': 'Osteoporosis',

  // Neurological (신경계)
  '알츠하이머병': 'Alzheimer\'s Disease',
  '파킨슨병': 'Parkinson\'s Disease',
  '간질': 'Epilepsy',
  '편두통': 'Migraine',
  '뇌전증': 'Seizure Disorder',

  // Infectious
  '감염': 'Infection',
  '세균감염': 'Bacterial Infection',
  'HIV': 'HIV',
  'AIDS': 'AIDS',
  'B형간염': 'Hepatitis B',
  'C형간염': 'Hepatitis C',
  '결핵': 'Tuberculosis',
  'TB': 'Tuberculosis',

  // Rheumatologic
  '류마티스관절염': 'Rheumatoid Arthritis',
  '전신성홍반성낭창': 'Systemic Lupus Erythematosus',
  '강직성척추염': 'Ankylosing Spondylitis',

  // Hematologic (혈액학)
  '골수섬유증': 'Myelofibrosis',
  '적혈구증가증': 'Polycythemia Vera',
  '본태성혈소판증가증': 'Essential Thrombocythemia',
  '본태성 혈소판증가증': 'Essential Thrombocythemia',
  '혈소판증가증': 'Thrombocythemia',
  '골수이형성증후군': 'Myelodysplastic Syndrome',
  'MDS': 'Myelodysplastic Syndrome',
  '급성골수성백혈병': 'Acute Myeloid Leukemia',
  '만성골수성백혈병': 'Chronic Myeloid Leukemia',
  '백혈병': 'Leukemia',
  '림프종': 'Lymphoma',
  '다발성골수종': 'Multiple Myeloma',
  '빈혈': 'Anemia',
  '재생불량성빈혈': 'Aplastic Anemia',
  '호지킨림프종': 'Hodgkin Lymphoma',
  '비호지킨림프종': 'Non-Hodgkin Lymphoma',
  '혈우병': 'Hemophilia',
  '혈전증': 'Thrombosis',
  '이식편대숙주병': 'Graft-versus-Host Disease',

  // Dermatology (피부과)
  '아토피피부염': 'Atopic Dermatitis',
  '건선': 'Psoriasis',
  '습진': 'Eczema',
  '대상포진': 'Herpes Zoster',

  // Ophthalmology (안과)
  '황반변성': 'Age-related Macular Degeneration',
  '녹내장': 'Glaucoma',
  '당뇨망막병증': 'Diabetic Retinopathy',

  // Urology (비뇨기과)
  '전립선암': 'Prostate Cancer',
  '전립선비대증': 'Benign Prostatic Hyperplasia',
  '방광암': 'Bladder Cancer',
  '신장암': 'Renal Cell Carcinoma',

  // Other conditions
  '신부전': 'Renal Failure',
  '만성신질환': 'Chronic Kidney Disease',
  '간경변': 'Cirrhosis',
  '만성간질환': 'Chronic Liver Disease',
  '우울증': 'Depression',
  '불안장애': 'Anxiety Disorder',
  '정신분열증': 'Schizophrenia',
}

/**
 * Common drug names and their English equivalents
 */
const commonDrugNameMapping: Record<string, string> = {
  // Analgesics
  '아세트아미노펜': 'Acetaminophen',
  '이부프로펜': 'Ibuprofen',
  '모르핀': 'Morphine',
  '옥시코돈': 'Oxycodone',

  // Antibiotics
  '아목시실린': 'Amoxicillin',
  '페니실린': 'Penicillin',
  '세팔로스포린': 'Cephalosporin',
  '플루오로퀴놀론': 'Fluoroquinolone',
  '독시사이클린': 'Doxycycline',

  // Antihypertensives
  'ACE억제제': 'ACE Inhibitor',
  '앙지오텐신수용체차단제': 'Angiotensin Receptor Blocker',
  '베타차단제': 'Beta Blocker',
  '칼슘채널차단제': 'Calcium Channel Blocker',
  '리시노프릴': 'Lisinopril',
  '로사르탄': 'Losartan',

  // Anticoagulants
  '와파린': 'Warfarin',
  '헤파린': 'Heparin',
  '아스피린': 'Aspirin',
  '클로피도그렐': 'Clopidogrel',

  // Statins
  '심바스타틴': 'Simvastatin',
  '로바스타틴': 'Lovastatin',
  '애토르바스타틴': 'Atorvastatin',
  '프라바스타틴': 'Pravastatin',

  // Diabetes medications
  '메트포르민': 'Metformin',
  '글리벤클라마이드': 'Glyburide',
  '인슐린': 'Insulin',
  '글리피자이드': 'Glipizide',

  // Immunosuppressants
  '싸이클로스포린': 'Cyclosporine',
  '타크롤리무스': 'Tacrolimus',
  '미코페놀레이트': 'Mycophenolate',

  // Hematologic drugs (혈액학 약물)
  '룩소리티닙': 'Ruxolitinib',
  '자카피': 'Ruxolitinib',
  '자카비': 'Ruxolitinib',
  '하이드록시유레아': 'Hydroxyurea',
  '인터페론': 'Interferon',
  '페그인터페론': 'Peginterferon',
  '아나그렐라이드': 'Anagrelide',
  '이매티닙': 'Imatinib',
  '글리벡': 'Imatinib',
  '닐로티닙': 'Nilotinib',
  '다사티닙': 'Dasatinib',
  '보르테조밉': 'Bortezomib',
  '레날리도마이드': 'Lenalidomide',
  '리투시맙': 'Rituximab',
  '페드라티닙': 'Fedratinib',
  '파크리티닙': 'Pacritinib',
  'JAK억제제': 'JAK Inhibitor',

  // Dermatology drugs (피부과 약물)
  '듀피루맙': 'Dupilumab',
  '듀피센트': 'Dupilumab',
  '아달리무맙': 'Adalimumab',
  '휴미라': 'Adalimumab',

  // Ophthalmology drugs (안과 약물)
  '아플리버셉트': 'Aflibercept',
  '아일리아': 'Aflibercept',
  '라니비주맙': 'Ranibizumab',
  '루센티스': 'Ranibizumab',
}

/**
 * Translate a Korean term (drug name or indication) to English
 * @param koreanTerm - Korean term to translate
 * @returns English translation, or original term if not found
 */
export function translateToEnglish(koreanTerm: string): string {
  if (!koreanTerm || typeof koreanTerm !== 'string') {
    return ''
  }

  const trimmed = koreanTerm.trim()

  // 1. 정확히 매칭되면 바로 반환
  if (koreanDrugMapping[trimmed]) {
    return koreanDrugMapping[trimmed]
  }
  if (commonDrugNameMapping[trimmed]) {
    return commonDrugNameMapping[trimmed]
  }

  // 2. 복합 질환명 분리 (" + ", "/", "·", "," 등으로 분리)
  const separators = [' + ', '+', ' / ', '/', ' · ', '·', ', ', ',']
  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep).map(p => p.trim()).filter(Boolean)
      const translated = parts.map(p => {
        if (koreanDrugMapping[p]) return koreanDrugMapping[p]
        if (commonDrugNameMapping[p]) return commonDrugNameMapping[p]
        // 부분 매칭 시도
        for (const [kr, en] of Object.entries(koreanDrugMapping)) {
          if (p.includes(kr) || kr.includes(p)) return en
        }
        return p
      })
      // 하나라도 번역됐으면 합쳐서 반환
      if (translated.some((t, i) => t !== parts[i])) {
        return translated[0] // 첫 번째 번역된 질환명 반환 (API 검색은 하나만으로도 충분)
      }
    }
  }

  // 3. 부분 매칭: 입력에 사전 키워드가 포함되어 있는 경우
  for (const [kr, en] of Object.entries(koreanDrugMapping)) {
    if (trimmed.includes(kr)) return en
  }
  for (const [kr, en] of Object.entries(commonDrugNameMapping)) {
    if (trimmed.includes(kr)) return en
  }

  // 4. Return original if no translation found
  return trimmed
}

/**
 * Get international search terms for APIs
 * @param drugName - Drug name (Korean or English)
 * @param indication - Indication/disease (Korean or English)
 * @returns Object with English translations and alternative search terms
 */
export function getInternationalSearchTerms(
  drugName: string,
  indication: string
): {
  drugNameEn: string
  indicationEn: string
  searchTerms: string[]
  hasKoreanDrug: boolean
  hasKoreanIndication: boolean
} {
  if (!drugName && !indication) {
    return {
      drugNameEn: '',
      indicationEn: '',
      searchTerms: [],
      hasKoreanDrug: false,
      hasKoreanIndication: false,
    }
  }

  const drugNameEn = translateToEnglish(drugName || '')
  const indicationEn = translateToEnglish(indication || '')

  // Check if original was Korean (contains Korean characters)
  const hasKoreanDrug = /[\uac00-\ud7af]/.test(drugName || '')
  const hasKoreanIndication = /[\uac00-\ud7af]/.test(indication || '')

  // Build search terms
  const searchTerms: string[] = []

  if (drugNameEn) {
    searchTerms.push(drugNameEn)
    const genericVariations = getGenericVariations(drugNameEn)
    searchTerms.push(...genericVariations)
  }

  if (indicationEn && indicationEn !== drugNameEn) {
    searchTerms.push(indicationEn)
    const indicVariations = getGenericVariations(indicationEn)
    searchTerms.push(...indicVariations)
  }

  // 복합 질환명일 경우 개별 질환 번역도 검색어에 추가
  const separators = [' + ', '+', ' / ', '/', ' · ', '·', ', ', ',']
  for (const field of [drugName, indication]) {
    if (!field) continue
    for (const sep of separators) {
      if (field.includes(sep)) {
        const parts = field.split(sep).map(p => p.trim()).filter(Boolean)
        for (const part of parts) {
          const translated = translateToEnglish(part)
          if (translated && !/[\uac00-\ud7af]/.test(translated)) {
            searchTerms.push(translated)
          }
        }
        break // 첫 번째 매칭되는 구분자만 사용
      }
    }
  }

  // Remove duplicates and empty strings
  const uniqueTerms = Array.from(new Set(searchTerms.filter(t => t && t.length > 0 && !/[\uac00-\ud7af]/.test(t))))

  return {
    drugNameEn,
    indicationEn,
    searchTerms: uniqueTerms,
    hasKoreanDrug,
    hasKoreanIndication,
  }
}

/**
 * Get generic variations of a drug name for broader API searches
 * @param drugName - English drug name
 * @returns Array of alternative search terms
 */
function getGenericVariations(drugName: string): string[] {
  const variations: string[] = []

  if (!drugName) return variations

  // Add disease class based on common patterns
  const lowerName = drugName.toLowerCase()

  // Oncology
  if (
    lowerName.includes('cancer') ||
    lowerName.includes('carcinoma') ||
    lowerName.includes('malignant') ||
    lowerName.includes('tumor') ||
    lowerName.includes('neoplasm')
  ) {
    variations.push('Oncology', 'Chemotherapy', 'Anti-cancer')
  }

  // Cardiovascular
  if (
    lowerName.includes('heart') ||
    lowerName.includes('cardiac') ||
    lowerName.includes('hypertension') ||
    lowerName.includes('angina') ||
    lowerName.includes('infarction') ||
    lowerName.includes('arrhythmia') ||
    lowerName.includes('fibrillation') ||
    lowerName.includes('stroke')
  ) {
    variations.push('Cardiovascular', 'Cardiac', 'Antihypertensive')
  }

  // Metabolic
  if (lowerName.includes('diabetes') || lowerName.includes('glucose')) {
    variations.push('Antidiabetic', 'Glucose Control', 'Metabolic')
  }

  // Respiratory
  if (lowerName.includes('asthma') || lowerName.includes('copd') || lowerName.includes('lung')) {
    variations.push('Respiratory', 'Pulmonary', 'Bronchodilator')
  }

  // Hematologic
  if (
    lowerName.includes('myelofibrosis') ||
    lowerName.includes('polycythemia') ||
    lowerName.includes('thrombocythemia') ||
    lowerName.includes('leukemia') ||
    lowerName.includes('lymphoma') ||
    lowerName.includes('myeloma') ||
    lowerName.includes('anemia') ||
    lowerName.includes('myelodysplastic')
  ) {
    variations.push('Hematology', 'Blood Cancer', 'Myeloproliferative')
    if (lowerName.includes('myelofibrosis')) {
      variations.push('Ruxolitinib', 'Jakafi', 'JAK Inhibitor')
    }
    if (lowerName.includes('polycythemia')) {
      variations.push('Hydroxyurea', 'Ruxolitinib')
    }
    if (lowerName.includes('thrombocythemia')) {
      variations.push('Anagrelide', 'Hydroxyurea')
    }
  }

  // Dermatology
  if (lowerName.includes('dermatitis') || lowerName.includes('psoriasis') || lowerName.includes('eczema')) {
    variations.push('Dermatology', 'Skin Disease')
  }

  // Ophthalmology
  if (lowerName.includes('macular') || lowerName.includes('glaucoma') || lowerName.includes('retinopathy')) {
    variations.push('Ophthalmology', 'Eye Disease')
  }

  return variations
}

/**
 * Batch translate multiple Korean terms
 * @param koreanTerms - Array of Korean terms
 * @returns Map of Korean to English translations
 */
export function translateBatch(koreanTerms: string[]): Record<string, string> {
  const results: Record<string, string> = {}

  for (const term of koreanTerms) {
    if (term) {
      results[term] = translateToEnglish(term)
    }
  }

  return results
}

/**
 * Check if a string contains Korean characters
 * @param text - Text to check
 * @returns true if text contains Korean characters
 */
export function hasKoreanCharacters(text: string): boolean {
  if (!text) return false
  return /[\uac00-\ud7af]/.test(text)
}

/**
 * Get all supported Korean drug names
 * @returns Array of supported Korean drug names
 */
export function getSupportedKoreanDrugNames(): string[] {
  return Object.keys(koreanDrugMapping)
}

/**
 * Get all supported Korean indication names
 * @returns Array of supported Korean indication names
 */
export function getSupportedKoreanIndications(): string[] {
  return Object.keys(koreanDrugMapping).filter(key => {
    const value = koreanDrugMapping[key]
    // Filter for disease/condition names (not specific drug brands)
    return (
      value.includes('Disease') ||
      value.includes('Cancer') ||
      value.includes('Failure') ||
      value.includes('Disorder') ||
      value.includes('Syndrome') ||
      value.includes('Hyperension') ||
      value.includes('Diabetes') ||
      value.includes('Asthma') ||
      value.includes('Pneumonia') ||
      value.includes('Ulcer') ||
      value.includes('Infection') ||
      value.includes('Neoplasm') ||
      value.includes('Arthritis')
    )
  })
}
