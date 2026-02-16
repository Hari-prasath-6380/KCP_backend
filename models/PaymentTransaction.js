const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
    orderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order', 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    paymentMethod: { 
        type: String, 
        enum: ['credit_card', 'debit_card', 'upi', 'paypal', 'bank_transfer', 'cod'],
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    currency: { 
        type: String, 
        default: 'USD' 
    },
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        default: 'pending' 
    },
    transactionId: { 
        type: String, 
        unique: true,
        sparse: true
    }, // payment gateway transaction ID
    gatewayResponse: mongoose.Schema.Types.Mixed, // store full response from payment gateway
    failureReason: String,
    refundAmount: { 
        type: Number, 
        default: 0 
    },
    refundDate: Date,
    notes: String,
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
paymentTransactionSchema.index({ orderId: 1 });
paymentTransactionSchema.index({ userId: 1 });
paymentTransactionSchema.index({ transactionId: 1 });
paymentTransactionSchema.index({ status: 1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
