const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Get WhatsApp status for current user
router.get('/status', (req, res) => {
    try {
        const status = whatsappService.getStatus(req.user._id);
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

// Connect to WhatsApp for current user
router.post('/connect', async (req, res) => {
    try {
        const result = await whatsappService.connect(req.user._id);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: whatsappService.getStatus(req.user._id)
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

// Disconnect from WhatsApp for current user
router.post('/disconnect', async (req, res) => {
    try {
        const result = await whatsappService.disconnect(req.user._id);

        res.json({
            success: result.success,
            message: result.message,
            data: whatsappService.getStatus(req.user._id)
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

        const result = await whatsappService.sendMessage(req.user._id, phone, message);

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

// Get WhatsApp groups for current user
router.get('/groups', async (req, res) => {
    try {
        const groups = await whatsappService.getGroups(req.user._id);

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

// Refresh groups (force reload) for current user
router.post('/groups/refresh', async (req, res) => {
    try {
        await whatsappService.loadGroups(req.user._id);
        const groups = await whatsappService.getGroups(req.user._id);

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
        console.log('  User:', req.user.username);
        console.log('  Group ID:', groupId);
        console.log('  Message:', message);
        console.log('  Image Path:', imagePath);

        if (!groupId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Group ID and message are required'
            });
        }

        const result = await whatsappService.sendMessageToGroup(req.user._id, groupId, message, imagePath);

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