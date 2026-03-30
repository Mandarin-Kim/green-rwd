const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export async function api<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`
    const res = await fetch(url, {
          headers: { 'Content-Type': 'application/json', ...options?.headers },
          ...options,
    })
    if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Network Error' }))
          throw new Error(error.error || `HTTP ${res.status}`)
    }
    return res.json()
}

export const apiGet = <T>(endpoint: string) => api<T>(endpoint)
export const apiPost = <T>(endpoint: string, data: unknown) =>
    api<T>(endpoint, { method: 'POST', body: JSON.stringify(data) })
export const apiPut = <T>(endpoint: string, data: unknown) =>
    api<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) })
export const apiDelete = <T>(endpoint: string) =>
    api<T>(endpoint, { method: 'DELETE' })
