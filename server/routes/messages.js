const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Get all message data for current user
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            success: true,
            data: {
                dailyMessage: user.dailyMessage,
                sentMessages: user.sentMessages || []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get daily message settings for current user
router.get('/daily', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            success: true,
            data: user.dailyMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update daily message for current user
router.put('/daily', async (req, res) => {
    try {
        const { text, time, enabled, imagePath } = req.body;

        console.log('📝 Updating daily message for user:', req.user.username);
        console.log('  Text:', text);
        console.log('  Time:', time);
        console.log('  Enabled:', enabled);
        console.log('  Image Path:', imagePath);

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

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                'dailyMessage.text': text.trim(),
                'dailyMessage.time': time.trim(),
                'dailyMessage.enabled': enabled !== undefined ? enabled : req.user.dailyMessage.enabled,
                'dailyMessage.imagePath': imagePath || null
            },
            { new: true }
        );

        console.log('💾 Saved daily message:', updatedUser.dailyMessage);

        res.json({
            success: true,
            message: 'Daily message updated successfully',
            data: updatedUser.dailyMessage
        });
    } catch (error) {
        console.error('❌ Error updating daily message:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Toggle daily message status for current user
router.patch('/daily/toggle', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                'dailyMessage.enabled': !user.dailyMessage.enabled
            },
            { new: true }
        );

        res.json({
            success: true,
            message: `Daily message ${updatedUser.dailyMessage.enabled ? 'enabled' : 'disabled'}`,
            data: updatedUser.dailyMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get sent messages history for current user
router.get('/history', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const user = await User.findById(req.user._id);

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);

        const paginatedMessages = (user.sentMessages || [])
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(startIndex, endIndex);

        res.json({
            success: true,
            data: {
                messages: paginatedMessages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: user.sentMessages?.length || 0,
                    pages: Math.ceil((user.sentMessages?.length || 0) / limit)
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

// Clear sent messages history for current user
router.delete('/history', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            sentMessages: []
        });

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

// Get message statistics for current user
router.get('/stats', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const sentMessages = user.sentMessages || [];

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
            dailyMessageEnabled: user.dailyMessage.enabled,
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