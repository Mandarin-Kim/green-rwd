// 프론트엔드에서 API 호출을 위한 헬퍼 함수
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  params?: Record<string, string>
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options

  let url = `${BASE_URL}/api${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'API Error' }))
    throw new Error(error.message || `API Error: ${res.status}`)
  }

  return res.json()
}

// React hook용 간편 래퍼
export const apiGet = <T>(endpoint: string, params?: Record<string, string>) =>
  api<T>(endpoint, { params })

export const apiPost = <T>(endpoint: string, body: unknown) =>
  api<T>(endpoint, { method: 'POST', body })

export const apiPut = <T>(endpoint: string, body: unknown) =>
  api<T>(endpoint, { method: 'PUT', body })

export const apiDelete = <T>(endpoint: string) =>
  api<T>(endpoint, { method: 'DELETE' })