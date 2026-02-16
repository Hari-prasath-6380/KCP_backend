const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Get user wishlist
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        let wishlist = await Wishlist.findOne({ userId }).populate('items.productId');

        if (!wishlist) {
            // Create new wishlist if doesn't exist
            wishlist = new Wishlist({ userId, items: [] });
            await wishlist.save();
        }

        return res.status(200).json({
            success: true,
            data: wishlist
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        return res.status(500).json({ success: false, message: 'Error fetching wishlist', error: error.message });
    }
});

// Add to wishlist
router.post('/:userId/add', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [{ productId }] });
        } else {
            // Check if product already in wishlist
            const exists = wishlist.items.find(item => item.productId.toString() === productId);
            if (!exists) {
                wishlist.items.push({ productId });
            }
        }

        await wishlist.save();

        // Update product wishlist count
        await Product.findByIdAndUpdate(productId, {
            $inc: { wishlistCount: 1 }
        });

        return res.status(200).json({
            success: true,
            message: 'Added to wishlist',
            data: wishlist
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({ success: false, message: 'Error adding to wishlist', error: error.message });
    }
});

// Remove from wishlist
router.post('/:userId/remove', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId);
        await wishlist.save();

        // Update product wishlist count
        await Product.findByIdAndUpdate(productId, {
            $inc: { wishlistCount: -1 }
        });

        return res.status(200).json({
            success: true,
            message: 'Removed from wishlist',
            data: wishlist
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return res.status(500).json({ success: false, message: 'Error removing from wishlist', error: error.message });
    }
});

// Check if product in wishlist
router.get('/:userId/check/:productId', async (req, res) => {
    try {
        const { userId, productId } = req.params;

        const wishlist = await Wishlist.findOne({
            userId,
            'items.productId': productId
        });

        return res.status(200).json({
            success: true,
            inWishlist: !!wishlist
        });
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }
});

module.exports = router;
