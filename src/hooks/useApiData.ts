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
      .catch(() => {
        // API 실패 시 fallback 데이터 유지 (GitHub Pages 등 API 없는 환경)
      })
      .finally(() => setLoading(false))
  }, [endpoint])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}

// API mutation helper
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
