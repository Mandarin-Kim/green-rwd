/**
 * 입력값 검증 유틸리티 함수들
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
const XSS_CHARS_REGEX = /[<>]/g

/**
 * 필수 필드 검증
 * @param fields 필수 필드 목록
 * @param body 검증할 객체
 * @returns 누락된 필드 목록 (빈 배열이면 통과)
 */
export function validateRequired(
  fields: string[],
  body: Record<string, unknown>
): string[] {
  const missing: string[] = []
  for (const field of fields) {
    const value = body[field]
    if (value === undefined || value === null || value === '') {
      missing.push(field)
    }
  }
  return missing
}

/**
 * 이메일 형식 검증
 * @param email 검증할 이메일
 * @returns 유효하면 true, 아니면 false
 */
export function validateEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false
  return EMAIL_REGEX.test(email) && email.length <= 254
}

/**
 * 비밀번호 강도 검증
 * 요구사항:
 * - 최소 8자
 * - 영문자 포함 (대소문자 모두)
 * - 숫자 포함
 * - 특수문자 포함 (!@#$%^&* 등)
 * @param password 검증할 비밀번호
 * @returns 유효하면 true, 아니면 false
 */
export function validatePassword(password: unknown): password is string {
  if (typeof password !== 'string') return false
  if (password.length < 8) return false

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = SPECIAL_CHAR_REGEX.test(password)

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars
}

/**
 * 페이지네이션 파라미터 검증
 * @param searchParams URL 검색 파라미터
 * @param defaults 기본값
 * @returns 검증된 페이지네이션 객체
 */
export function validatePagination(
  searchParams: Record<string, string | string[] | undefined>,
  defaults = { page: 1, pageSize: 20 }
): { page: number; pageSize: number; skip: number } {
  let page = defaults.page
  let pageSize = defaults.pageSize

  // page 파라미터 검증
  if (searchParams.page) {
    const pageStr = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page
    const parsed = parseInt(pageStr, 10)
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed
    }
  }

  // pageSize 파라미터 검증 (최대 100)
  if (searchParams.pageSize) {
    const sizeStr = Array.isArray(searchParams.pageSize)
      ? searchParams.pageSize[0]
      : searchParams.pageSize
    const parsed = parseInt(sizeStr, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      pageSize = parsed
    }
  }

  const skip = (page - 1) * pageSize

  return { page, pageSize, skip }
}

/**
 * 날짜 범위 검증
 * @param start 시작 날짜 문자열 (ISO 8601)
 * @param end 종료 날짜 문자열 (ISO 8601)
 * @returns 유효하면 { isValid: true, startDate, endDate }, 아니면 { isValid: false, error }
 */
export function validateDateRange(
  start: unknown,
  end: unknown
): {
  isValid: boolean
  startDate?: Date
  endDate?: Date
  error?: string
} {
  if (typeof start !== 'string' || typeof end !== 'string') {
    return { isValid: false, error: '날짜는 문자열이어야 합니다.' }
  }

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (isNaN(startDate.getTime())) {
    return { isValid: false, error: '시작 날짜 형식이 올바르지 않습니다.' }
  }

  if (isNaN(endDate.getTime())) {
    return { isValid: false, error: '종료 날짜 형식이 올바르지 않습니다.' }
  }

  if (startDate > endDate) {
    return { isValid: false, error: '시작 날짜가 종료 날짜보다 클 수 없습니다.' }
  }

  return { isValid: true, startDate, endDate }
}

/**
 * 문자열 XSS 방지 처리 (기본적인 정제)
 * 프로덕션에서는 DOMPurify 등의 라이브러리 사용 권장
 * @param str 정제할 문자열
 * @returns 정제된 문자열
 */
export function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return ''

  // XSS 위험 문자 제거
  let sanitized = str.replace(XSS_CHARS_REGEX, '')

  // 공백 정규화 (연속 공백을 단일 공백으로)
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized
}

/**
 * 전화번호 검증 (한국 형식)
 * @param phone 검증할 전화번호
 * @returns 유효하면 true, 아니면 false
 */
export function validatePhoneNumber(phone: unknown): phone is string {
  if (typeof phone !== 'string') return false
  // 숫자와 하이픈만 포함, 최소 9자리
  const phoneRegex = /^[\d-]{9,}$/
  return phoneRegex.test(phone.replace(/\D/g, '').slice(0, 11))
}

/**
 * URL 검증
 * @param url 검증할 URL
 * @returns 유효하면 true, 아니면 false
 */
export function validateUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 숫자 범위 검증
 * @param value 검증할 숫자
 * @param min 최솟값 (포함)
 * @param max 최댓값 (포함)
 * @returns 유효하면 true, 아니면 false
 */
export function validateNumberRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  if (typeof value !== 'number' || isNaN(value)) return false
  return value >= min && value <= max
}

/**
 * 문자열 길이 범위 검증
 * @param value 검증할 문자열
 * @param min 최소 길이
 * @param max 최대 길이
 * @returns 유효하면 true, 아니면 false
 */
export function validateStringLength(
  value: unknown,
  min: number,
  max: number
): value is string {
  if (typeof value !== 'string') return false
  return value.length >= min && value.length <= max
}

/**
 * JSON 객체 검증
 * @param value 검증할 값
 * @returns 유효한 JSON 객체면 true, 아니면 false
 */
export function isValidJson(value: unknown): boolean {
  if (typeof value === 'object' && value !== null) {
    try {
      JSON.stringify(value)
      return true
    } catch {
      return false
    }
  }
  return false
}

/**
 * 배열 검증 및 타입 확인
 * @param value 검증할 값
 * @param itemValidator 각 항목을 검증하는 함수
 * @returns 유효한 배열이면 true, 아니면 false
 */
export function validateArray<T>(
  value: unknown,
  itemValidator?: (item: unknown) => item is T
): value is T[] {
  if (!Array.isArray(value)) return false
  if (!itemValidator) return true
  return value.every(itemValidator)
}
