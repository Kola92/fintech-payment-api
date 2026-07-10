import { Pool } from 'pg';

// Module-level singleton — Node's module cache ensures this is
// instantiated exactly once per process lifetime
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,              // max concurrent connections in the pool
      idleTimeoutMillis: 30000,   // close idle connections after 30s
      connectionTimeoutMillis: 5000, // fail fast if no connection available in 5s
    });

    // Surface connection errors — without this, pool errors are silent
    pool.on('error', (err) => {
      console.error('[db] Unexpected pool error:', err.message);
      process.exit(1);
    });
  }

  return pool;
}

// Convenience wrapper — services call query() directly without
// importing Pool or managing connection checkout/release manually
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

// For explicit transactions — caller gets the client, manages
// BEGIN/COMMIT/ROLLBACK, then must release back to pool
export async function getClient() {
  const client = await getPool().connect();
  return client;
}
