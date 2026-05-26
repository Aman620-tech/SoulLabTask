const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define(
    "Payment",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: "INR",
        },
        status: {
            type: DataTypes.ENUM("PENDING", "PROCESSING", "SUCCESS", "FAILED"),
            defaultValue: "PENDING",
        },
        idempotencyKey: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        gatewayRef: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        retryCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        maxRetries: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
        },
        lastAttemptAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
    },
    {
        tableName: "payments",
        timestamps: true,
        indexes: [
            { fields: ["userId"] },
            { fields: ["status"] },
            { fields: ["idempotencyKey"], unique: true },
        ],
    }
);

module.exports = Payment;