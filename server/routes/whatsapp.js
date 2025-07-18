const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappMultiUserService');
const User = require('../models/User');
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

// Get selected groups for current user
router.get('/selected-groups', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            success: true,
            data: user.selectedGroups || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add group to selected for current user
router.post('/selected-groups/add', async (req, res) => {
    try {
        const { groupId, groupName } = req.body;

        if (!groupId || !groupName) {
            return res.status(400).json({
                success: false,
                message: 'Group ID and name are required'
            });
        }

        const user = await User.findById(req.user._id);

        // Check if group already selected
        const exists = user.selectedGroups.find(g => g.id === groupId);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'קבוצה כבר נבחרה'
            });
        }

        // Add group
        user.selectedGroups.push({
            id: groupId,
            name: groupName,
            addedAt: new Date(),
            enabled: true
        });

        await user.save();

        res.json({
            success: true,
            message: 'קבוצה נוספה בהצלחה',
            data: user.selectedGroups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Remove group from selected for current user
router.delete('/selected-groups/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;

        const user = await User.findById(req.user._id);
        const index = user.selectedGroups.findIndex(g => g.id === groupId);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'קבוצה לא נמצאה'
            });
        }

        const removedGroup = user.selectedGroups.splice(index, 1)[0];
        await user.save();

        res.json({
            success: true,
            message: 'קבוצה הוסרה בהצלחה',
            data: user.selectedGroups,
            removed: removedGroup
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Toggle group status for current user
router.patch('/selected-groups/:groupId/toggle', async (req, res) => {
    try {
        const { groupId } = req.params;

        const user = await User.findById(req.user._id);
        const group = user.selectedGroups.find(g => g.id === groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'קבוצה לא נמצאה'
            });
        }

        group.enabled = !group.enabled;
        await user.save();

        res.json({
            success: true,
            message: `קבוצה ${group.enabled ? 'הופעלה' : 'הושבתה'}`,
            data: user.selectedGroups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;