"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.query = query;
exports.getClient = getClient;
const pg_1 = require("pg");
let pool = null;
function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('[db] DATABASE_URL is not set. Ensure .env is loaded before importing shared modules.');
        }
        pool = new pg_1.Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        pool.on('error', (err) => {
            console.error('[db] Unexpected pool error:', err.message);
        });
    }
    return pool;
}
async function query(sql, params) {
    const result = await getPool().query(sql, params);
    return result.rows;
}
async function getClient() {
    return getPool().connect();
}
//# sourceMappingURL=client.js.map