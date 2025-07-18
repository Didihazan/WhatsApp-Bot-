const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    whatsapp: {
        connected: {
            type: Boolean,
            default: false
        },
        lastConnected: Date,
        qrCode: String,
        sessionData: String
    },
    selectedGroups: [{
        id: String,
        name: String,
        addedAt: Date,
        enabled: {
            type: Boolean,
            default: true
        }
    }],
    dailyMessage: {
        text: {
            type: String,
            default: "שלום! זוהי הודעה אוטומטית יומית 📱"
        },
        time: {
            type: String,
            default: "11:00"
        },
        enabled: {
            type: Boolean,
            default: true
        },
        imagePath: String
    },
    schedule: {
        enabled: {
            type: Boolean,
            default: true
        },
        timezone: {
            type: String,
            default: "Asia/Jerusalem"
        }
    },
    sentMessages: [{
        contact: String,
        message: String,
        status: String,
        timestamp: Date
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.whatsapp.sessionData;
    return user;
};

module.exports = mongoose.model('User', userSchema);