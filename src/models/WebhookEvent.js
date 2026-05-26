const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const WebhookEvent = sequelize.define(
    "WebhookEvent",
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
        eventType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        payload: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        processed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // Unique key = paymentId + eventType to deduplicate webhook callbacks
        dedupKey: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
    },
    {
        tableName: "webhook_events",
        timestamps: true,
        indexes: [
            { fields: ["paymentId"] },
            { fields: ["dedupKey"], unique: true },
        ],
    }
);

module.exports = WebhookEvent;