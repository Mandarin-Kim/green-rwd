/**
 * 프론트엔드 API 클라이언트
 * 모든 페이지에서 일관된 방식으로 API를 호출하기 위한 유틸리티
 */

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class ApiClientError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (response.status === 401) {
    // 인증 만료 시 로그인 페이지로 리다이렉트
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new ApiClientError('인증이 만료되었습니다.', 401)
  }

  const json = await response.json()

  if (!response.ok) {
    throw new ApiClientError(
      json.error || `요청 실패 (${response.status})`,
      response.status
    )
  }

  return json
}

/**
 * API 클라이언트 - GET, POST, PUT, DELETE 메서드 제공
 */
export const apiClient = {
  async get<T = unknown>(url: string, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value))
        }
      })
    }
    const queryString = searchParams.toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    return handleResponse<T>(response)
  },

  async post<T = unknown>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  async put<T = unknown>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  async delete<T = unknown>(url: string): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    return handleResponse<T>(response)
  },
}

export { ApiClientError }
export type { ApiResponse }
