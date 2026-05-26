const sequelize = require("../../config/db");
const repo = require("./payment.repository");
const { acquireLock, releaseLock } = require("../../utils/lock");
const { setIdempotencyResult, getIdempotencyResult } = require("../../utils/idempotency");
const { paymentQueue, webhookQueue } = require("../../config/queue");
const logger = require("../../utils/logger");

const initiatePayment = async ({ userId, amount, currency, idempotencyKey, metadata }) => {
    const cached = await getIdempotencyResult(idempotencyKey);
    if (cached) return cached;

    const existing = await repo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
        await setIdempotencyResult(idempotencyKey, existing.toJSON());
        return existing;
    }

    const payment = await sequelize.transaction(async (t) => {
        const p = await repo.createPayment(
            { userId, amount, currency, idempotencyKey, metadata },
            { transaction: t }
        );
        await repo.createLog(p.id, "PAYMENT_INITIATED", { amount, currency }, { transaction: t });
        return p;
    });

    await paymentQueue.add(
        "process-payment",
        { paymentId: payment.id },
        {
            attempts: parseInt(process.env.MAX_RETRIES) || 3,
            backoff: {
                type: "exponential",
                delay: parseInt(process.env.RETRY_BASE_DELAY_MS) || 1000,
            },
            removeOnComplete: false,
            removeOnFail: false,
        }
    );

    logger.info("Payment initiated and enqueued", { paymentId: payment.id });

    await setIdempotencyResult(idempotencyKey, payment.toJSON());

    return payment;
};

const getPayment = async (paymentId, userId) => {
    const payment = await repo.findPaymentById(paymentId);
    if (!payment) throw Object.assign(new Error("Payment not found"), { status: 404 });
    if (payment.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });
    return payment;
};

const listPayments = async (userId, page, limit) => {
    return repo.listByUser(userId, page, limit);
};

const handleWebhook = async ({ paymentId, eventType, payload }) => {
    const dedupKey = `${paymentId}:${eventType}`;

    const event = await repo.createWebhookEvent({ paymentId, eventType, payload, dedupKey });

    if (!event) {
        logger.warn("Duplicate webhook received — skipped", { paymentId, eventType });
        return { duplicate: true };
    }

    await webhookQueue.add("process-webhook", { webhookEventId: event.id });

    logger.info("Webhook enqueued", { paymentId, eventType, webhookId: event.id });
    return { received: true, webhookEventId: event.id };
};

module.exports = { initiatePayment, getPayment, listPayments, handleWebhook };