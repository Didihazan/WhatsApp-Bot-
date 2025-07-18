const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        cb(null, uploadDir);
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

// Upload image
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
                size: req.file.size
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get uploaded images
router.get('/images', async (req, res) => {
    try {
        const uploadDir = path.join(__dirname, '../uploads');

        try {
            const files = await fs.readdir(uploadDir);
            const imageFiles = files
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .map(file => ({
                    filename: file,
                    path: path.join('uploads', file),
                    url: `/uploads/${file}`
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

// Delete image
router.delete('/image/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../uploads', filename);

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

module.exports = router;