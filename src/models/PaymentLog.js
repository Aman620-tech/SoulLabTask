const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PaymentLog = sequelize.define(
    "PaymentLog",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        paymentId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        event: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        details: {
            type: DataTypes.JSONB,
            defaultValue: {},
        },
    },
    {
        tableName: "payment_logs",
        timestamps: true,
        updatedAt: false, 
        indexes: [{ fields: ["paymentId"] }],
    }
);

module.exports = PaymentLog;