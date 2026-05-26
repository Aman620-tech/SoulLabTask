const { Worker } = require("bullmq");
const sequelize = require("../config/db");
const repo = require("../modules/payment/payment.repository");
const { chargePayment } = require("../gateway/gatewaySimulator");
const { createCircuitBreaker } = require("../utils/circuitBreaker");
const { acquireLock, releaseLock } = require("../utils/lock");
const logger = require("../utils/logger");

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
};

const gatewayBreaker = createCircuitBreaker(chargePayment);

const processPaymentJob = async (job) => {
    const { paymentId } = job.data;
    logger.info("Worker: processing payment", { paymentId, attempt: job.attemptsMade + 1 });

    const locked = await acquireLock(paymentId);
    if (!locked) {
        logger.warn("Worker: payment already being processed", { paymentId });
        throw new Error("Payment locked — retry later");
    }

    try {
        const payment = await repo.findPaymentById(paymentId);
        if (!payment) throw new Error(`Payment ${paymentId} not found`);

        if (payment.status === "SUCCESS" || payment.status === "FAILED") {
            logger.info("Worker: payment already in terminal state — skipping", {
                paymentId,
                status: payment.status,
            });
            return;
        }

        await sequelize.transaction(async (t) => {
            await repo.updatePayment(
                paymentId,
                { status: "PROCESSING", lastAttemptAt: new Date(), retryCount: payment.retryCount + 1 },
                { transaction: t }
            );
            await repo.createLog(
                paymentId,
                "PAYMENT_PROCESSING",
                { attempt: job.attemptsMade + 1 },
                { transaction: t }
            );
        });

        const result = await gatewayBreaker.fire({
            paymentId,
            amount: payment.amount,
            currency: payment.currency,
        });

        await sequelize.transaction(async (t) => {
            await repo.updatePayment(
                paymentId,
                { status: "SUCCESS", gatewayRef: result.gatewayRef },
                { transaction: t }
            );
            await repo.createLog(
                paymentId,
                "PAYMENT_SUCCESS",
                { gatewayRef: result.gatewayRef },
                { transaction: t }
            );
        });

        logger.info("Worker: payment succeeded", { paymentId, gatewayRef: result.gatewayRef });
    } catch (err) {
        logger.error("Worker: payment attempt failed", { paymentId, error: err.message });

        const payment = await repo.findPaymentById(paymentId);
        const isLastAttempt = job.attemptsMade + 1 >= job.opts.attempts;

        if (isLastAttempt) {
            await sequelize.transaction(async (t) => {
                await repo.updatePayment(
                    paymentId,
                    { status: "FAILED" },
                    { transaction: t }
                );
                await repo.createLog(
                    paymentId,
                    "PAYMENT_FAILED",
                    { reason: err.message, finalAttempt: true },
                    { transaction: t }
                );
            });
            logger.error("Worker: payment permanently failed", { paymentId });
        } else {
            await repo.createLog(paymentId, "PAYMENT_RETRY_SCHEDULED", {
                reason: err.message,
                nextAttempt: job.attemptsMade + 2,
            });
        }

        throw err; 
    } finally {
        await releaseLock(paymentId);
    }
};

const startPaymentWorker = () => {
    const worker = new Worker("payment-processing", processPaymentJob, {
        connection,
        concurrency: 5, // Process up to 5 payments simultaneously
    });

    worker.on("completed", (job) =>
        logger.info("Job completed", { jobId: job.id })
    );
    worker.on("failed", (job, err) =>
        logger.error("Job failed", { jobId: job.id, error: err.message })
    );

    logger.info("Payment worker started");
    return worker;
};

module.exports = { startPaymentWorker };