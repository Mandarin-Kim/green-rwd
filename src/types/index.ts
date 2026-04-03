export type Role = 'ADMIN' | 'SPONSOR' | 'CRA' | 'USER'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  image?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface KpiCard {
  label: string
  value: string | number
  change: string
  up: boolean
  icon: string
}

export type CampaignWizardStep = 'objective' | 'target' | 'content' | 'schedule' | 'review'
