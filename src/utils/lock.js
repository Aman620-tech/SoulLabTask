const redis = require("../config/redis");
const logger = require("./logger");

const LOCK_TTL = parseInt(process.env.PAYMENT_LOCK_TTL) || 30;

const acquireLock = async (paymentId) => {
    const result = await redis.set(
        `lock:payment:${paymentId}`,
        "locked",
        "NX",
        "EX",
        LOCK_TTL
    );
    const acquired = result === "OK";
    if (!acquired) logger.warn("Lock already held", { paymentId });
    return acquired;
};

const releaseLock = async (paymentId) => {
    await redis.del(`lock:payment:${paymentId}`);
    logger.debug("Lock released", { paymentId });
};

module.exports = { acquireLock, releaseLock };