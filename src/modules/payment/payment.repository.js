const { Payment, PaymentLog, WebhookEvent, User } = require("../../models");
const { Op } = require("sequelize");

const createPayment = async ({ userId, amount, currency, idempotencyKey, metadata }, { transaction } = {}) => {
    return Payment.create(
        { userId, amount, currency, idempotencyKey, metadata },
        { transaction }
    );
};

const findPaymentById = async (id) => {
    return Payment.findOne({
        where: { id },
        include: [
            {
                model: PaymentLog,
                as: "logs",
                limit: 10,
                order: [["createdAt", "DESC"]],
            },
        ],
    });
};

const findByIdempotencyKey = async (key) => {
    return Payment.findOne({ where: { idempotencyKey: key } });
};

const updatePayment = async (id, data, { transaction } = {}) => {
    await Payment.update(data, { where: { id }, transaction });
    return Payment.findByPk(id);
};

const createLog = async (paymentId, event, details = {}, { transaction } = {}) => {
    return PaymentLog.create({ paymentId, event, details }, { transaction });
};

const listByUser = async (userId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const { rows: payments, count: total } = await Payment.findAndCountAll({
        where: { userId },
        attributes: ["id", "amount", "currency", "status", "retryCount", "createdAt", "updatedAt"],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    return { payments, total, page, limit };
};

const createWebhookEvent = async ({ paymentId, eventType, payload, dedupKey }) => {
    const existing = await WebhookEvent.findOne({ where: { dedupKey } });
    if (existing) return null; // Already stored — duplicate webhook

    return WebhookEvent.create({
        paymentId,
        eventType,
        payload,
        dedupKey,
        processed: false,
    });
};

const markWebhookProcessed = async (id, { transaction } = {}) => {
    return WebhookEvent.update({ processed: true }, { where: { id }, transaction });
};

module.exports = {
    createPayment,
    findPaymentById,
    findByIdempotencyKey,
    updatePayment,
    createLog,
    listByUser,
    createWebhookEvent,
    markWebhookProcessed,
};