'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient, ApiResponse } from '@/lib/api-client'

/**
 * API 호출을 위한 범용 커스텀 훅
 * - 자동 로딩 상태 관리
 * - 에러 핸들링
 * - 재시도 기능
 * - 자동 새로고침 (옵션)
 */
export function useApi<T = unknown>(
  url: string | null,
  params?: Record<string, string | number | undefined>,
  options?: {
    autoFetch?: boolean        // 마운트 시 자동 호출 (기본: true)
    refreshInterval?: number   // 자동 새로고침 간격(ms)
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [pagination, setPagination] = useState<ApiResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const paramsKey = JSON.stringify(params)

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.get<T>(url, params)
      if (mountedRef.current) {
        if (result.success && result.data !== undefined) {
          setData(result.data)
          setPagination(result.pagination || null)
        } else {
          setError(result.error || '데이터를 불러올 수 없습니다.')
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey])

  // 자동 fetch
  useEffect(() => {
    mountedRef.current = true
    if (options?.autoFetch !== false) {
      fetchData()
    }
    return () => {
      mountedRef.current = false
    }
  }, [fetchData, options?.autoFetch])

  // 자동 새로고침
  useEffect(() => {
    if (!options?.refreshInterval || !url) return
    const intervalId = setInterval(fetchData, options.refreshInterval)
    return () => clearInterval(intervalId)
  }, [fetchData, options?.refreshInterval, url])

  return { data, pagination, loading, error, refetch: fetchData }
}

/**
 * API mutation (POST/PUT/DELETE) 훅
 */
export function useMutation<TData = unknown, TBody = unknown>(
  method: 'post' | 'put' | 'delete'
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (url: string, body?: TBody): Promise<{ success: boolean; data?: TData; error?: string }> => {
    setLoading(true)
    setError(null)

    try {
      const fn = method === 'post' ? apiClient.post
        : method === 'put' ? apiClient.put
        : apiClient.delete

      const result = await fn<TData>(url, body)
      setLoading(false)
      if (!result.success) {
        setError(result.error || '요청 처리 중 오류가 발생했습니다.')
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.'
      setError(message)
      setLoading(false)
      return { success: false, error: message }
    }
  }, [method])

  return { mutate, loading, error }
}
