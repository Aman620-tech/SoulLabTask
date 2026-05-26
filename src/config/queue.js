const { Queue } = require("bullmq");

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
};

const paymentQueue = new Queue("payment-processing", { connection });

const webhookQueue = new Queue("webhook-processing", { connection });

module.exports = { paymentQueue, webhookQueue };