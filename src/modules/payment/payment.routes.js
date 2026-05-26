const express = require("express");
const router = express.Router();
const controller = require("./payment.controller");
const auth = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { paymentLimiter } = require("../../middleware/rateLimiter");
const { initiateSchema, webhookSchema } = require("./payment.validator");

// Protected payment routes
router.post("/", auth, paymentLimiter, validate(initiateSchema), controller.initiate);
router.get("/", auth, controller.list);
router.get("/:id", auth, controller.getOne);

// Webhook route — no auth (gateway calls this directly)
router.post("/webhooks/payment", validate(webhookSchema), controller.webhook);

module.exports = router;