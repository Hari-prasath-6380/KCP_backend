const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Basic Info
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    number: { type: Number, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin', 'farmer', 'citizen'], required: true },
    
    // Profile
    profileImage: { type: String, default: null },
    bio: { type: String, default: '' },
    
    // Addresses
    addresses: [
        {
            label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
            fullName: String,
            phoneNumber: String,
            streetAddress: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
            isDefault: { type: Boolean, default: false },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    
    // Account Settings
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Preferences
    preferences: {
        newsletter: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false }
    },
    
    // Stats
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastLogin: Date,
    
    // Status
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: String,
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for quick lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
