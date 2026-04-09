import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let prismaInstance: PrismaClient

try {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
    // Neon 무료 티어 절전모드 대응: 연결 재시도 설정
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  // Neon wake-up: 절전모드에서 깨어나는 데 최대 ~2초 소요
  // Prisma 5.x는 자동으로 연결을 관리하지만,
  // 콜드스타트 시 연결 풀이 없으면 타임아웃 발생 가능
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance
} catch {
  // Prisma client not generated yet — will be available after `prisma generate` on deployment
  prismaInstance = {} as PrismaClient
}

export const prisma = prismaInstance

/**
 * Neon 절전모드 대응: DB 연결 확인 및 재시도 유틸리티
 * 사용법: await ensureDbConnection() → 이후 prisma 쿼리 실행
 *
 * Neon 무료 티어는 5분 비활동 후 절전모드 진입
 * 첫 연결 시 ~500ms~2s 소요 (cold start)
 */
export async function ensureDbConnection(maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.warn(`[DB] Connection attempt ${attempt}/${maxRetries} failed:`,
        error instanceof Error ? error.message : String(error))

      if (attempt < maxRetries) {
        // Neon 절전모드 깨우기 대기: 점진적 증가 (1초, 2초, 3초...)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }
    }
  }
  return false
}
