const sequelize = require("../config/db");
const User = require("./User");
const Payment = require("./Payment");
const PaymentLog = require("./PaymentLog");
const WebhookEvent = require("./WebhookEvent");

User.hasMany(Payment, { foreignKey: "userId", as: "payments" });
Payment.belongsTo(User, { foreignKey: "userId", as: "user" });

Payment.hasMany(PaymentLog, { foreignKey: "paymentId", as: "logs" });
PaymentLog.belongsTo(Payment, { foreignKey: "paymentId", as: "payment" });

Payment.hasMany(WebhookEvent, { foreignKey: "paymentId", as: "webhookEvents" });
WebhookEvent.belongsTo(Payment, { foreignKey: "paymentId", as: "payment" });

module.exports = { sequelize, User, Payment, PaymentLog, WebhookEvent };