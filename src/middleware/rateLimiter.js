const rateLimit = require("express-rate-limit");

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { success: false, message: "Too many requests — please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { paymentLimiter };