const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true
    },
    items: [
        {
            productId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'Product', 
                required: true 
            },
            quantity: { 
                type: Number, 
                required: true, 
                min: 1 
            },
            price: { 
                type: Number, 
                required: true 
            },
            addedAt: { 
                type: Date, 
                default: Date.now 
            }
        }
    ],
    appliedCoupon: {
        code: { type: String },
        discount: { type: Number, default: 0 }
    },
    subtotal: { 
        type: Number, 
        default: 0 
    },
    discount: { 
        type: Number, 
        default: 0 
    },
    tax: { 
        type: Number, 
        default: 0 
    },
    total: { 
        type: Number, 
        default: 0 
    },
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
cartSchema.index({ userId: 1 });

module.exports = mongoose.model('Cart', cartSchema);
