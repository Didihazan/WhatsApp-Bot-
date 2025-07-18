class Helpers {
    // Format date to Hebrew format
    static formatDateHebrew(date) {
        if (!date) return '';

        const dateObj = new Date(date);
        return dateObj.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Format time for display
    static formatTime(time) {
        if (!time) return '';

        const [hour, minute] = time.split(':');
        return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // Sleep/delay function
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Log with timestamp
    static log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        console.log(`${emoji[type] || 'ℹ️'} [${timestamp}] ${message}`);
    }

    // Calculate time until next scheduled run
    static timeUntilNext(targetTime, timezone = 'Asia/Jerusalem') {
        const [hour, minute] = targetTime.split(':');
        const now = new Date();
        const next = new Date();

        next.setHours(parseInt(hour), parseInt(minute), 0, 0);

        // If time has passed today, schedule for tomorrow
        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }

        const diff = next.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return {
            totalMs: diff,
            hours,
            minutes,
            nextRun: next.toISOString(),
            formatted: `${hours} שעות ו-${minutes} דקות`
        };
    }

    // Format phone number for display
    static formatPhoneForDisplay(phone) {
        if (!phone) return '';

        // If it's an Israeli number starting with 972
        if (phone.startsWith('972')) {
            const local = '0' + phone.substring(3);
            return local.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }

        return phone;
    }

    // Truncate text with ellipsis
    static truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Check if time is valid business hours
    static isBusinessHours(time, timezone = 'Asia/Jerusalem') {
        const [hour] = time.split(':');
        const hourNum = parseInt(hour);
        return hourNum >= 8 && hourNum <= 22; // 8 AM to 10 PM
    }

    // Get greeting based on time
    static getTimeBasedGreeting() {
        const hour = new Date().getHours();

        if (hour < 12) return 'בוקר טוב';
        if (hour < 18) return 'צהריים טובים';
        if (hour < 22) return 'ערב טוב';
        return 'לילה טוב';
    }

    // Parse cron expression to human readable
    static cronToHuman(cronExpression) {
        const parts = cronExpression.split(' ');
        if (parts.length !== 5) return 'Invalid cron expression';

        const [minute, hour, day, month, dayOfWeek] = parts;

        if (day === '*' && month === '*' && dayOfWeek === '*') {
            return `כל יום בשעה ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        }

        return `${minute} ${hour} ${day} ${month} ${dayOfWeek}`;
    }

    // Validate if service is ready
    static validateServiceReady(serviceName, isReady) {
        if (!isReady) {
            throw new Error(`${serviceName} is not ready`);
        }
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Clean and validate JSON
    static safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            this.log(`JSON parse error: ${error.message}`, 'warning');
            return defaultValue;
        }
    }

    // Safe stringify
    static safeJsonStringify(obj, space = 2) {
        try {
            return JSON.stringify(obj, null, space);
        } catch (error) {
            this.log(`JSON stringify error: ${error.message}`, 'warning');
            return '{}';
        }
    }

    // Retry function with exponential backoff
    static async retry(fn, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }

                const waitTime = delay * Math.pow(2, attempt - 1);
                this.log(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`, 'warning');
                await this.delay(waitTime);
            }
        }
    }

    // Check if string contains Hebrew characters
    static containsHebrew(str) {
        if (!str) return false;
        return /[\u0590-\u05FF]/.test(str);
    }

    // Format duration in Hebrew
    static formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} ימים, ${hours % 24} שעות`;
        } else if (hours > 0) {
            return `${hours} שעות, ${minutes % 60} דקות`;
        } else if (minutes > 0) {
            return `${minutes} דקות`;
        } else {
            return `${seconds} שניות`;
        }
    }

    // Get current Israeli time
    static getCurrentIsraeliTime() {
        return new Date().toLocaleString('he-IL', {
            timeZone: 'Asia/Jerusalem',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

module.exports = Helpers;