import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let prismaInstance: PrismaClient

try {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance
} catch {
  // Prisma client not generated yet — will be available after `prisma generate` on deployment
  prismaInstance = {} as PrismaClient
}

export const prisma = prismaInstance
