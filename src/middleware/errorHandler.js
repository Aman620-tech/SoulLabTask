const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    logger.error("Unhandled error", {
        message: err.message,
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });

    res.status(status).json({
        success: false,
        message: status === 500 ? "Internal server error" : err.message,
    });
};

module.exports = errorHandler;