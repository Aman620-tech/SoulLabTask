const { Worker } = require("bullmq");
const sequelize = require("../config/db");
const { WebhookEvent, Payment } = require("../models");
const repo = require("../modules/payment/payment.repository");
const logger = require("../utils/logger");

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
};


const processWebhookJob = async (job) => {
    const { webhookEventId } = job.data;

    // Fetch the raw webhook event
    const event = await WebhookEvent.findByPk(webhookEventId);
    if (!event) {
        logger.warn("Webhook event not found", { webhookEventId });
        return;
    }

    if (event.processed) {
        logger.info("Webhook already processed — skipping", { webhookEventId });
        return;
    }

    const payment = await repo.findPaymentById(event.paymentId);
    if (!payment) {
        logger.warn("Payment not found for webhook", { paymentId: event.paymentId });
        return;
    }

    const { eventType, payload } = event;

    await sequelize.transaction(async (t) => {
        // Resolve conflicting states: don't overwrite SUCCESS with FAILED or vice versa
        // Only update if payment is not already in a terminal state
        if (payment.status !== "SUCCESS" && payment.status !== "FAILED") {
            if (eventType === "payment.success") {
                await repo.updatePayment(
                    payment.id,
                    { status: "SUCCESS", gatewayRef: payload.gatewayRef || null },
                    { transaction: t }
                );
                await repo.createLog(payment.id, "WEBHOOK_SUCCESS_APPLIED", payload, { transaction: t });
            } else if (eventType === "payment.failed") {
                await repo.updatePayment(
                    payment.id,
                    { status: "FAILED" },
                    { transaction: t }
                );
                await repo.createLog(payment.id, "WEBHOOK_FAILURE_APPLIED", payload, { transaction: t });
            }
        } else {
            // Log that we received a conflicting/late webhook but didn't change state
            logger.warn("Webhook received but payment already in terminal state", {
                paymentId: payment.id,
                currentStatus: payment.status,
                webhookEvent: eventType,
            });
            await repo.createLog(
                payment.id,
                "WEBHOOK_IGNORED_TERMINAL_STATE",
                { reason: "Payment already terminal", currentStatus: payment.status, eventType },
                { transaction: t }
            );
        }

        // Always mark webhook as processed to prevent reprocessing
        await repo.markWebhookProcessed(event.id, { transaction: t });
    });

    logger.info("Webhook processed", { webhookEventId, eventType, paymentId: payment.id });
};

const startWebhookWorker = () => {
    const worker = new Worker("webhook-processing", processWebhookJob, {
        connection,
        concurrency: 10,
    });

    worker.on("completed", (job) =>
        logger.info("Webhook job completed", { jobId: job.id })
    );
    worker.on("failed", (job, err) =>
        logger.error("Webhook job failed", { jobId: job?.id, error: err.message })
    );

    logger.info("Webhook worker started");
    return worker;
};

module.exports = { startWebhookWorker };