import { NextResponse } from 'next/server'

/**
 * API 응답 메타데이터 인터페이스
 */
export interface ApiMeta {
  timestamp: string
  path?: string
  method?: string
}

/**
 * 페이지네이션 메타데이터
 */
export interface PaginationMeta extends ApiMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * 성공 응답 인터페이스
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: ApiMeta | PaginationMeta
}

/**
 * 오류 응답 인터페이스
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page: number
  pageSize: number
  skip: number
  take: number
}

/**
 * 성공 응답 반환
 * @param data 응답 데이터
 * @param pagination 페이지네이션 정보 (선택사항)
 * @param status HTTP 상태 코드
 */
export function success<T>(
  data: T,
  pagination?: {
    page: number
    pageSize: number
    total: number
  },
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  const meta: ApiMeta | PaginationMeta = pagination
    ? {
        timestamp: new Date().toISOString(),
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.pageSize),
        hasNext: pagination.page * pagination.pageSize < pagination.total,
        hasPrev: pagination.page > 1,
      }
    : {
        timestamp: new Date().toISOString(),
      }

  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status }
  )
}

/**
 * 오류 응답 반환
 * @param message 오류 메시지
 * @param status HTTP 상태 코드
 * @param code 오류 코드 (기본값: ERROR)
 * @param details 오류 상세 정보 (선택사항)
 */
export function error(
  message: string,
  status: number,
  code = 'ERROR',
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  )
}

/**
 * 페이지네이션 파라미터 계산
 * @param searchParams URL 검색 파라미터
 * @param defaults 기본값
 */
export function paginate(
  searchParams: Record<string, string | string[] | undefined>,
  defaults = { page: 1, pageSize: 20 }
): PaginationParams {
  let page = defaults.page
  let pageSize = defaults.pageSize

  if (searchParams.page) {
    const parsed = parseInt(
      Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page,
      10
    )
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed
    }
  }

  if (searchParams.pageSize) {
    const parsed = parseInt(
      Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize,
      10
    )
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      pageSize = parsed
    }
  }

  const skip = (page - 1) * pageSize

  return { page, pageSize, skip, take: pageSize }
}

// ─────────────────────────────────────
// HTTP 상태별 헬퍼 함수
// ─────────────────────────────────────

/**
 * 400 Bad Request 응답
 */
export function badRequest(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return error(message, 400, 'BAD_REQUEST', details)
}

/**
 * 401 Unauthorized 응답
 */
export function unauthorized(message = '인증이 필요합니다.'): NextResponse<ApiErrorResponse> {
  return error(message, 401, 'UNAUTHORIZED')
}

/**
 * 403 Forbidden 응답
 */
export function forbidden(message = '접근 권한이 없습니다.'): NextResponse<ApiErrorResponse> {
  return error(message, 403, 'FORBIDDEN')
}

/**
 * 404 Not Found 응답
 */
export function notFound(message = '요청한 리소스를 찾을 수 없습니다.'): NextResponse<ApiErrorResponse> {
  return error(message, 404, 'NOT_FOUND')
}

/**
 * 409 Conflict 응답
 */
export function conflict(message: string, details?: Record<string, unknown>): NextResponse<ApiErrorResponse> {
  return error(message, 409, 'CONFLICT', details)
}

/**
 * 422 Unprocessable Entity 응답 (유효성 검사 실패)
 */
export function unprocessable(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return error(message, 422, 'UNPROCESSABLE_ENTITY', details)
}

/**
 * 429 Too Many Requests 응답
 */
export function tooManyRequests(
  message = '요청 횟수 제한을 초과했습니다.'
): NextResponse<ApiErrorResponse> {
  return error(message, 429, 'TOO_MANY_REQUESTS')
}

/**
 * 500 Internal Server Error 응답
 */
export function serverError(
  message = '서버 오류가 발생했습니다.',
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return error(message, 500, 'INTERNAL_SERVER_ERROR', details)
}

/**
 * 503 Service Unavailable 응답
 */
export function serviceUnavailable(
  message = '서비스를 사용할 수 없습니다.'
): NextResponse<ApiErrorResponse> {
  return error(message, 503, 'SERVICE_UNAVAILABLE')
}
