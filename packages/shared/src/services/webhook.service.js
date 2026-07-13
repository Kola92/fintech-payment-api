"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebhook = registerWebhook;
exports.listWebhooks = listWebhooks;
exports.getWebhookById = getWebhookById;
exports.deleteWebhook = deleteWebhook;
exports.getDeliveriesForPayment = getDeliveriesForPayment;
exports.getDeliveryById = getDeliveryById;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("../db/client");
async function registerWebhook(input) {
    const pool = (0, client_1.getPool)();
    const secret = crypto_1.default.randomBytes(32).toString('hex');
    const { rows } = await pool.query(`INSERT INTO webhooks (url, events, secret, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING *`, [input.url, input.events, secret]);
    return rows[0];
}
async function listWebhooks() {
    const pool = (0, client_1.getPool)();
    const { rows } = await pool.query('SELECT * FROM webhooks ORDER BY created_at DESC');
    return rows;
}
async function getWebhookById(id) {
    const pool = (0, client_1.getPool)();
    const { rows } = await pool.query('SELECT * FROM webhooks WHERE id = $1', [id]);
    return rows[0] ?? null;
}
async function deleteWebhook(id) {
    const pool = (0, client_1.getPool)();
    const { rowCount } = await pool.query('DELETE FROM webhooks WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
}
async function getDeliveriesForPayment(paymentId) {
    const pool = (0, client_1.getPool)();
    // Cast JSONB payload explicitly — pg driver returns JSONB as parsed object
    // but only when selected directly. Explicit cast ensures consistent behaviour.
    const { rows } = await pool.query(`SELECT
       id, webhook_id, payment_id, event,
       payload::jsonb as payload,
       status, attempt_count, last_attempt_at,
       next_attempt_at, delivered_at, error_message, created_at
     FROM webhook_deliveries
     WHERE payment_id = $1
     ORDER BY created_at DESC`, [paymentId]);
    return rows;
}
async function getDeliveryById(id) {
    const pool = (0, client_1.getPool)();
    const { rows } = await pool.query(`SELECT
       id, webhook_id, payment_id, event,
       payload::jsonb as payload,
       status, attempt_count, last_attempt_at,
       next_attempt_at, delivered_at, error_message, created_at
     FROM webhook_deliveries
     WHERE id = $1`, [id]);
    return rows[0] ?? null;
}
//# sourceMappingURL=webhook.service.js.map