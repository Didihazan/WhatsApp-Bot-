const express = require('express');
const router = express.Router();
const cronService = require('../services/cronService');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Get schedule settings for current user
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            success: true,
            data: {
                schedule: user.schedule,
                dailyMessage: user.dailyMessage,
                tasks: cronService.getScheduledTasks().filter(task => task.userId === req.user._id.toString())
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update schedule settings for current user
router.put('/', async (req, res) => {
    try {
        const { enabled, timezone } = req.body;

        const updateData = {};
        if (enabled !== undefined) {
            updateData['schedule.enabled'] = enabled;
        }
        if (timezone) {
            updateData['schedule.timezone'] = timezone;
        }

        const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

        // Restart cron service for this user if enabled
        if (user.schedule.enabled && user.dailyMessage.enabled) {
            await cronService.restartUserCron(req.user._id);
        } else {
            cronService.removeCronTask(req.user._id);
        }

        res.json({
            success: true,
            message: 'Schedule settings updated successfully',
            data: user.schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update daily message schedule for current user
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

        const result = await cronService.updateDailyMessageSchedule(req.user._id, time, enabled);

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

// Trigger daily message manually for current user
router.post('/trigger', async (req, res) => {
    try {
        const result = await cronService.triggerDailyMessageForUser(req.user._id);

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

// Get scheduled tasks status for current user
router.get('/tasks', (req, res) => {
    try {
        const allTasks = cronService.getScheduledTasks();
        const userTasks = allTasks.filter(task => task.userId === req.user._id.toString());

        res.json({
            success: true,
            data: userTasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Debug cron status for current user
router.get('/debug', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const now = new Date();
        const [hour, minute] = user.dailyMessage.time.split(':');
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
                currentTimeLocal: now.toLocaleString('he-IL', { timeZone: user.schedule.timezone }),
                scheduledTime: user.dailyMessage.time,
                cronPattern: cronPattern,
                nextRun: nextRun.toISOString(),
                nextRunLocal: nextRun.toLocaleString('he-IL', { timeZone: user.schedule.timezone }),
                messageEnabled: user.dailyMessage.enabled,
                scheduleEnabled: user.schedule.enabled,
                timezone: user.schedule.timezone,
                selectedGroups: user.selectedGroups?.length || 0,
                activeTasks: cronService.getScheduledTasks().filter(task => task.userId === req.user._id.toString()).length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get next scheduled run times for current user
router.get('/next-runs', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.dailyMessage.enabled || !user.schedule.enabled) {
            return res.json({
                success: true,
                data: {
                    nextRun: null,
                    message: 'Daily message is disabled'
                }
            });
        }

        // Calculate next run time
        const [hour, minute] = user.dailyMessage.time.split(':');
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
                dailyTime: user.dailyMessage.time,
                timezone: user.schedule.timezone
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