// Utility function for className merging (no external dependencies)
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

// Format number with Korean locale (e.g., 1,234)
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

// Format currency in KRW (e.g., ₩1,234)
export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(n)
}

// Format date to Korean-friendly format (e.g., 2026.03.31)
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return y + '.' + m + '.' + d
  } catch {
    return '-'
  }
}

// Format date with time (e.g., 2026.03.31 14:30)
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return y + '.' + m + '.' + d + ' ' + h + ':' + min
  } catch {
    return '-'
  }
}

// Format relative date (e.g., 3일 전, 2시간 전)
export function formatRelativeDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)
    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return diffMin + '분 전'
    if (diffHour < 24) return diffHour + '시간 전'
    if (diffDay < 30) return diffDay + '일 전'
    return formatDate(dateStr)
  } catch {
    return '-'
  }
}
