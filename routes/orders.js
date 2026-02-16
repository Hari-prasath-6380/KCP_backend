const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { sendOrderTelegram } = require('../services/notificationService');

// Get order count - MUST come before /:id route
router.get('/count/pending', async (req, res) => {
    try {
        const count = await Order.countDocuments({ orderStatus: 'pending' });
        res.status(200).json({ success: true, pendingCount: count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Track order by Order ID or MongoDB ID and phone number
router.post('/track', async (req, res) => {
    try {
        const { orderId, mobileNumber } = req.body;

        if (!orderId || !mobileNumber) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Mobile Number are required'
            });
        }

        // Normalize phone number - remove all non-digit characters for comparison
        const normalizedPhone = mobileNumber.replace(/\D/g, '');
        
        // Find all orders matching the orderId (custom or MongoDB ID)
        let orderQuery = { orderId: orderId };
        
        // Check if orderId is a valid MongoDB ObjectId
        if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
            orderQuery = { _id: orderId };
        }

        // Get the order first
        const order = await Order.findOne(orderQuery);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        // Verify phone number - normalize the stored phone number too
        const storedPhone = order.customerPhone.replace(/\D/g, '');
        
        // Check if normalized phone numbers match
        if (!storedPhone.includes(normalizedPhone) && normalizedPhone !== storedPhone) {
            return res.status(404).json({
                success: false,
                message: 'Phone number does not match this order.'
            });
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('Order tracking error:', error);
        res.status(500).json({ success: false, message: 'Error tracking order: ' + error.message });
    }
});

// Get all orders
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single order by ID
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new order
router.post('/', async (req, res) => {
    console.log('[POST /api/orders] Received request');
    // Temporary short-circuit to isolate upstream middleware issues
    if (process.env.ORDER_BYPASS === '1') {
        return res.status(201).json({ success: true, message: 'Bypass OK' });
    }
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            zipcode,
            country = 'India',
            instructions,
            paymentMethod = 'cod',
            products = [],
            totalAmount,
            notes
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !phone || !address || !city || !state || !zipcode || !products.length || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        console.log('[POST /api/orders] Validation OK');
        // Create new order
        const generatedOrderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const newOrder = new Order({
            firstName,
            lastName,
            customerName: `${firstName} ${lastName}`,
            customerEmail: email,
            customerPhone: phone,
            address,
            city,
            state,
            zipcode,
            country,
            instructions,
            customerAddress: `${address}, ${city}, ${state} ${zipcode}`,
            products: products.map(item => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.quantity * item.price
            })),
            totalAmount,
            paymentMethod,
            notes,
            orderStatus: 'pending',
            paymentStatus: 'pending',
            orderId: generatedOrderId,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('[POST /api/orders] Saving order...');
        await newOrder.save();
        console.log('[POST /api/orders] Order saved');

        // Prepare order details for notifications
        const orderDetails = {
            orderId: newOrder.orderId || newOrder._id.toString().substring(0, 8).toUpperCase(),
            customerName: `${firstName} ${lastName}`,
            customerEmail: email,
            customerPhone: phone,
            address: `${address}, ${city}, ${state} ${zipcode}`,
            amount: totalAmount,
            items: products.length,
            products: products,
            paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod.toUpperCase()
        };

        // Send notifications asynchronously (don't wait for them)
        setImmediate(async () => {
            try {
                console.log('[POST /api/orders] Starting Telegram notification...');
                
                // Send Telegram notification (FREE) to admin
                await sendOrderTelegram(orderDetails);
                console.log('[POST /api/orders] ✅ Telegram notification sent successfully');
            } catch (error) {
                console.error('[POST /api/orders] ❌ Telegram notification error:', error.message);
            }
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: newOrder
        });

    } catch (error) {
        console.error('Order creation error:', error && error.stack ? error.stack : error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create order'
        });
    }
});

// Update order status
router.put('/:id', async (req, res) => {
    try {
        const { orderStatus, notes, trackingNumber } = req.body;
        
        const updateData = {
            updatedAt: new Date()
        };

        if (orderStatus) updateData.orderStatus = orderStatus;
        if (notes) updateData.notes = notes;
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({ success: true, message: 'Order updated successfully', data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id);
        if (!deletedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.status(200).json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
