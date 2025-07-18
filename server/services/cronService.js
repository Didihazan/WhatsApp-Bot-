const cron = require('node-cron');
const whatsappService = require('./whatsappService');
const fileStorage = require('../utils/fileStorage');

class CronService {
    constructor() {
        this.tasks = new Map();
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) {
            console.log('Cron service already initialized');
            return;
        }

        this.setupDailyMessage();
        this.isInitialized = true;
        console.log('✅ Cron service initialized');
    }

    async setupDailyMessage() {
        try {
            const messages = await fileStorage.getMessages();
            const settings = await fileStorage.getSettings();

            console.log('🔧 Setting up daily message...');
            console.log(`📅 Message enabled: ${messages.dailyMessage.enabled}`);
            console.log(`⚙️ Schedule enabled: ${settings.schedule.enabled}`);
            console.log(`⏰ Time: ${messages.dailyMessage.time}`);
            console.log(`🌍 Timezone: ${settings.schedule.timezone}`);

            if (!messages.dailyMessage.enabled || !settings.schedule.enabled) {
                console.log('📅 Daily message is disabled');
                return;
            }

            // Parse time (format: "HH:MM")
            const [hour, minute] = messages.dailyMessage.time.split(':');
            const cronPattern = `${minute} ${hour} * * *`; // Every day at specified time

            console.log(`🕐 Cron pattern: ${cronPattern}`);
            console.log(`📝 Translated: Every day at ${hour}:${minute}`);

            // Remove existing task if any
            if (this.tasks.has('dailyMessage')) {
                console.log('🗑️ Removing existing cron task');
                const existingTask = this.tasks.get('dailyMessage');
                try {
                    if (existingTask && typeof existingTask.stop === 'function') {
                        existingTask.stop();
                    } else if (existingTask && typeof existingTask.destroy === 'function') {
                        existingTask.destroy();
                    }
                } catch (error) {
                    console.log('⚠️ Warning removing old task:', error.message);
                }
                this.tasks.delete('dailyMessage');
            }

            // Create new cron task
            const task = cron.schedule(cronPattern, async () => {
                console.log('🚀 CRON TRIGGERED! Starting daily message send...');
                await this.sendDailyMessage();
            }, {
                scheduled: true,
                timezone: settings.schedule.timezone || 'Asia/Jerusalem'
            });

            this.tasks.set('dailyMessage', task);

            console.log(`✅ Daily message scheduled for ${messages.dailyMessage.time} (${settings.schedule.timezone})`);

            // Calculate next run
            const now = new Date();
            const nextRun = new Date();
            nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }

            console.log(`⏭️ Next run will be: ${nextRun.toLocaleString('he-IL', { timeZone: settings.schedule.timezone })}`);
            console.log(`🕒 Current time: ${now.toLocaleString('he-IL', { timeZone: settings.schedule.timezone })}`);

        } catch (error) {
            console.error('❌ Error setting up daily message:', error.message);
        }
    }

    async sendDailyMessage() {
        try {
            console.log('📤 Sending daily message...');

            const settings = await fileStorage.getSettings();
            const messages = await fileStorage.getMessages();

            const selectedGroups = settings.selectedGroups || [];
            const enabledGroups = selectedGroups.filter(group => group.enabled !== false);

            if (enabledGroups.length === 0) {
                console.log('📝 No groups selected for daily message');
                return;
            }

            if (!messages.dailyMessage.enabled) {
                console.log('📅 Daily message is disabled');
                return;
            }

            // Check if WhatsApp is connected
            if (!whatsappService.getStatus().connected) {
                console.log('❌ WhatsApp not connected, skipping daily message');
                return;
            }

            // Send message to all enabled groups
            let successful = 0;
            let failed = 0;

            for (const group of enabledGroups) {
                try {
                    await whatsappService.sendMessageToGroup(
                        group.id,
                        messages.dailyMessage.text,
                        messages.dailyMessage.imagePath
                    );
                    successful++;
                    console.log(`✅ Message sent to: ${group.name}`);

                    // Add delay between messages
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    failed++;
                    console.error(`❌ Failed to send to ${group.name}:`, error.message);
                }
            }

            console.log(`✅ Daily message sent: ${successful} successful, ${failed} failed`);

            // Log the batch send
            await fileStorage.addSentMessage(
                'batch',
                `Daily message to ${successful}/${enabledGroups.length} groups`,
                'batch_sent'
            );

        } catch (error) {
            console.error('❌ Error sending daily message:', error.message);
            await fileStorage.addSentMessage(
                'batch',
                'Daily message failed',
                'batch_failed'
            );
        }
    }

    async updateDailyMessageSchedule(time, enabled = true) {
        try {
            // Update messages data
            const messages = await fileStorage.getMessages();
            messages.dailyMessage.time = time;
            messages.dailyMessage.enabled = enabled;
            await fileStorage.saveMessages(messages);

            // Restart the cron job
            if (enabled) {
                await this.setupDailyMessage();
                return {
                    success: true,
                    message: `Daily message rescheduled to ${time}`
                };
            } else {
                // Disable cron job
                if (this.tasks.has('dailyMessage')) {
                    this.tasks.get('dailyMessage').destroy();
                    this.tasks.delete('dailyMessage');
                }
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

    async triggerDailyMessage() {
        try {
            await this.sendDailyMessage();
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

    getScheduledTasks() {
        const tasks = [];
        for (const [name, task] of this.tasks) {
            tasks.push({
                name,
                status: task.getStatus(),
                options: task.options
            });
        }
        return tasks;
    }

    stop() {
        for (const [name, task] of this.tasks) {
            try {
                if (task && typeof task.stop === 'function') {
                    task.stop();
                } else if (task && typeof task.destroy === 'function') {
                    task.destroy();
                }
                console.log(`🛑 Stopped cron task: ${name}`);
            } catch (error) {
                console.log(`⚠️ Warning stopping task ${name}:`, error.message);
            }
        }
        this.tasks.clear();
        this.isInitialized = false;
    }
}

module.exports = new CronService();