const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: false  // Optional for general reviews
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false  // Optional for anonymous reviews
    },
    reviewerName: {
        type: String,
        default: 'Anonymous'
    },
    rating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 
    },
    title: { 
        type: String, 
        required: true,
        maxlength: 100
    },
    comment: { 
        type: String, 
        required: true,
        maxlength: 1000
    },
    verified: { 
        type: Boolean, 
        default: false 
    }, // only verified purchases can review
    helpful: {
        type: Number,
        default: 0
    },
    unhelpful: {
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
reviewSchema.index({ productId: 1, userId: 1 });
reviewSchema.index({ productId: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
