const express = require('express');
const router = express.Router();
const fileStorage = require('../utils/fileStorage');

// Get selected groups
router.get('/', async (req, res) => {
    try {
        const settings = await fileStorage.getSettings();
        res.json({
            success: true,
            data: settings.selectedGroups || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add group to selected
router.post('/add', async (req, res) => {
    try {
        const { groupId, groupName } = req.body;

        if (!groupId || !groupName) {
            return res.status(400).json({
                success: false,
                message: 'Group ID and name are required'
            });
        }

        const settings = await fileStorage.getSettings();
        if (!settings.selectedGroups) {
            settings.selectedGroups = [];
        }

        // Check if group already selected
        const exists = settings.selectedGroups.find(g => g.id === groupId);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'קבוצה כבר נבחרה'
            });
        }

        // Add group
        settings.selectedGroups.push({
            id: groupId,
            name: groupName,
            addedAt: new Date().toISOString(),
            enabled: true
        });

        await fileStorage.saveSettings(settings);

        res.json({
            success: true,
            message: 'קבוצה נוספה בהצלחה',
            data: settings.selectedGroups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Remove group from selected
router.delete('/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;

        const settings = await fileStorage.getSettings();
        if (!settings.selectedGroups) {
            settings.selectedGroups = [];
        }

        const index = settings.selectedGroups.findIndex(g => g.id === groupId);
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'קבוצה לא נמצאה'
            });
        }

        const removedGroup = settings.selectedGroups.splice(index, 1)[0];
        await fileStorage.saveSettings(settings);

        res.json({
            success: true,
            message: 'קבוצה הוסרה בהצלחה',
            data: settings.selectedGroups,
            removed: removedGroup
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Toggle group status
router.patch('/:groupId/toggle', async (req, res) => {
    try {
        const { groupId } = req.params;

        const settings = await fileStorage.getSettings();
        if (!settings.selectedGroups) {
            settings.selectedGroups = [];
        }

        const group = settings.selectedGroups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'קבוצה לא נמצאה'
            });
        }

        group.enabled = !group.enabled;
        await fileStorage.saveSettings(settings);

        res.json({
            success: true,
            message: `קבוצה ${group.enabled ? 'הופעלה' : 'הושבתה'}`,
            data: settings.selectedGroups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;