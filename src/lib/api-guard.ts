import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { unauthorized, forbidden } from './api-response'

/**
 * 인증 정보가 포함된 요청 타입
 */
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    name?: string
    email?: string
    role: 'ADMIN' | 'SPONSOR' | 'CRA' | 'USER'
  }
}

/**
 * API 라우트 핸들러 타입
 */
export type ApiRouteHandler = (
  req: AuthenticatedRequest,
  context?: Record<string, unknown>
) => Promise<NextResponse>

/**
 * 세션에서 사용자 정보 추출
 * @returns 사용자 정보 또는 null
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSessionUser(_req?: NextRequest): Promise<AuthenticatedRequest['user'] | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any
    return {
      id: user.id || '',
      name: user.name,
      email: user.email,
      role: user.role || 'USER',
    }
  } catch {
    return null
  }
}

/**
 * 인증 미들웨어
 * 유효한 세션이 있는지 확인하고 사용자 정보를 요청에 주입
 * @param handler API 라우트 핸들러
 */
export function withAuth(handler: ApiRouteHandler): ApiRouteHandler {
  return async (req: AuthenticatedRequest, context?: Record<string, unknown>) => {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    req.user = user
    return handler(req, context)
  }
}

/**
 * 역할 기반 접근 제어 (RBAC) 미들웨어
 * 지정된 역할 중 하나를 가진 사용자만 허용
 * @param roles 허용된 역할 목록
 * @param handler API 라우트 핸들러
 */
export function withRole(
  roles: Array<'ADMIN' | 'SPONSOR' | 'CRA' | 'USER'>,
  handler: ApiRouteHandler
): ApiRouteHandler {
  return async (req: AuthenticatedRequest, context?: Record<string, unknown>) => {
    const user = await getSessionUser(req)
    if (!user) {
      return unauthorized('로그인이 필요합니다.')
    }

    if (!roles.includes(user.role)) {
      return forbidden(`필요한 역할: ${roles.join(', ')}`)
    }

    req.user = user
    return handler(req, context)
  }
}

/**
 * 복합 미들웨어: 인증 + RBAC
 * @param roles 허용된 역할 목록
 * @param handler API 라우트 핸들러
 */
export function withAuthAndRole(
  roles: Array<'ADMIN' | 'SPONSOR' | 'CRA' | 'USER'>,
  handler: ApiRouteHandler
): ApiRouteHandler {
  return withRole(roles, handler)
}

/**
 * 특정 역할만 허용하는 미들웨어 생성 헬퍼
 */
export const withAdminOnly = (handler: ApiRouteHandler): ApiRouteHandler =>
  withRole(['ADMIN'], handler)

export const withSponsorOnly = (handler: ApiRouteHandler): ApiRouteHandler =>
  withRole(['SPONSOR', 'ADMIN'], handler)

export const withCRAOnly = (handler: ApiRouteHandler): ApiRouteHandler =>
  withRole(['CRA', 'ADMIN'], handler)

export const withAuthenticated = (handler: ApiRouteHandler): ApiRouteHandler =>
  withAuth(handler)
