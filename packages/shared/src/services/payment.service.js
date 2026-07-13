"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPayment = createPayment;
exports.getPaymentById = getPaymentById;
exports.listPayments = listPayments;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("../db/client");
const client_2 = require("../redis/client");
const webhookQueue_1 = require("../queues/webhookQueue");
// Idempotency keys expire after 24 hours — long enough to catch retries,
// short enough not to grow Redis indefinitely
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
function generateReference() {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = crypto_1.default.randomBytes(4).toString('hex').toUpperCase();
    return `PAY-${timestamp}-${suffix}`;
}
async function createPayment(input) {
    const redis = (0, client_2.getRedis)();
    const redisKey = `idempotency:payment:${input.idempotency_key}`;
    // Step 1: Hot-path idempotency check — Redis first, no DB touch
    const cached = await redis.get(redisKey);
    if (cached) {
        console.log(`[payment] Idempotency hit: ${input.idempotency_key}`);
        return JSON.parse(cached);
    }
    const client = await (0, client_1.getClient)();
    try {
        await client.query('BEGIN');
        // Step 2: Insert payment record
        const { rows: paymentRows } = await client.query(`INSERT INTO payments
        (idempotency_key, amount, currency, status, reference, description, metadata)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`, [
            input.idempotency_key,
            input.amount,
            input.currency ?? 'NGN',
            generateReference(),
            input.description ?? null,
            input.metadata ? input.metadata : null,
        ]);
        const payment = paymentRows[0];
        // Step 3: Find all active webhooks subscribed to payment.created
        const { rows: webhooks } = await client.query(`SELECT * FROM webhooks
       WHERE is_active = true
       AND events @> ARRAY['payment.created']::TEXT[]`);
        // Step 4: Insert a webhook_delivery record for each webhook —
        // inside the transaction so delivery records only exist if payment commits
        const deliveryJobData = [];
        for (const webhook of webhooks) {
            const payload = {
                event: 'payment.created',
                data: payment,
                timestamp: new Date().toISOString(),
            };
            const { rows: deliveryRows } = await client.query(`INSERT INTO webhook_deliveries
          (webhook_id, payment_id, event, payload, status)
         VALUES ($1, $2, 'payment.created', $3, 'pending')
         RETURNING id`, [webhook.id, payment.id, payload]);
            deliveryJobData.push({
                webhookDeliveryId: deliveryRows[0].id,
                webhookId: webhook.id,
                paymentId: payment.id,
                event: 'payment.created',
                payload,
                url: webhook.url,
                secret: webhook.secret,
            });
        }
        await client.query('COMMIT');
        // Step 5: Enqueue AFTER commit — DB records are now guaranteed to exist.
        // If enqueue fails after commit, the worker can recover via a sweep of
        // pending webhook_deliveries. This is the at-least-once delivery trade-off.
        const queue = (0, webhookQueue_1.getWebhookQueue)();
        for (const jobData of deliveryJobData) {
            await queue.add('deliver-webhook', jobData, {
                jobId: jobData.webhookDeliveryId, // idempotent job ID — prevents duplicate enqueue
            });
        }
        // Step 6: Cache the result in Redis — subsequent requests with same
        // idempotency key return this immediately without hitting the DB
        await redis.set(redisKey, JSON.stringify(payment), 'EX', IDEMPOTENCY_TTL_SECONDS);
        return payment;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        // Always release — otherwise the pool starves under concurrent load
        client.release();
    }
}
async function getPaymentById(id) {
    const pool = (0, client_1.getPool)();
    const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    return rows[0] ?? null;
}
async function listPayments(options) {
    const pool = (0, client_1.getPool)();
    const { limit = 20, offset = 0, status } = options;
    const conditions = [];
    const params = [];
    if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    params.push(offset);
    const { rows: payments } = await pool.query(`SELECT * FROM payments ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) as total FROM payments ${where}`, conditions.length ? params.slice(0, -2) : []);
    return {
        payments,
        total: parseInt(countRows[0].total, 10),
    };
}
//# sourceMappingURL=payment.service.js.map