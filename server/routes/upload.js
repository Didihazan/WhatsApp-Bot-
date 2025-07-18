const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// Configure multer for file uploads with user separation
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        // Create user-specific upload directory
        const userUploadDir = path.join(__dirname, '../uploads', req.user._id.toString());

        try {
            await fs.access(userUploadDir);
        } catch {
            await fs.mkdir(userUploadDir, { recursive: true });
        }

        cb(null, userUploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + ext);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('רק קבצי תמונה מותרים (JPEG, PNG, GIF, WebP)'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: fileFilter
});

// Upload image for current user
router.post('/image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'לא נבחרה תמונה'
            });
        }

        const filePath = req.file.path;
        const relativePath = path.relative(path.join(__dirname, '../'), filePath);

        res.json({
            success: true,
            message: 'תמונה הועלתה בהצלחה',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: relativePath,
                size: req.file.size,
                userId: req.user._id
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get uploaded images for current user
router.get('/images', async (req, res) => {
    try {
        const userUploadDir = path.join(__dirname, '../uploads', req.user._id.toString());

        try {
            const files = await fs.readdir(userUploadDir);
            const imageFiles = files
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .map(file => ({
                    filename: file,
                    path: path.join('uploads', req.user._id.toString(), file),
                    url: `/uploads/${req.user._id}/${file}`
                }));

            res.json({
                success: true,
                data: imageFiles
            });
        } catch (error) {
            // Directory doesn't exist yet
            res.json({
                success: true,
                data: []
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete image for current user
router.delete('/image/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../uploads', req.user._id.toString(), filename);

        // Check if file belongs to current user
        const userUploadDir = path.join(__dirname, '../uploads', req.user._id.toString());
        const requestedPath = path.resolve(filePath);
        const userDirPath = path.resolve(userUploadDir);

        if (!requestedPath.startsWith(userDirPath)) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה למחוק קובץ זה'
            });
        }

        await fs.unlink(filePath);

        res.json({
            success: true,
            message: 'תמונה נמחקה בהצלחה'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get image info for current user
router.get('/image/:filename/info', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../uploads', req.user._id.toString(), filename);

        const stats = await fs.stat(filePath);

        res.json({
            success: true,
            data: {
                filename,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                path: path.join('uploads', req.user._id.toString(), filename)
            }
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'תמונה לא נמצאה'
        });
    }
});

module.exports = router;