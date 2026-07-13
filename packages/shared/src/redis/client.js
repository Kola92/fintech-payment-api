"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
function getRedis() {
    if (!redisClient) {
        redisClient = new ioredis_1.default(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        });
        redisClient.on('connect', () => {
            console.log('[redis] Connected');
        });
        redisClient.on('error', (err) => {
            console.error('[redis] Client error:', err.message);
        });
    }
    return redisClient;
}
//# sourceMappingURL=client.js.map