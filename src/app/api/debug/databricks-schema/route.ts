import { NextResponse } from 'next/server'

/**
 * GET /api/debug/databricks-schema
 * Databricks 테이블 구조 및 실제 컬럼 값 확인용 (임시 진단 API)
 */

const RAW_HOST = process.env.DATABRICKS_HOST || ''
// https:// 또는 http:// 접두사 제거
const HOST = RAW_HOST.replace(/^https?:\/\//, '').replace(/\/$/, '')
const TOKEN = process.env.DATABRICKS_TOKEN!
const HTTP_PATH = process.env.DATABRICKS_HTTP_PATH || ''
const WAREHOUSE_ID = HTTP_PATH.split('/').pop() || '4ab2c6c6c5d697b5'

async function runSQL(sql: string) {
  const url = `https://${HOST}/api/2.0/sql/statements`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      catalog: 'greenribbon',
      schema: 'claim',
      statement: sql,
      wait_timeout: '30s',
      disposition: 'INLINE',
      format: 'JSON_ARRAY',
    }),
  })

  const text = await res.text()

  // HTML 응답이면 원문 반환
  if (text.trim().startsWith('<')) {
    throw new Error(`Databricks가 HTML을 반환했습니다 (HTTP ${res.status}). URL: ${url}, HOST: "${HOST}"`)
  }

  const data = JSON.parse(text)

  if (data.status?.state === 'FAILED') {
    throw new Error(`쿼리 실패: ${data.status?.error?.message}`)
  }

  const columns: string[] = data.manifest?.schema?.columns?.map((c: {name: string}) => c.name) || []
  const rows: string[][] = data.result?.data_array || []
  return { columns, rows: rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]]))) }
}

export async function GET() {
  // 환경변수 진단 정보 항상 포함
  const envInfo = {
    DATABRICKS_HOST_raw: RAW_HOST ? `"${RAW_HOST}" (${RAW_HOST.length}자)` : '❌ 미설정',
    DATABRICKS_HOST_cleaned: HOST ? `"${HOST}"` : '❌ 비어있음',
    DATABRICKS_TOKEN: TOKEN ? `설정됨 (${TOKEN.length}자)` : '❌ 미설정',
    DATABRICKS_HTTP_PATH: HTTP_PATH ? `"${HTTP_PATH}"` : '❌ 미설정',
    WAREHOUSE_ID: WAREHOUSE_ID,
  }

  try {
    if (!HOST || !TOKEN) {
      return NextResponse.json({
        error: 'Databricks 환경변수 없음 — Vercel 대시보드에서 확인하세요',
        envInfo,
      }, { status: 500 })
    }

    // 1. 테이블 목록
    const tables = await runSQL('SHOW TABLES IN greenribbon.claim')

    // 2. user 테이블 컬럼 목록
    const columns = await runSQL('DESCRIBE TABLE greenribbon.claim.user')

    // 3. 주요 컬럼 DISTINCT 값 (각 최대 50개)
    const userTypes    = await runSQL('SELECT DISTINCT user_type FROM user WHERE user_type IS NOT NULL LIMIT 50')
    const partnerTypes = await runSQL('SELECT DISTINCT partner_member_type FROM user WHERE partner_member_type IS NOT NULL LIMIT 50')
    const channels     = await runSQL('SELECT DISTINCT incoming_channel FROM user WHERE incoming_channel IS NOT NULL LIMIT 50')

    // 4. 전체 행 수
    const countResult  = await runSQL('SELECT COUNT(*) as total FROM user')

    return NextResponse.json({
      envInfo,
      tables: tables.rows,
      userTableColumns: columns.rows,
      distinctValues: {
        user_type: userTypes.rows.map(r => r.user_type),
        partner_member_type: partnerTypes.rows.map(r => r.partner_member_type),
        incoming_channel: channels.rows.map(r => r.incoming_channel),
      },
      totalUsers: countResult.rows[0]?.total,
    })
  } catch (err: unknown) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : '알 수 없는 오류',
      envInfo,
    }, { status: 500 })
  }
}
