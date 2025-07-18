const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fileStorage = require('../utils/fileStorage');
const fs = require('fs').promises;
const path = require('path');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.qrCode = null;
        this.connectionPromise = null;
        this.groups = [];
    }

    async initialize() {
        if (this.client) {
            console.log('WhatsApp client already initialized');
            return;
        }

        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventListeners();
        console.log('✅ WhatsApp service initialized');
    }

    setupEventListeners() {
        this.client.on('qr', async (qr) => {
            console.log('📱 QR Code received');
            qrcode.generate(qr, { small: true });
            this.qrCode = qr;

            // Save QR to settings
            const settings = await fileStorage.getSettings();
            settings.whatsapp.qrCode = qr;
            await fileStorage.saveSettings(settings);
        });

        this.client.on('ready', async () => {
            console.log('✅ WhatsApp client is ready!');
            this.isConnected = true;
            this.qrCode = null;

            // Load groups
            await this.loadGroups();

            // Update settings
            const settings = await fileStorage.getSettings();
            settings.whatsapp.connected = true;
            settings.whatsapp.lastConnected = new Date().toISOString();
            settings.whatsapp.qrCode = null;
            await fileStorage.saveSettings(settings);
        });

        this.client.on('authenticated', () => {
            console.log('✅ WhatsApp authenticated');
        });

        this.client.on('auth_failure', async (msg) => {
            console.error('❌ WhatsApp authentication failed:', msg);
            this.isConnected = false;

            const settings = await fileStorage.getSettings();
            settings.whatsapp.connected = false;
            await fileStorage.saveSettings(settings);
        });

        this.client.on('disconnected', async (reason) => {
            console.log('📵 WhatsApp disconnected:', reason);
            this.isConnected = false;
            this.qrCode = null;
            this.groups = [];

            const settings = await fileStorage.getSettings();
            settings.whatsapp.connected = false;
            settings.whatsapp.qrCode = null;
            await fileStorage.saveSettings(settings);
        });

        this.client.on('message', (message) => {
            console.log(`📨 Message received: ${message.body}`);
        });
    }

    async loadGroups() {
        if (!this.isConnected || !this.client) {
            return;
        }

        try {
            const chats = await this.client.getChats();
            this.groups = chats
                .filter(chat => chat.isGroup)
                .map(chat => ({
                    id: chat.id._serialized,
                    name: chat.name,
                    participantCount: chat.participants.length,
                    isActive: !chat.archived
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            console.log(`📱 Loaded ${this.groups.length} groups`);
        } catch (error) {
            console.error('❌ Error loading groups:', error.message);
        }
    }

    async getGroups() {
        if (!this.isConnected) {
            throw new Error('WhatsApp not connected');
        }

        if (this.groups.length === 0) {
            await this.loadGroups();
        }

        return this.groups;
    }

    async connect() {
        if (this.isConnected) {
            return { success: true, message: 'Already connected' };
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise(async (resolve) => {
            try {
                if (!this.client) {
                    await this.initialize();
                }

                await this.client.initialize();

                // Wait for connection or timeout
                const timeout = setTimeout(() => {
                    resolve({
                        success: false,
                        message: 'Connection timeout'
                    });
                }, 60000); // 60 seconds timeout

                this.client.once('ready', () => {
                    clearTimeout(timeout);
                    this.connectionPromise = null;
                    resolve({
                        success: true,
                        message: 'Connected successfully'
                    });
                });

                this.client.once('auth_failure', (msg) => {
                    clearTimeout(timeout);
                    this.connectionPromise = null;
                    resolve({
                        success: false,
                        message: `Authentication failed: ${msg}`
                    });
                });

            } catch (error) {
                this.connectionPromise = null;
                resolve({
                    success: false,
                    message: error.message
                });
            }
        });

        return this.connectionPromise;
    }

    async disconnect() {
        if (!this.client) {
            return { success: true, message: 'Already disconnected' };
        }

        try {
            await this.client.destroy();
            this.client = null;
            this.isConnected = false;
            this.qrCode = null;
            this.connectionPromise = null;
            this.groups = [];

            const settings = await fileStorage.getSettings();
            settings.whatsapp.connected = false;
            settings.whatsapp.qrCode = null;
            await fileStorage.saveSettings(settings);

            return { success: true, message: 'Disconnected successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async sendMessageToGroup(groupId, message, imagePath = null) {
        if (!this.isConnected || !this.client) {
            throw new Error('WhatsApp not connected');
        }

        try {
            let media = null;

            console.log(`📤 Sending message to group ${groupId}`);
            console.log(`💬 Message: ${message}`);
            console.log(`🖼️ Image path: ${imagePath}`);

            // If image is provided, prepare media
            if (imagePath) {
                try {
                    // Convert relative path to absolute path
                    const absolutePath = path.resolve(__dirname, '../', imagePath);
                    console.log(`🔍 Checking image at: ${absolutePath}`);

                    // Check if file exists
                    await fs.access(absolutePath);
                    console.log('✅ Image file found');

                    media = MessageMedia.fromFilePath(absolutePath);
                    console.log('✅ Media object created');
                } catch (error) {
                    console.warn(`⚠️ Image file error: ${error.message}`);
                    console.warn(`📁 Tried path: ${imagePath}`);
                    // Continue without image
                }
            }

            // Send message with or without media
            if (media) {
                console.log('📸 Sending message with image...');
                await this.client.sendMessage(groupId, media, { caption: message });
                console.log(`📸 Message with image sent to group`);
            } else {
                console.log('💬 Sending text-only message...');
                await this.client.sendMessage(groupId, message);
                console.log(`💬 Text message sent to group`);
            }

            // Find group name for logging
            const group = this.groups.find(g => g.id === groupId);
            const groupName = group ? group.name : 'Unknown Group';

            // Log sent message
            await fileStorage.addSentMessage(
                groupName,
                imagePath ? `${message} [עם תמונה]` : message,
                'sent'
            );

            return { success: true, message: 'Message sent to group successfully' };
        } catch (error) {
            console.error('❌ Error sending message:', error);
            const group = this.groups.find(g => g.id === groupId);
            const groupName = group ? group.name : 'Unknown Group';
            await fileStorage.addSentMessage(
                groupName,
                imagePath ? `${message} [עם תמונה]` : message,
                'failed'
            );
            throw new Error(`Failed to send message to group: ${error.message}`);
        }
    }

    async sendMessage(number, message) {
        if (!this.isConnected || !this.client) {
            throw new Error('WhatsApp not connected');
        }

        try {
            // Format number (remove any non-digits and add country code if needed)
            const formattedNumber = this.formatPhoneNumber(number);
            const chatId = `${formattedNumber}@c.us`;

            await this.client.sendMessage(chatId, message);

            // Log sent message
            await fileStorage.addSentMessage(number, message, 'sent');

            return { success: true, message: 'Message sent successfully' };
        } catch (error) {
            await fileStorage.addSentMessage(number, message, 'failed');
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    formatPhoneNumber(number) {
        // Remove all non-digits
        let cleaned = number.replace(/\D/g, '');

        // Add Israel country code if no country code
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
            cleaned = '972' + cleaned.substring(1);
        } else if (cleaned.length === 9) {
            cleaned = '972' + cleaned;
        }

        return cleaned;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            connected: this.isConnected,
            qrCode: this.qrCode,
            groupsCount: this.groups.length,
            clientInfo: this.client ? {
                version: this.client.info?.version || 'Unknown',
                platform: this.client.info?.platform || 'Unknown'
            } : null
        };
    }
}

module.exports = new WhatsAppService();