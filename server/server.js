require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const { auth, optionalAuth } = require('./middleware/auth');

// Connect to MongoDB
connectDB();

// Import services
const whatsappService = require('./services/whatsappMultiUserService');
const cronService = require('./services/cronService');

// Import routes
const authRoutes = require('./routes/auth');
const whatsappRoutes = require('./routes/whatsapp');
const messagesRoutes = require('./routes/messages');
const scheduleRoutes = require('./routes/schedule');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - תומך בפיתוח ופרודקשן
const corsOptions = {
    origin: function (origin, callback) {
        // רשימת דומיינים מותרים
        const allowedOrigins = [
            'http://localhost:3000',           // פיתוח
            'http://localhost:5173',           // Vite פיתוח
            'https://whatsapp-bot-uz4r.onrender.com',  // פרודקשן פרונטאנד
            'https://whatsapp-bot-server-hprc.onrender.com'  // פרודקשן בקאנד
        ];

        // אם אין origin (כמו בקריאות מהשרת עצמו) או שהוא ברשימה המותרת
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files with user authentication
app.use('/uploads/:userId/:filename', optionalAuth, (req, res, next) => {
    const { userId, filename } = req.params;

    // Check if user is authenticated and requesting their own files
    if (!req.user || req.user._id.toString() !== userId) {
        return res.status(403).json({
            success: false,
            message: 'אין הרשאה לגשת לקובץ זה'
        });
    }

    // Serve the file
    const filePath = path.join(__dirname, 'uploads', userId, filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({
                success: false,
                message: 'קובץ לא נמצא'
            });
        }
    });
});

// Legacy route for backward compatibility (without user separation)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/upload', uploadRoutes);

// Basic route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'WhatsApp Bot Server is running',
        timestamp: new Date().toISOString(),
        users: whatsappService.clients ? whatsappService.clients.size : 0,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Debug CORS route
app.get('/api/debug/cors', (req, res) => {
    res.json({
        success: true,
        data: {
            origin: req.headers.origin,
            userAgent: req.headers['user-agent'],
            corsEnabled: true,
            environment: process.env.NODE_ENV || 'development',
            frontendUrl: process.env.FRONTEND_URL
        }
    });
});

// Debug route for checking uploads
app.get('/api/debug/uploads', auth, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const userUploadDir = path.join(__dirname, 'uploads', req.user._id.toString());

        try {
            const files = await fs.readdir(userUploadDir);
            res.json({
                success: true,
                data: {
                    userId: req.user._id,
                    uploadDir: userUploadDir,
                    files: files
                }
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    userId: req.user._id,
                    uploadDir: userUploadDir,
                    files: [],
                    message: 'Upload directory does not exist yet'
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    // טיפול בשגיאות CORS
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'CORS error',
            message: 'Origin not allowed',
            origin: req.headers.origin
        });
    }

    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS enabled for multiple origins`);

    // Initialize services
    try {
        // Initialize cron service which will set up scheduled tasks for all users
        cronService.initialize();
        console.log('✅ Services initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize services:', error.message);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    try {
        // Disconnect all WhatsApp clients
        for (const [userId, client] of whatsappService.clients || new Map()) {
            try {
                await whatsappService.disconnect(userId);
                console.log(`📱 Disconnected WhatsApp for user: ${userId}`);
            } catch (error) {
                console.error(`❌ Error disconnecting user ${userId}:`, error.message);
            }
        }

        cronService.stop();
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
    }
});