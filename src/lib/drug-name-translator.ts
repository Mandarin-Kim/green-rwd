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

  // Check disease/indication mapping first
  if (koreanDrugMapping[trimmed]) {
    return koreanDrugMapping[trimmed]
  }

  // Check common drug name mapping
  if (commonDrugNameMapping[trimmed]) {
    return commonDrugNameMapping[trimmed]
  }

  // Return original if no translation found
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
    // Add generic name variations
    const genericVariations = getGenericVariations(drugNameEn)
    searchTerms.push(...genericVariations)
  }

  if (indicationEn && indicationEn !== drugNameEn) {
    searchTerms.push(indicationEn)
  }

  // Remove duplicates and empty strings
  const uniqueTerms = Array.from(new Set(searchTerms.filter(t => t && t.length > 0)))

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
