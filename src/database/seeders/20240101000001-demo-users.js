"use strict";

const bcrypt = require("bcryptjs");

module.exports = {
    async up(queryInterface) {
        const hash = await bcrypt.hash("password123", 10);
        await queryInterface.bulkInsert("users", [
            {
                id: "11111111-1111-1111-1111-111111111111",
                name: "Aman pandey",
                email: "aman@example.com",
                password: hash,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "22222222-2222-2222-2222-222222222222",
                name: "Test User",
                email: "test@example.com",
                password: hash,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("users", null, {});
    },
};