require("dotenv").config();
const express = require("express");
const { sequelize } = require("./models");
const authRoutes = require("./modules/auth/auth.routes");
const paymentRoutes = require("./modules/payment/payment.routes");
const errorHandler = require("./middleware/errorHandler");
const { startPaymentWorker } = require("./workers/payment.worker");
const { startWebhookWorker } = require("./workers/webhook.worker");
const logger = require("./utils/logger");

const app = express();

app.use(express.json());

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await sequelize.authenticate();
        logger.info("DB connected");

        startPaymentWorker();
        startWebhookWorker();

        app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
    } catch (err) {
        logger.error("Startup failed", { error: err.message });
        process.exit(1);
    }
};

start();