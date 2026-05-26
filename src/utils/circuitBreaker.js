const CircuitBreaker = require("opossum");
const logger = require("./logger");

const defaultOptions = {
    timeout: parseInt(process.env.GATEWAY_TIMEOUT_MS) || 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,         
};

const createCircuitBreaker = (fn, options = {}) => {
    const breaker = new CircuitBreaker(fn, { ...defaultOptions, ...options });

    breaker.on("open", () => logger.warn("Circuit OPENED — gateway paused"));
    breaker.on("halfOpen", () => logger.info("Circuit HALF-OPEN — testing gateway"));
    breaker.on("close", () => logger.info("Circuit CLOSED — gateway healthy"));

    return breaker;
};

module.exports = { createCircuitBreaker };