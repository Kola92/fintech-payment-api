import { Pool, PoolClient } from 'pg';
export declare function getPool(): Pool;
export declare function query<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
export declare function getClient(): Promise<PoolClient>;
//# sourceMappingURL=client.d.ts.map