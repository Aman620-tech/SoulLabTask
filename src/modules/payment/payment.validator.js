const Joi = require("joi");

const initiateSchema = Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).uppercase().default("INR"),
    idempotencyKey: Joi.string().min(8).max(128).required(),
    metadata: Joi.object().optional(),
});

const webhookSchema = Joi.object({
    paymentId: Joi.string().uuid().required(),
    eventType: Joi.string().valid("payment.success", "payment.failed").required(),
    payload: Joi.object().required(),
});

module.exports = { initiateSchema, webhookSchema };