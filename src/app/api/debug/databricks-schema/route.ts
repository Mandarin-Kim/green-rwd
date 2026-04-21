import { NextResponse } from 'next/server'

/**
 * GET /api/debug/databricks-schema
 * Databricks 테이블 구조 및 실제 컬럼 값 확인용 (임시 진단 API)
 */

const HOST = process.env.DATABRICKS_HOST!
const TOKEN = process.env.DATABRICKS_TOKEN!
const WAREHOUSE_ID = process.env.DATABRICKS_HTTP_PATH?.split('/').pop() || '4ab2c6c6c5d697b5'

async function runSQL(sql: string) {
  const res = await fetch(`https://${HOST}/api/2.0/sql/statements`, {
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
  const data = await res.json()
  const columns: string[] = data.manifest?.schema?.columns?.map((c: {name: string}) => c.name) || []
  const rows: string[][] = data.result?.data_array || []
  return { columns, rows: rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]]))) }
}

export async function GET() {
  try {
    if (!HOST || !TOKEN) {
      return NextResponse.json({ error: 'Databricks 환경변수 없음' }, { status: 500 })
    }

    // 1. 테이블 목록
    const tables = await runSQL('SHOW TABLES IN greenribbon.claim')

    // 2. user 테이블 컬럼 목록
    const columns = await runSQL('DESCRIBE TABLE greenribbon.claim.user')

    // 3. 주요 컬럼 DISTINCT 값 (각 최대 50개)
    const userTypes        = await runSQL('SELECT DISTINCT user_type FROM user WHERE user_type IS NOT NULL LIMIT 50')
    const partnerTypes     = await runSQL('SELECT DISTINCT partner_member_type FROM user WHERE partner_member_type IS NOT NULL LIMIT 50')
    const channels         = await runSQL('SELECT DISTINCT incoming_channel FROM user WHERE incoming_channel IS NOT NULL LIMIT 50')

    // 4. 전체 행 수
    const countResult      = await runSQL('SELECT COUNT(*) as total FROM user')

    return NextResponse.json({
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
    }, { status: 500 })
  }
}
