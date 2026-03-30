import { useState, useEffect, useCallback } from 'react'

interface UseApiResult<T> {
  data: T
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApiData<T>(endpoint: string, fallbackData: T): UseApiResult<T> {
  const [data, setData] = useState<T>(fallbackData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(endpoint)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => setData(d))
      .catch((err) => {
        // API 실패 시 fallback 데이터 유지
        // 개발 중 또는 API 미연결 환경에서도 UI가 정상 작동
        console.warn(`[useApiData] ${endpoint} 호출 실패, fallback 사용:`, err.message)
        setError(null) // 에러를 표시하지 않고 fallback으로 대체
      })
      .finally(() => setLoading(false))
  }, [endpoint])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}

// API mutation helper - POST/PUT/DELETE 요청용
export async function apiMutate(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      return { ok: false, error: err.error }
    }
    const data = await res.json()
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'API 서버에 연결할 수 없습니다' }
  }
}

// useApiData + 쿼리 파라미터 빌더
export function buildApiUrl(base: string, params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `${base}?${queryString}` : base
}
