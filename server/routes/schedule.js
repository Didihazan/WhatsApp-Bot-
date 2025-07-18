const express = require('express');
const router = express.Router();
const cronService = require('../services/cronService');
const fileStorage = require('../utils/fileStorage');

// Get schedule settings
router.get('/', async (req, res) => {
    try {
        const settings = await fileStorage.getSettings();
        const messages = await fileStorage.getMessages();

        res.json({
            success: true,
            data: {
                schedule: settings.schedule,
                dailyMessage: messages.dailyMessage,
                tasks: cronService.getScheduledTasks()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update schedule settings
router.put('/', async (req, res) => {
    try {
        const { enabled, timezone } = req.body;

        const settings = await fileStorage.getSettings();

        if (enabled !== undefined) {
            settings.schedule.enabled = enabled;
        }

        if (timezone) {
            settings.schedule.timezone = timezone;
        }

        settings.schedule.updatedAt = new Date().toISOString();
        await fileStorage.saveSettings(settings);

        // Restart cron service if enabled
        if (settings.schedule.enabled) {
            await cronService.setupDailyMessage();
        }

        res.json({
            success: true,
            message: 'Schedule settings updated successfully',
            data: settings.schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update daily message schedule
router.put('/daily', async (req, res) => {
    try {
        const { time, enabled } = req.body;

        if (!time) {
            return res.status(400).json({
                success: false,
                message: 'Time is required'
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

        const result = await cronService.updateDailyMessageSchedule(time, enabled);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
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

// Trigger daily message manually
router.post('/trigger', async (req, res) => {
    try {
        const result = await cronService.triggerDailyMessage();

        if (result.success) {
            res.json({
                success: true,
                message: result.message
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

// Get scheduled tasks status
router.get('/tasks', (req, res) => {
    try {
        const tasks = cronService.getScheduledTasks();
        res.json({
            success: true,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Debug cron status
router.get('/debug', async (req, res) => {
    try {
        const fileStorage = require('../utils/fileStorage');
        const messages = await fileStorage.getMessages();
        const settings = await fileStorage.getSettings();

        const now = new Date();
        const [hour, minute] = messages.dailyMessage.time.split(':');
        const cronPattern = `${minute} ${hour} * * *`;

        const nextRun = new Date();
        nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        res.json({
            success: true,
            data: {
                currentTime: now.toISOString(),
                currentTimeLocal: now.toLocaleString('he-IL', { timeZone: settings.schedule.timezone }),
                scheduledTime: messages.dailyMessage.time,
                cronPattern: cronPattern,
                nextRun: nextRun.toISOString(),
                nextRunLocal: nextRun.toLocaleString('he-IL', { timeZone: settings.schedule.timezone }),
                messageEnabled: messages.dailyMessage.enabled,
                scheduleEnabled: settings.schedule.enabled,
                timezone: settings.schedule.timezone,
                selectedGroups: settings.selectedGroups?.length || 0,
                activeTasks: cronService.getScheduledTasks().length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get next scheduled run times
router.get('/next-runs', async (req, res) => {
    try {
        const messages = await fileStorage.getMessages();
        const settings = await fileStorage.getSettings();

        if (!messages.dailyMessage.enabled || !settings.schedule.enabled) {
            return res.json({
                success: true,
                data: {
                    nextRun: null,
                    message: 'Daily message is disabled'
                }
            });
        }

        // Calculate next run time
        const [hour, minute] = messages.dailyMessage.time.split(':');
        const now = new Date();
        const nextRun = new Date();

        nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

        // If time has passed today, schedule for tomorrow
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        res.json({
            success: true,
            data: {
                nextRun: nextRun.toISOString(),
                timeUntilNext: nextRun.getTime() - now.getTime(),
                dailyTime: messages.dailyMessage.time,
                timezone: settings.schedule.timezone
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get available timezones
router.get('/timezones', (req, res) => {
    try {
        const timezones = [
            { value: 'Asia/Jerusalem', label: 'ישראל (Asia/Jerusalem)' },
            { value: 'Europe/London', label: 'לונדון (Europe/London)' },
            { value: 'America/New_York', label: 'ניו יורק (America/New_York)' },
            { value: 'America/Los_Angeles', label: 'לוס אנג\'לס (America/Los_Angeles)' },
            { value: 'Europe/Paris', label: 'פריז (Europe/Paris)' },
            { value: 'Asia/Tokyo', label: 'טוקיו (Asia/Tokyo)' },
            { value: 'Australia/Sydney', label: 'סידני (Australia/Sydney)' }
        ];

        res.json({
            success: true,
            data: timezones
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;