const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    // Customer Information
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },

    // Delivery Address
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    zipcode: {
        type: String,
        required: true
    },
    country: {
        type: String,
        default: 'India'
    },
    instructions: String,

    // Legacy field for backward compatibility
    customerAddress: String,

    // Order Items
    products: [{
        productId: String,
        name: String,
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        total: Number
    }],

    // Order Totals
    subtotal: Number,
    tax: Number,
    shipping: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },

    // Payment & Order Status
    paymentMethod: {
        type: String,
        enum: ['cod', 'card', 'upi', 'cash-on-delivery'],
        default: 'cod'
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },

    // Notes & Tracking
    notes: String,
    orderId: String,
    trackingNumber: String,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Note: Order ID and derived fields are now set in the route layer

module.exports = mongoose.model('Order', OrderSchema);
