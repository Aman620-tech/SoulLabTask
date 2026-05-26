"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("payment_logs", {
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
            event: { type: Sequelize.STRING, allowNull: false },
            details: { type: Sequelize.JSONB, defaultValue: {} },
            createdAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex("payment_logs", ["paymentId"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("payment_logs");
    },
};