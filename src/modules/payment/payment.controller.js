const service = require("./payment.service");
const logger = require("../../utils/logger");

const initiate = async (req, res, next) => {
    try {
        const { amount, currency, idempotencyKey, metadata } = req.body;
        const payment = await service.initiatePayment({
            userId: req.user.id,
            amount,
            currency,
            idempotencyKey,
            metadata,
        });
        res.status(202).json({ success: true, data: payment });
    } catch (err) {
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const payment = await service.getPayment(req.params.id, req.user.id);
        res.json({ success: true, data: payment });
    } catch (err) {
        next(err);
    }
};

const list = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await service.listPayments(req.user.id, page, limit);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

const webhook = async (req, res, next) => {
    try {
        const { paymentId, eventType, payload } = req.body;
        const result = await service.handleWebhook({ paymentId, eventType, payload });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

module.exports = { initiate, getOne, list, webhook };