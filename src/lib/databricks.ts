// Databricks SQL Statement Execution API via native fetch
// npm 패키지 불필요 — REST API 직접 호출

const DATABRICKS_HOST = process.env.DATABRICKS_HOST!;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN!;
const DATABRICKS_WAREHOUSE_ID =
  process.env.DATABRICKS_HTTP_PATH?.split('/').pop() || '4ab2c6c6c5d697b5';
const DATABRICKS_CATALOG = process.env.DATABRICKS_CATALOG || 'greenribbon';
const DATABRICKS_SCHEMA = process.env.DATABRICKS_SCHEMA || 'claim';

export interface DatabricksQueryResult {
  phoneNumbers: string[];
  totalCount: number;
}

export interface SegmentFilter {
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  region?: string;
  indication?: string;
  userType?: string;
  partnerMemberType?: string;
  incomingChannel?: string;
}

/** SQL 인젝션 방지용 문자열 이스케이프 */
function esc(val: string): string {
  return val.replace(/'/g, "''");
}

/** Databricks SQL Statement Execution API 호출 */
async function executeDatabricksStatement(sql: string): Promise<Record<string, string>[]> {
  const url = `https://${DATABRICKS_HOST}/api/2.0/sql/statements`;

  const body = {
    warehouse_id: DATABRICKS_WAREHOUSE_ID,
    catalog: DATABRICKS_CATALOG,
    schema: DATABRICKS_SCHEMA,
    statement: sql,
    wait_timeout: '30s',
    on_wait_timeout: 'CANCEL',
    disposition: 'INLINE',
    format: 'JSON_ARRAY',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DATABRICKS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Databricks API error ${response.status}: ${errText}`);
  }

  const result = await response.json();

  if (result.status?.state === 'FAILED') {
    throw new Error(`Query failed: ${result.status?.error?.message}`);
  }

  // 컬럼명과 row 데이터 매핑
  const columns: string[] =
    result.manifest?.schema?.columns?.map((c: { name: string }) => c.name) || [];
  const rows: string[][] = result.result?.data_array || [];

  return rows.map((row) =>
    Object.fromEntries(columns.map((col, idx) => [col, row[idx]]))
  );
}

/** 세그먼트 조건 → WHERE 절 생성 */
function buildWhereClause(filter: SegmentFilter): string {
  const conditions: string[] = ['phone_number IS NOT NULL'];

  if (filter.ageMin !== undefined) conditions.push(`age >= ${filter.ageMin}`);
  if (filter.ageMax !== undefined) conditions.push(`age <= ${filter.ageMax}`);
  if (filter.gender) conditions.push(`gender = '${esc(filter.gender)}'`);
  if (filter.region) conditions.push(`region LIKE '%${esc(filter.region)}%'`);
  if (filter.userType) conditions.push(`user_type = '${esc(filter.userType)}'`);
  if (filter.partnerMemberType)
    conditions.push(`partner_member_type = '${esc(filter.partnerMemberType)}'`);
  if (filter.incomingChannel)
    conditions.push(`incoming_channel = '${esc(filter.incomingChannel)}'`);

  return conditions.join(' AND ');
}

/** 세그먼트 조건으로 Databricks user 테이블 조회 — 전화번호 목록 반환 */
export async function queryUsersBySegment(
  filter: SegmentFilter
): Promise<DatabricksQueryResult> {
  const where = buildWhereClause(filter);
  const sql = `SELECT phone_number FROM user WHERE ${where} LIMIT 10000`;

  const rows = await executeDatabricksStatement(sql);
  const phoneNumbers = rows
    .map((r) => r.phone_number as string)
    .filter(Boolean);

  return { phoneNumbers, totalCount: phoneNumbers.length };
}

/** 세그먼트 조건에 해당하는 유저 수만 빠르게 조회 (카운트 전용) */
export async function countUsersBySegment(filter: SegmentFilter): Promise<number> {
  const where = buildWhereClause(filter);
  const sql = `SELECT COUNT(*) as cnt FROM user WHERE ${where}`;

  const rows = await executeDatabricksStatement(sql);
  return parseInt(rows[0]?.cnt ?? '0', 10);
}
