const cron = require('node-cron');
const whatsappService = require('./whatsappMultiUserService');
const User = require('../models/User');

class CronService {
    constructor() {
        this.tasks = new Map(); // userId -> cron task
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) {
            console.log('Cron service already initialized');
            return;
        }

        this.setupDailyMessagesForAllUsers();
        this.isInitialized = true;
        console.log('✅ Cron service initialized');
    }

    async setupDailyMessagesForAllUsers() {
        try {
            console.log('🔧 Setting up daily messages for all users...');

            // Get all active users with enabled daily messages
            const users = await User.find({
                isActive: true,
                'dailyMessage.enabled': true,
                'schedule.enabled': true
            });

            console.log(`📊 Found ${users.length} users with active daily messages`);

            for (const user of users) {
                await this.setupDailyMessageForUser(user._id);
            }

        } catch (error) {
            console.error('❌ Error setting up daily messages for all users:', error.message);
        }
    }

    async setupDailyMessageForUser(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                console.log(`❌ User ${userId} not found`);
                return;
            }

            console.log(`🔧 Setting up daily message for user: ${user.username}`);
            console.log(`📅 Message enabled: ${user.dailyMessage.enabled}`);
            console.log(`⚙️ Schedule enabled: ${user.schedule.enabled}`);
            console.log(`⏰ Time: ${user.dailyMessage.time}`);
            console.log(`🌍 Timezone: ${user.schedule.timezone}`);

            if (!user.dailyMessage.enabled || !user.schedule.enabled) {
                console.log(`📅 Daily message is disabled for user: ${user.username}`);
                this.removeCronTask(userId);
                return;
            }

            // Parse time (format: "HH:MM")
            const [hour, minute] = user.dailyMessage.time.split(':');
            const cronPattern = `${minute} ${hour} * * *`; // Every day at specified time

            console.log(`🕐 Cron pattern for ${user.username}: ${cronPattern}`);
            console.log(`📝 Translated: Every day at ${hour}:${minute}`);

            // Remove existing task if any
            this.removeCronTask(userId);

            // Create new cron task
            const task = cron.schedule(cronPattern, async () => {
                console.log(`🚀 CRON TRIGGERED for user ${user.username}! Starting daily message send...`);
                await this.sendDailyMessageForUser(userId);
            }, {
                scheduled: true,
                timezone: user.schedule.timezone || 'Asia/Jerusalem'
            });

            this.tasks.set(userId.toString(), task);

            console.log(`✅ Daily message scheduled for ${user.username} at ${user.dailyMessage.time} (${user.schedule.timezone})`);

            // Calculate next run
            const now = new Date();
            const nextRun = new Date();
            nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }

            console.log(`⏭️ Next run for ${user.username} will be: ${nextRun.toLocaleString('he-IL', { timeZone: user.schedule.timezone })}`);

        } catch (error) {
            console.error(`❌ Error setting up daily message for user ${userId}:`, error.message);
        }
    }

    removeCronTask(userId) {
        const userIdStr = userId.toString();
        if (this.tasks.has(userIdStr)) {
            console.log(`🗑️ Removing existing cron task for user ${userId}`);
            const existingTask = this.tasks.get(userIdStr);
            try {
                if (existingTask && typeof existingTask.stop === 'function') {
                    existingTask.stop();
                } else if (existingTask && typeof existingTask.destroy === 'function') {
                    existingTask.destroy();
                }
            } catch (error) {
                console.log(`⚠️ Warning removing old task for user ${userId}:`, error.message);
            }
            this.tasks.delete(userIdStr);
        }
    }

    async sendDailyMessageForUser(userId) {
        try {
            console.log(`📤 Sending daily message for user ${userId}...`);

            const user = await User.findById(userId);
            if (!user) {
                console.log(`❌ User ${userId} not found`);
                return;
            }

            const selectedGroups = user.selectedGroups || [];
            const enabledGroups = selectedGroups.filter(group => group.enabled !== false);

            if (enabledGroups.length === 0) {
                console.log(`📝 No groups selected for daily message for user: ${user.username}`);
                return;
            }

            if (!user.dailyMessage.enabled) {
                console.log(`📅 Daily message is disabled for user: ${user.username}`);
                return;
            }

            // Check if WhatsApp is connected for this user
            const status = whatsappService.getStatus(userId);
            if (!status.connected) {
                console.log(`❌ WhatsApp not connected for user: ${user.username}, skipping daily message`);
                return;
            }

            // Send message to all enabled groups
            let successful = 0;
            let failed = 0;

            for (const group of enabledGroups) {
                try {
                    await whatsappService.sendMessageToGroup(
                        userId,
                        group.id,
                        user.dailyMessage.text,
                        user.dailyMessage.imagePath
                    );
                    successful++;
                    console.log(`✅ Message sent to: ${group.name} for user: ${user.username}`);

                    // Add delay between messages
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    failed++;
                    console.error(`❌ Failed to send to ${group.name} for user ${user.username}:`, error.message);
                }
            }

            console.log(`✅ Daily message sent for ${user.username}: ${successful} successful, ${failed} failed`);

        } catch (error) {
            console.error(`❌ Error sending daily message for user ${userId}:`, error.message);
        }
    }

    async updateDailyMessageSchedule(userId, time, enabled = true) {
        try {
            // Update user data
            await User.findByIdAndUpdate(userId, {
                'dailyMessage.time': time,
                'dailyMessage.enabled': enabled
            });

            // Restart the cron job for this user
            if (enabled) {
                await this.setupDailyMessageForUser(userId);
                return {
                    success: true,
                    message: `Daily message rescheduled to ${time}`
                };
            } else {
                // Disable cron job for this user
                this.removeCronTask(userId);
                return {
                    success: true,
                    message: 'Daily message disabled'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async triggerDailyMessageForUser(userId) {
        try {
            await this.sendDailyMessageForUser(userId);
            return {
                success: true,
                message: 'Daily message triggered manually'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Function to trigger daily message for all users (admin function)
    async triggerDailyMessageForAllUsers() {
        try {
            const users = await User.find({
                isActive: true,
                'dailyMessage.enabled': true
            });

            let successful = 0;
            let failed = 0;

            for (const user of users) {
                try {
                    await this.sendDailyMessageForUser(user._id);
                    successful++;
                } catch (error) {
                    failed++;
                    console.error(`❌ Failed to send daily message for user ${user.username}:`, error.message);
                }
            }

            return {
                success: true,
                message: `Daily messages triggered: ${successful} successful, ${failed} failed`
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    getScheduledTasks() {
        const tasks = [];
        for (const [userId, task] of this.tasks) {
            tasks.push({
                userId,
                status: task.getStatus ? task.getStatus() : 'running',
                options: task.options || {}
            });
        }
        return tasks;
    }

    stop() {
        for (const [userId, task] of this.tasks) {
            try {
                if (task && typeof task.stop === 'function') {
                    task.stop();
                } else if (task && typeof task.destroy === 'function') {
                    task.destroy();
                }
                console.log(`🛑 Stopped cron task for user: ${userId}`);
            } catch (error) {
                console.log(`⚠️ Warning stopping task for user ${userId}:`, error.message);
            }
        }
        this.tasks.clear();
        this.isInitialized = false;
    }

    // Method to be called when a user logs in and wants to restart their cron
    async restartUserCron(userId) {
        await this.setupDailyMessageForUser(userId);
    }
}

module.exports = new CronService();