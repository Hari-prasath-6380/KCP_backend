const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true,
        uppercase: true,
        trim: true
    },
    description: { 
        type: String,
        required: true
    },
    discountType: { 
        type: String, 
        enum: ['percentage', 'fixed'], 
        required: true 
    },
    discountValue: { 
        type: Number, 
        required: true 
    }, // percentage value (0-100) or fixed amount in $
    minOrderValue: { 
        type: Number, 
        default: 0 
    }, // minimum order amount to use coupon
    maxDiscount: { 
        type: Number,
        default: null
    }, // max discount amount for percentage coupons
    usageLimit: { 
        type: Number, 
        default: null 
    }, // null = unlimited
    usagePerUser: { 
        type: Number, 
        default: 1 
    }, // how many times one user can use this coupon
    usedCount: { 
        type: Number, 
        default: 0 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    validFrom: { 
        type: Date, 
        required: true 
    },
    validUntil: { 
        type: Date, 
        required: true 
    },
    applicableCategories: [
        { type: String } // empty array means applicable to all
    ],
    usedBy: [
        {
            userId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User' 
            },
            usedCount: { 
                type: Number, 
                default: 1 
            },
            lastUsedAt: { 
                type: Date 
            }
        }
    ],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

// Index for quick lookups
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
