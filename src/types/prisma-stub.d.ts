/**
 * Prisma Client 타입 스텁
 *
 * 이 파일은 prisma generate를 실행할 수 없는 빌드 환경(샌드박스 등)에서 TypeScript 컴파일을 통과시키기 위한 스텁입니다.
 * Vercel 배포 시 postinstall → prisma generate가 실행되면 실제 @prisma/client 타입이 이 스텁을 대체합니다.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@prisma/client' {
  interface PrismaModel {
    findMany: (args?: any) => Promise<any[]>
    findUnique: (args?: any) => Promise<any>
    findFirst: (args?: any) => Promise<any>
    create: (args?: any) => Promise<any>
    createMany: (args?: any) => Promise<any>
    update: (args?: any) => Promise<any>
    updateMany: (args?: any) => Promise<any>
    upsert: (args?: any) => Promise<any>
    delete: (args?: any) => Promise<any>
    deleteMany: (args?: any) => Promise<any>
    count: (args?: any) => Promise<number>
    aggregate: (args?: any) => Promise<any>
    groupBy: (args?: any) => Promise<any[]>
  }

  export class PrismaClient {
    user: PrismaModel
    account: PrismaModel
    session: PrismaModel
    organization: PrismaModel
    campaign: PrismaModel
    segment: PrismaModel
    patient: PrismaModel
    patientSegment: PrismaModel
    sending: PrismaModel
    campaignAnalytics: PrismaModel
    reportCatalog: PrismaModel
    reportOrder: PrismaModel
    dataSource: PrismaModel
    dataCache: PrismaModel
    study: PrismaModel
    site: PrismaModel
    ecrfTemplate: PrismaModel
    notification: PrismaModel
    auditLog: PrismaModel
    contentTemplate: PrismaModel
    creditTransaction: PrismaModel
    $connect: () => Promise<void>
    $disconnect: () => Promise<void>
    $transaction: (fn: any) => Promise<any>
    $queryRaw: (query: any, ...args: any[]) => Promise<any>
  }

  // Enums
  export type Role = 'ADMIN' | 'SPONSOR' | 'CRA' | 'USER'
  export type CampaignStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'EXECUTING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  export type ChannelType = 'SMS' | 'LMS' | 'KAKAO' | 'EMAIL' | 'PUSH'
  export type SendingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'READY' | 'EXECUTING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
  export type ReportTier = 'BASIC' | 'PRO' | 'PREMIUM'
  export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  export type DataSourceType = 'API' | 'SCRAPING' | 'MANUAL' | 'PROPRIETARY'
  export type StudyStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'TERMINATED'

  // Prisma namespace for utility types
  export namespace Prisma {
    type JsonValue = string | number | boolean | null | JsonObject | JsonArray
    interface JsonObject { [key: string]: JsonValue }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface JsonArray extends Array<JsonValue> {}
  }
}
