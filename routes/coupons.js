const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// Get all active coupons
router.get('/', async (req, res) => {
    try {
        const now = new Date();

        const coupons = await Coupon.find({
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now }
        }).select('-usedBy');

        return res.status(200).json({
            success: true,
            data: coupons
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        return res.status(500).json({ success: false, message: 'Error fetching coupons', error: error.message });
    }
});

// Validate and apply coupon
router.post('/validate', async (req, res) => {
    try {
        const { code, userId, orderAmount, category } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required' });
        }

        const now = new Date();

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now }
        });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid or expired coupon' });
        }

        // Check usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit exceeded' });
        }

        // Check minimum order value
        if (orderAmount < coupon.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Minimum order value required: $${coupon.minOrderValue}`
            });
        }

        // Check category applicability
        if (coupon.applicableCategories.length > 0 && category) {
            if (!coupon.applicableCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon not applicable for this category'
                });
            }
        }

        // Check user usage limit
        let userUsageCount = 0;
        if (userId) {
            const userUsage = coupon.usedBy.find(u => u.userId.toString() === userId);
            userUsageCount = userUsage ? userUsage.usedCount : 0;

            if (userUsageCount >= coupon.usagePerUser) {
                return res.status(400).json({
                    success: false,
                    message: `You have reached the usage limit for this coupon`
                });
            }
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (orderAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else {
            discount = coupon.discountValue;
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            data: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discount: discount,
                description: coupon.description
            }
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        return res.status(500).json({ success: false, message: 'Error validating coupon', error: error.message });
    }
});

// Create coupon (admin only)
router.post('/', async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            usageLimit,
            usagePerUser,
            validFrom,
            validUntil,
            applicableCategories
        } = req.body;

        if (!code || !discountType || discountValue === undefined) {
            return res.status(400).json({ success: false, message: 'Required fields missing' });
        }

        // Check if coupon already exists
        const existing = await Coupon.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Coupon already exists' });
        }

        const coupon = new Coupon({
            code: code.toUpperCase(),
            description,
            discountType,
            discountValue,
            minOrderValue: minOrderValue || 0,
            maxDiscount,
            usageLimit,
            usagePerUser: usagePerUser || 1,
            validFrom: validFrom || new Date(),
            validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
            applicableCategories: applicableCategories || []
        });

        await coupon.save();

        return res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            data: coupon
        });
    } catch (error) {
        console.error('Error creating coupon:', error);
        return res.status(500).json({ success: false, message: 'Error creating coupon', error: error.message });
    }
});

// Update coupon (admin only)
router.put('/:couponId', async (req, res) => {
    try {
        const { couponId } = req.params;
        const updates = req.body;

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { ...updates, updatedAt: new Date() },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon updated successfully',
            data: coupon
        });
    } catch (error) {
        console.error('Error updating coupon:', error);
        return res.status(500).json({ success: false, message: 'Error updating coupon', error: error.message });
    }
});

// Delete coupon (admin only)
router.delete('/:couponId', async (req, res) => {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findByIdAndDelete(couponId);

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        return res.status(500).json({ success: false, message: 'Error deleting coupon', error: error.message });
    }
});

module.exports = router;
