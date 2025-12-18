//
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // ============ AUTHENTICATION ============
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    refreshTokenHash: { type: String, select: false },

    // ============ PROFILE ============
    profile: {
        displayName: { type: String, required: true, trim: true, maxLength: 50 },
        avatarUrl: { type: String, default: null },
        bio: { type: String, maxLength: 200, default: '' }
    },

    // ============ GAMIFICATION ============
    gamification: {
        totalXp: { type: Number, default: 0, min: 0 },
        rank: {
            type: String,
            enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
            default: 'Bronze'
        },
        totalNetWorth: { type: Number, default: 0, min: 0 },
        avgCollectionHealth: { type: Number, default: 100, min: 0, max: 100 },
        maintenanceStreak: { type: Number, default: 0 },
        lastMaintenanceDate: { type: Date, default: null },
        stats: {
            totalItemsOwned: { type: Number, default: 0 },
            totalCleaningsDone: { type: Number, default: 0 },
            totalCardsGenerated: { type: Number, default: 0 }
        }
    },

    // ============ SETTINGS ============
    settings: {
        notifications: {
            pushEnabled: { type: Boolean, default: true },
            emailEnabled: { type: Boolean, default: false },
            maintenanceReminders: { type: Boolean, default: true },
            marketAlerts: { type: Boolean, default: true }
        },
        privacy: {
            profilePublic: { type: Boolean, default: false },
            showNetWorth: { type: Boolean, default: false }
        },
        preferences: {
            theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
            language: { type: String, default: 'vi' },
            currency: { type: String, default: 'USD' }
        }
    },

    // ============ DEVICE & SESSION ============
    devices: [{
        deviceId: String,
        platform: { type: String, enum: ['ios', 'android', 'web'] },
        pushToken: String, // Expo push token
        lastActiveAt: Date
    }],

    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
    lastLoginAt: Date

}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// ============ INDEXES ============
userSchema.index({ 'gamification.totalXp': 1 }); // Leaderboard
userSchema.index({ 'gamification.totalNetWorth': -1 });

// ============ VIRTUALS ============
userSchema.virtual('badges', {
    ref: 'BadgeUnlock',
    localField: '_id',
    foreignField: 'userId'
});

// ============ METHODS ============
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.calculateRank = function () {
    const xp = this.gamification.totalXp;
    if (xp >= 10000) return 'Diamond';
    if (xp >= 5000) return 'Platinum';
    if (xp >= 2000) return 'Gold';
    if (xp >= 500) return 'Silver';
    return 'Bronze';
};

// ============ PRE-SAVE HOOKS ============
userSchema.pre('save', async function () {
    // Hash password
    if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2')) {
        this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
    // Recalculate rank
    if (this.isModified('gamification.totalXp')) {
        this.gamification.rank = this.calculateRank();
    }
});

module.exports = mongoose.model('User', userSchema);