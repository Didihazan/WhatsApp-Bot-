const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// Get WhatsApp status
router.get('/status', (req, res) => {
    try {
        const status = whatsappService.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Connect to WhatsApp
router.post('/connect', async (req, res) => {
    try {
        const result = await whatsappService.connect();

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: whatsappService.getStatus()
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Disconnect from WhatsApp
router.post('/disconnect', async (req, res) => {
    try {
        const result = await whatsappService.disconnect();

        res.json({
            success: result.success,
            message: result.message,
            data: whatsappService.getStatus()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Send single message
router.post('/send', async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }

        const result = await whatsappService.sendMessage(phone, message);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Send message to multiple contacts
router.post('/send-multiple', async (req, res) => {
    try {
        const { contacts, message } = req.body;

        if (!contacts || !Array.isArray(contacts) || !message) {
            return res.status(400).json({
                success: false,
                message: 'Contacts array and message are required'
            });
        }

        const results = await whatsappService.sendMessageToMultiple(contacts, message);

        res.json({
            success: true,
            message: 'Messages sent',
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get WhatsApp groups
router.get('/groups', async (req, res) => {
    try {
        const groups = await whatsappService.getGroups();

        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Refresh groups (force reload)
router.post('/groups/refresh', async (req, res) => {
    try {
        await whatsappService.loadGroups();
        const groups = await whatsappService.getGroups();

        res.json({
            success: true,
            message: 'Groups refreshed successfully',
            data: groups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Send message to group
router.post('/send-group', async (req, res) => {
    try {
        const { groupId, message, imagePath } = req.body;

        console.log('📥 Received send-group request:');
        console.log('  Group ID:', groupId);
        console.log('  Message:', message);
        console.log('  Image Path:', imagePath);

        if (!groupId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Group ID and message are required'
            });
        }

        const result = await whatsappService.sendMessageToGroup(groupId, message, imagePath);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('❌ Send-group error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;