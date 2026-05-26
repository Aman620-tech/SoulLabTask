// Redis-backed idempotency layer.
// Before processing a payment, we check if the idempotency key was already
// handled and return the cached result — preventing double charges on retries.

const redis = require("../config/redis");
const logger = require("./logger");

const TTL = 86400; // 24 hours


const setIdempotencyResult = async (key, result) => {
    await redis.set(`idempotency:${key}`, JSON.stringify(result), "EX", TTL);
};

const getIdempotencyResult = async (key) => {
    const cached = await redis.get(`idempotency:${key}`);
    if (cached) {
        logger.info("Idempotency hit", { key });
        return JSON.parse(cached);
    }
    return null;
};

module.exports = { setIdempotencyResult, getIdempotencyResult };