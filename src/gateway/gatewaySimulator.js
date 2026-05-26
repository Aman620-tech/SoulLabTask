const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

const FAILURE_RATE = parseFloat(process.env.GATEWAY_FAILURE_RATE) || 0.3;
const TIMEOUT_MS = parseInt(process.env.GATEWAY_TIMEOUT_MS) || 5000;

const simulateDelay = (min = 200, max = 1500) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((res) => setTimeout(res, ms));
};

const chargePayment = async ({ paymentId, amount, currency }) => {
    logger.info("Gateway: charge initiated", { paymentId, amount, currency });

    if (Math.random() < 0.1) {
        await simulateDelay(TIMEOUT_MS + 200, TIMEOUT_MS + 800);
        throw new Error("Gateway timeout: no response received");
    }

    await simulateDelay(200, 1500);

    if (Math.random() < FAILURE_RATE) {
        logger.warn("Gateway: charge declined", { paymentId });
        throw new Error("Gateway declined: card error or insufficient funds");
    }

    const gatewayRef = `GW-${uuidv4().toUpperCase().slice(0, 12)}`;
    logger.info("Gateway: charge success", { paymentId, gatewayRef });

    return { success: true, gatewayRef, message: "Charge successful" };
};

module.exports = { chargePayment };