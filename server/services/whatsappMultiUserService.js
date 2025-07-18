const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');

class WhatsAppMultiUserService {
    constructor() {
        this.clients = new Map(); // userId -> client instance
        this.sessions = new Map(); // userId -> session data
        this.qrCodes = new Map(); // userId -> qrCode
        this.connectionPromises = new Map(); // userId -> connection promise
    }

    // Initialize WhatsApp client for a specific user
    async initializeForUser(userId) {
        if (this.clients.has(userId)) {
            console.log(`WhatsApp client already initialized for user ${userId}`);
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: userId.toString()
            }),
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

        this.clients.set(userId, client);
        this.setupEventListeners(userId, client);

        console.log(`✅ WhatsApp service initialized for user: ${user.username}`);
    }

    setupEventListeners(userId, client) {
        client.on('qr', async (qr) => {
            console.log(`📱 QR Code received for user ${userId}`);
            qrcode.generate(qr, { small: true });
            this.qrCodes.set(userId, qr);

            // Save QR to user document
            await User.findByIdAndUpdate(userId, {
                'whatsapp.qrCode': qr
            });
        });

        client.on('ready', async () => {
            console.log(`✅ WhatsApp client ready for user ${userId}!`);
            this.qrCodes.delete(userId);

            // Load groups for this user
            await this.loadGroupsForUser(userId);

            // Update user document
            await User.findByIdAndUpdate(userId, {
                'whatsapp.connected': true,
                'whatsapp.lastConnected': new Date(),
                'whatsapp.qrCode': null
            });
        });

        client.on('authenticated', async () => {
            console.log(`✅ WhatsApp authenticated for user ${userId}`);
        });

        client.on('auth_failure', async (msg) => {
            console.error(`❌ WhatsApp authentication failed for user ${userId}:`, msg);

            await User.findByIdAndUpdate(userId, {
                'whatsapp.connected': false
            });
        });

        client.on('disconnected', async (reason) => {
            console.log(`📵 WhatsApp disconnected for user ${userId}:`, reason);
            this.clients.delete(userId);
            this.qrCodes.delete(userId);
            this.connectionPromises.delete(userId);

            await User.findByIdAndUpdate(userId, {
                'whatsapp.connected': false,
                'whatsapp.qrCode': null
            });
        });

        client.on('message', (message) => {
            console.log(`📨 Message received for user ${userId}: ${message.body}`);
        });
    }

    async loadGroupsForUser(userId) {
        const client = this.clients.get(userId);
        if (!client || !client.info) {
            return;
        }

        try {
            const chats = await client.getChats();
            const groups = chats
                .filter(chat => chat.isGroup)
                .map(chat => ({
                    id: chat.id._serialized,
                    name: chat.name,
                    participantCount: chat.participants.length,
                    isActive: !chat.archived
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Save groups to user's session data
            this.sessions.set(userId, { ...this.sessions.get(userId), groups });

            console.log(`📱 Loaded ${groups.length} groups for user ${userId}`);
        } catch (error) {
            console.error(`❌ Error loading groups for user ${userId}:`, error.message);
        }
    }

    async connect(userId) {
        if (this.connectionPromises.has(userId)) {
            return this.connectionPromises.get(userId);
        }

        const client = this.clients.get(userId);
        if (client && client.info) {
            return { success: true, message: 'Already connected' };
        }

        this.connectionPromises.set(userId, new Promise(async (resolve) => {
            try {
                if (!this.clients.has(userId)) {
                    await this.initializeForUser(userId);
                }

                const client = this.clients.get(userId);
                await client.initialize();

                // Wait for connection or timeout
                const timeout = setTimeout(() => {
                    this.connectionPromises.delete(userId);
                    resolve({
                        success: false,
                        message: 'Connection timeout'
                    });
                }, 60000); // 60 seconds timeout

                client.once('ready', () => {
                    clearTimeout(timeout);
                    this.connectionPromises.delete(userId);
                    resolve({
                        success: true,
                        message: 'Connected successfully'
                    });
                });

                client.once('auth_failure', (msg) => {
                    clearTimeout(timeout);
                    this.connectionPromises.delete(userId);
                    resolve({
                        success: false,
                        message: `Authentication failed: ${msg}`
                    });
                });

            } catch (error) {
                this.connectionPromises.delete(userId);
                resolve({
                    success: false,
                    message: error.message
                });
            }
        }));

        return this.connectionPromises.get(userId);
    }

    async disconnect(userId) {
        const client = this.clients.get(userId);
        if (!client) {
            return { success: true, message: 'Already disconnected' };
        }

        try {
            await client.destroy();
            this.clients.delete(userId);
            this.qrCodes.delete(userId);
            this.connectionPromises.delete(userId);
            this.sessions.delete(userId);

            await User.findByIdAndUpdate(userId, {
                'whatsapp.connected': false,
                'whatsapp.qrCode': null
            });

            return { success: true, message: 'Disconnected successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async sendMessageToGroup(userId, groupId, message, imagePath = null) {
        const client = this.clients.get(userId);
        if (!client || !client.info) {
            throw new Error('WhatsApp not connected for this user');
        }

        try {
            let media = null;

            console.log(`📤 Sending message for user ${userId} to group ${groupId}`);
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
                await client.sendMessage(groupId, media, { caption: message });
                console.log(`📸 Message with image sent to group`);
            } else {
                console.log('💬 Sending text-only message...');
                await client.sendMessage(groupId, message);
                console.log(`💬 Text message sent to group`);
            }

            // Find group name for logging
            const session = this.sessions.get(userId);
            const groups = session?.groups || [];
            const group = groups.find(g => g.id === groupId);
            const groupName = group ? group.name : 'Unknown Group';

            // Log sent message to user's history
            await User.findByIdAndUpdate(userId, {
                $push: {
                    sentMessages: {
                        contact: groupName,
                        message: imagePath ? `${message} [עם תמונה]` : message,
                        status: 'sent',
                        timestamp: new Date()
                    }
                }
            });

            return { success: true, message: 'Message sent to group successfully' };
        } catch (error) {
            console.error('❌ Error sending message:', error);

            // Log failed message
            const session = this.sessions.get(userId);
            const groups = session?.groups || [];
            const group = groups.find(g => g.id === groupId);
            const groupName = group ? group.name : 'Unknown Group';

            await User.findByIdAndUpdate(userId, {
                $push: {
                    sentMessages: {
                        contact: groupName,
                        message: imagePath ? `${message} [עם תמונה]` : message,
                        status: 'failed',
                        timestamp: new Date()
                    }
                }
            });

            throw new Error(`Failed to send message to group: ${error.message}`);
        }
    }

    async sendMessage(userId, number, message) {
        const client = this.clients.get(userId);
        if (!client || !client.info) {
            throw new Error('WhatsApp not connected for this user');
        }

        try {
            // Format number (remove any non-digits and add country code if needed)
            const formattedNumber = this.formatPhoneNumber(number);
            const chatId = `${formattedNumber}@c.us`;

            await client.sendMessage(chatId, message);

            // Log sent message
            await User.findByIdAndUpdate(userId, {
                $push: {
                    sentMessages: {
                        contact: number,
                        message: message,
                        status: 'sent',
                        timestamp: new Date()
                    }
                }
            });

            return { success: true, message: 'Message sent successfully' };
        } catch (error) {
            // Log failed message
            await User.findByIdAndUpdate(userId, {
                $push: {
                    sentMessages: {
                        contact: number,
                        message: message,
                        status: 'failed',
                        timestamp: new Date()
                    }
                }
            });

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

    async getGroups(userId) {
        const client = this.clients.get(userId);
        if (!client || !client.info) {
            throw new Error('WhatsApp not connected for this user');
        }

        const session = this.sessions.get(userId);
        if (!session?.groups) {
            await this.loadGroupsForUser(userId);
            return this.sessions.get(userId)?.groups || [];
        }

        return session.groups;
    }

    async loadGroups(userId) {
        await this.loadGroupsForUser(userId);
    }

    getStatus(userId) {
        const client = this.clients.get(userId);
        const qrCode = this.qrCodes.get(userId);
        const session = this.sessions.get(userId);

        return {
            connected: client ? !!client.info : false,
            qrCode: qrCode || null,
            groupsCount: session?.groups?.length || 0,
            clientInfo: client?.info ? {
                version: client.info.version || 'Unknown',
                platform: client.info.platform || 'Unknown'
            } : null
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new WhatsAppMultiUserService();