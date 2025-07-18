class Validation {
    // Validate phone number
    static isValidPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            return false;
        }

        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, '');

        // Check if it's a valid length (9-15 digits)
        if (cleaned.length < 9 || cleaned.length > 15) {
            return false;
        }

        // Israeli phone number patterns
        const israeliPatterns = [
            /^972[5-9]\d{8}$/, // International format
            /^0[5-9]\d{8}$/,   // Local format
            /^[5-9]\d{8}$/     // Without leading 0
        ];

        return israeliPatterns.some(pattern => pattern.test(cleaned));
    }

    // Validate time format (HH:MM)
    static isValidTimeFormat(time) {
        if (!time || typeof time !== 'string') {
            return false;
        }

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    // Validate message content
    static isValidMessage(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }

        const trimmed = message.trim();
        return trimmed.length > 0 && trimmed.length <= 4096; // WhatsApp message limit
    }

    // Validate contact name
    static isValidContactName(name) {
        if (!name || typeof name !== 'string') {
            return false;
        }

        const trimmed = name.trim();
        return trimmed.length > 0 && trimmed.length <= 100;
    }

    // Validate timezone
    static isValidTimezone(timezone) {
        if (!timezone || typeof timezone !== 'string') {
            return false;
        }

        const validTimezones = [
            'Asia/Jerusalem',
            'Europe/London',
            'America/New_York',
            'America/Los_Angeles',
            'Europe/Paris',
            'Asia/Tokyo',
            'Australia/Sydney'
        ];

        return validTimezones.includes(timezone);
    }

    // Format phone number to international format
    static formatPhoneNumber(phone) {
        if (!phone) return null;

        // Remove all non-digits
        let cleaned = phone.replace(/\D/g, '');

        // Add Israel country code if needed
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
            cleaned = '972' + cleaned.substring(1);
        } else if (cleaned.length === 9) {
            cleaned = '972' + cleaned;
        }

        return cleaned;
    }

    // Sanitize message content
    static sanitizeMessage(message) {
        if (!message) return '';

        return message
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .substring(0, 4096); // Limit to WhatsApp maximum
    }

    // Sanitize contact name
    static sanitizeContactName(name) {
        if (!name) return '';

        return name
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .substring(0, 100); // Reasonable limit
    }

    // Validate pagination parameters
    static validatePagination(page, limit) {
        const parsedPage = parseInt(page) || 1;
        const parsedLimit = parseInt(limit) || 50;

        return {
            page: Math.max(1, parsedPage),
            limit: Math.min(100, Math.max(1, parsedLimit)) // Max 100 items per page
        };
    }

    // Check if string is empty or only whitespace
    static isEmpty(str) {
        return !str || str.trim().length === 0;
    }

    // Validate email format (if needed for future features)
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate URL format (if needed for webhooks)
    static isValidUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = Validation;