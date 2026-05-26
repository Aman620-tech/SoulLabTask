"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("payments", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: "users", key: "id" },
                onDelete: "CASCADE",
            },
            amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
            currency: { type: Sequelize.STRING(10), defaultValue: "INR" },
            status: {
                type: Sequelize.ENUM("PENDING", "PROCESSING", "SUCCESS", "FAILED"),
                defaultValue: "PENDING",
            },
            idempotencyKey: { type: Sequelize.STRING, allowNull: false, unique: true },
            gatewayRef: { type: Sequelize.STRING, allowNull: true },
            retryCount: { type: Sequelize.INTEGER, defaultValue: 0 },
            maxRetries: { type: Sequelize.INTEGER, defaultValue: 3 },
            lastAttemptAt: { type: Sequelize.DATE, allowNull: true },
            metadata: { type: Sequelize.JSONB, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex("payments", ["userId"]);
        await queryInterface.addIndex("payments", ["status"]);
        await queryInterface.addIndex("payments", ["idempotencyKey"], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("payments");
    },
};