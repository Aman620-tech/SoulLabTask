"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("webhook_events", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            paymentId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: "payments", key: "id" },
                onDelete: "CASCADE",
            },
            eventType: { type: Sequelize.STRING, allowNull: false },
            payload: { type: Sequelize.JSONB, allowNull: false },
            processed: { type: Sequelize.BOOLEAN, defaultValue: false },
            dedupKey: { type: Sequelize.STRING, allowNull: false, unique: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex("webhook_events", ["paymentId"]);
        await queryInterface.addIndex("webhook_events", ["dedupKey"], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("webhook_events");
    },
};