const express = require('express');
const router = express.Router();
const fileStorage = require('../utils/fileStorage');

// Get all message data
router.get('/', async (req, res) => {
    try {
        const messages = await fileStorage.getMessages();
        res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get daily message settings
router.get('/daily', async (req, res) => {
    try {
        const messages = await fileStorage.getMessages();
        res.json({
            success: true,
            data: messages.dailyMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update daily message
router.put('/daily', async (req, res) => {
    try {
        const { text, time, enabled, imagePath } = req.body;

        if (!text || !time) {
            return res.status(400).json({
                success: false,
                message: 'Text and time are required'
            });
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format. Use HH:MM format'
            });
        }

        const messages = await fileStorage.getMessages();
        messages.dailyMessage = {
            text: text.trim(),
            time: time.trim(),
            enabled: enabled !== undefined ? enabled : messages.dailyMessage.enabled,
            imagePath: imagePath || null,
            updatedAt: new Date().toISOString()
        };

        await fileStorage.saveMessages(messages);

        res.json({
            success: true,
            message: 'Daily message updated successfully',
            data: messages.dailyMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Toggle daily message status
router.patch('/daily/toggle', async (req, res) => {
    try {
        const messages = await fileStorage.getMessages();
        messages.dailyMessage.enabled = !messages.dailyMessage.enabled;
        messages.dailyMessage.updatedAt = new Date().toISOString();

        await fileStorage.saveMessages(messages);

        res.json({
            success: true,
            message: `Daily message ${messages.dailyMessage.enabled ? 'enabled' : 'disabled'}`,
            data: messages.dailyMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get sent messages history
router.get('/history', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const messages = await fileStorage.getMessages();

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);

        const paginatedMessages = messages.sentMessages
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(startIndex, endIndex);

        res.json({
            success: true,
            data: {
                messages: paginatedMessages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: messages.sentMessages.length,
                    pages: Math.ceil(messages.sentMessages.length / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Clear sent messages history
router.delete('/history', async (req, res) => {
    try {
        const messages = await fileStorage.getMessages();
        messages.sentMessages = [];
        await fileStorage.saveMessages(messages);

        res.json({
            success: true,
            message: 'Message history cleared successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get message statistics
router.get('/stats', async (req, res) => {
    try {
        const messages = await fileStorage.getMessages();
        const sentMessages = messages.sentMessages;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = {
            total: sentMessages.length,
            successful: sentMessages.filter(m => m.status === 'sent').length,
            failed: sentMessages.filter(m => m.status === 'failed').length,
            today: sentMessages.filter(m => new Date(m.timestamp) >= today).length,
            thisWeek: sentMessages.filter(m => new Date(m.timestamp) >= thisWeek).length,
            thisMonth: sentMessages.filter(m => new Date(m.timestamp) >= thisMonth).length,
            dailyMessageEnabled: messages.dailyMessage.enabled,
            lastSent: sentMessages.length > 0 ? sentMessages[sentMessages.length - 1].timestamp : null
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Message templates (preset messages)
router.get('/templates', async (req, res) => {
    try {
        const templates = [
            {
                id: '1',
                name: 'בוקר טוב',
                text: 'בוקר טוב! 🌅 יום נפלא!',
                category: 'greeting'
            },
            {
                id: '2',
                name: 'תזכורת פגישה',
                text: 'היי! רק תזכורת לפגישה שלנו היום 📅',
                category: 'reminder'
            },
            {
                id: '3',
                name: 'חג שמח',
                text: 'חג שמח ומבורך! 🎉✨',
                category: 'holiday'
            },
            {
                id: '4',
                name: 'שבת שלום',
                text: 'שבת שלום ומנוחה! 🕯️',
                category: 'weekly'
            }
        ];

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;