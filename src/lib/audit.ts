import { prisma } from './prisma'

/**
 * 감사 로그 작업 유형
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  SEND = 'SEND',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
}

/**
 * 감사 로그 생성
 * 사용자의 주요 작업을 기록하여 보안 및 규정 준수를 위한 감사 추적을 제공합니다.
 *
 * @param userId 작업을 수행한 사용자의 ID
 * @param action 수행한 작업 (AuditAction enum 참조)
 * @param entity 작업 대상 엔티티 (예: 'Campaign', 'User', 'Study')
 * @param entityId 작업 대상 엔티티의 ID
 * @param details 추가 상세 정보 (JSON 형식, 선택사항)
 * @param ipAddress 요청한 클라이언트의 IP 주소 (선택사항)
 * @returns 생성된 감사 로그 객체
 */
export async function logAudit(
  userId: string,
  action: AuditAction | string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string
) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        detail: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress: ipAddress || null,
      },
    })
    return auditLog
  } catch (error) {
    // 감사 로그 생성 실패 시에도 메인 작업에 영향을 주지 않도록
    // 에러를 로깅하고 계속 진행
    console.error('감사 로그 생성 실패:', error)
    return null
  }
}

/**
 * 대량 감사 로그 생성
 * 여러 개의 감사 로그를 한 번에 생성합니다.
 *
 * @param logs 감사 로그 데이터 배열
 * @returns 생성된 감사 로그 수
 */
export async function logAuditBatch(
  logs: Array<{
    userId: string
    action: AuditAction | string
    entity: string
    entityId?: string | null
    details?: Record<string, unknown>
    ipAddress?: string
  }>
) {
  if (logs.length === 0) return 0

  try {
    const result = await prisma.auditLog.createMany({
      data: logs.map((log) => ({
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId || null,
        detail: log.details ? JSON.parse(JSON.stringify(log.details)) : null,
        ipAddress: log.ipAddress || null,
      })),
    })
    return result.count
  } catch (error) {
    console.error('대량 감사 로그 생성 실패:', error)
    return 0
  }
}

/**
 * 특정 엔티티의 감사 로그 조회
 * 특정 엔티티에 대한 모든 작업 이력을 조회합니다.
 *
 * @param entity 엔티티 타입
 * @param entityId 엔티티 ID
 * @param limit 조회할 최대 개수 (기본값: 50)
 * @returns 감사 로그 배열
 */
export async function getAuditLogs(
  entity: string,
  entityId: string,
  limit = 50
) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    return logs
  } catch (error) {
    console.error('감사 로그 조회 실패:', error)
    return []
  }
}

/**
 * 특정 사용자의 감사 로그 조회
 * 특정 사용자가 수행한 모든 작업을 조회합니다.
 *
 * @param userId 사용자 ID
 * @param limit 조회할 최대 개수 (기본값: 100)
 * @returns 감사 로그 배열
 */
export async function getUserAuditLogs(userId: string, limit = 100) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    return logs
  } catch (error) {
    console.error('사용자 감사 로그 조회 실패:', error)
    return []
  }
}

/**
 * 시간 범위로 감사 로그 조회
 * 특정 시간 범위 내의 감사 로그를 조회합니다.
 *
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @param filters 추가 필터 조건 (action, entity, userId 등)
 * @param limit 조회할 최대 개수 (기본값: 100)
 * @returns 감사 로그 배열
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  filters?: {
    action?: string
    entity?: string
    userId?: string
  },
  limit = 100
) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(filters?.action && { action: filters.action }),
        ...(filters?.entity && { entity: filters.entity }),
        ...(filters?.userId && { userId: filters.userId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    return logs
  } catch (error) {
    console.error('시간 범위 감사 로그 조회 실패:', error)
    return []
  }
}

/**
 * 감사 로그 통계 조회
 * 특정 기간 동안의 작업별 집계를 반환합니다.
 *
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 작업별 통계 객체
 */
export async function getAuditLogStats(startDate: Date, endDate: Date) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const stats: Record<string, number> = {}
    for (const log of logs) {
      stats[log.action] = (stats[log.action] || 0) + 1
    }

    return {
      totalCount: logs.length,
      actionStats: stats,
      entityCount: new Set(logs.map((log) => log.entity)).size,
      userCount: new Set(logs.map((log) => log.userId)).size,
    }
  } catch (error) {
    console.error('감사 로그 통계 조회 실패:', error)
    return {
      totalCount: 0,
      actionStats: {},
      entityCount: 0,
      userCount: 0,
    }
  }
}

/**
 * 특정 기간 이전의 감사 로그 삭제 (데이터 정책용)
 * 오래된 감사 로그를 정리하는 데 사용합니다.
 *
 * @param beforeDate 이 날짜 이전의 모든 로그를 삭제
 * @returns 삭제된 감사 로그 수
 */
export async function deleteOldAuditLogs(beforeDate: Date) {
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: beforeDate,
        },
      },
    })
    return result.count
  } catch (error) {
    console.error('오래된 감사 로그 삭제 실패:', error)
    return 0
  }
}
