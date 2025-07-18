const express = require('express');
const router = express.Router();
const fileStorage = require('../utils/fileStorage');

// Get all contacts
router.get('/', async (req, res) => {
    try {
        const contacts = await fileStorage.getContacts();
        res.json({
            success: true,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add new contact
router.post('/', async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name and phone number are required'
            });
        }

        const contacts = await fileStorage.getContacts();

        // Check if contact already exists
        const existingContact = contacts.find(c => c.phone === phone);
        if (existingContact) {
            return res.status(400).json({
                success: false,
                message: 'Contact with this phone number already exists'
            });
        }

        const newContact = {
            id: Date.now().toString(),
            name: name.trim(),
            phone: phone.trim(),
            enabled: true,
            createdAt: new Date().toISOString()
        };

        contacts.push(newContact);
        await fileStorage.saveContacts(contacts);

        res.status(201).json({
            success: true,
            message: 'Contact added successfully',
            data: newContact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update contact
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, enabled } = req.body;

        const contacts = await fileStorage.getContacts();
        const contactIndex = contacts.findIndex(c => c.id === id);

        if (contactIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // Check if phone number is being changed and already exists
        if (phone && phone !== contacts[contactIndex].phone) {
            const existingContact = contacts.find(c => c.phone === phone && c.id !== id);
            if (existingContact) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact with this phone number already exists'
                });
            }
        }

        // Update contact
        if (name !== undefined) contacts[contactIndex].name = name.trim();
        if (phone !== undefined) contacts[contactIndex].phone = phone.trim();
        if (enabled !== undefined) contacts[contactIndex].enabled = enabled;
        contacts[contactIndex].updatedAt = new Date().toISOString();

        await fileStorage.saveContacts(contacts);

        res.json({
            success: true,
            message: 'Contact updated successfully',
            data: contacts[contactIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete contact
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const contacts = await fileStorage.getContacts();
        const contactIndex = contacts.findIndex(c => c.id === id);

        if (contactIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        const deletedContact = contacts.splice(contactIndex, 1)[0];
        await fileStorage.saveContacts(contacts);

        res.json({
            success: true,
            message: 'Contact deleted successfully',
            data: deletedContact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Toggle contact status (enable/disable)
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;

        const contacts = await fileStorage.getContacts();
        const contactIndex = contacts.findIndex(c => c.id === id);

        if (contactIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        contacts[contactIndex].enabled = !contacts[contactIndex].enabled;
        contacts[contactIndex].updatedAt = new Date().toISOString();

        await fileStorage.saveContacts(contacts);

        res.json({
            success: true,
            message: `Contact ${contacts[contactIndex].enabled ? 'enabled' : 'disabled'}`,
            data: contacts[contactIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Bulk operations
router.post('/bulk', async (req, res) => {
    try {
        const { action, contactIds } = req.body;

        if (!action || !contactIds || !Array.isArray(contactIds)) {
            return res.status(400).json({
                success: false,
                message: 'Action and contactIds array are required'
            });
        }

        const contacts = await fileStorage.getContacts();
        let updatedCount = 0;

        for (const id of contactIds) {
            const contactIndex = contacts.findIndex(c => c.id === id);
            if (contactIndex !== -1) {
                switch (action) {
                    case 'enable':
                        contacts[contactIndex].enabled = true;
                        contacts[contactIndex].updatedAt = new Date().toISOString();
                        updatedCount++;
                        break;
                    case 'disable':
                        contacts[contactIndex].enabled = false;
                        contacts[contactIndex].updatedAt = new Date().toISOString();
                        updatedCount++;
                        break;
                    case 'delete':
                        contacts.splice(contactIndex, 1);
                        updatedCount++;
                        break;
                }
            }
        }

        await fileStorage.saveContacts(contacts);

        res.json({
            success: true,
            message: `Bulk ${action} completed for ${updatedCount} contacts`,
            data: { updatedCount }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;