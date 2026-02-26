"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const router = (0, express_1.Router)();
// GET /api/nodes – list all mesh nodes
router.get('/', (_req, res) => {
    // Refresh "lastSeen" for ONLINE nodes to simulate live network
    store_1.nodes.forEach(node => {
        if (node.status === 'ONLINE') {
            node.lastSeen = new Date().toISOString();
        }
    });
    res.json(store_1.nodes);
});
exports.default = router;
