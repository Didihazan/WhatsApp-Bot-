const fs = require('fs').promises;
const path = require('path');

class FileStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.ensureDataDir();
    }

    async ensureDataDir() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    async readFile(filename) {
        try {
            const filePath = path.join(this.dataDir, filename);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${filename}:`, error.message);
            return null;
        }
    }

    async writeFile(filename, data) {
        try {
            const filePath = path.join(this.dataDir, filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`Error writing ${filename}:`, error.message);
            return false;
        }
    }

    async getContacts() {
        const contacts = await this.readFile('contacts.json');
        return contacts || [];
    }

    async saveContacts(contacts) {
        return await this.writeFile('contacts.json', contacts);
    }

    async getMessages() {
        const messages = await this.readFile('messages.json');
        return messages || {
            dailyMessage: {
                text: "שלום! זוהי הודעה אוטומטית יומית 📱",
                time: "11:00",
                enabled: true
            },
            sentMessages: []
        };
    }

    async saveMessages(messages) {
        return await this.writeFile('messages.json', messages);
    }

    async getSettings() {
        const settings = await this.readFile('settings.json');
        return settings || {
            whatsapp: {
                connected: false,
                lastConnected: null,
                qrCode: null
            },
            schedule: {
                enabled: true,
                timezone: "Asia/Jerusalem"
            },
            general: {
                autoReconnect: true,
                logLevel: "info"
            }
        };
    }

    async saveSettings(settings) {
        return await this.writeFile('settings.json', settings);
    }

    async addSentMessage(contact, message, status = 'sent') {
        const messages = await this.getMessages();
        messages.sentMessages.push({
            id: Date.now().toString(),
            contact,
            message,
            status,
            timestamp: new Date().toISOString()
        });

        // Keep only last 100 messages
        if (messages.sentMessages.length > 100) {
            messages.sentMessages = messages.sentMessages.slice(-100);
        }

        return await this.saveMessages(messages);
    }
}

module.exports = new FileStorage();