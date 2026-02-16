const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

        const skip = (page - 1) * limit;
        let sortOption = { createdAt: -1 };

        if (sortBy === 'helpful') {
            sortOption = { helpful: -1, createdAt: -1 };
        } else if (sortBy === 'rating-high') {
            sortOption = { rating: -1 };
        } else if (sortBy === 'rating-low') {
            sortOption = { rating: 1 };
        }

        const reviews = await Review.find({ productId })
            .populate('userId', 'name profileImage')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .exec();

        const total = await Review.countDocuments({ productId });

        return res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
});

// Add a new review
router.post('/', async (req, res) => {
    try {
        const { productId, userId, rating, title, comment, reviewerName } = req.body;

        // Validate required fields
        if (!rating || !title || !comment) {
            return res.status(400).json({ success: false, message: 'Rating, title, and comment are required' });
        }

        // If productId is provided, validate it exists
        let product = null;
        if (productId) {
            product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }
        }

        // Check if user has purchased this product (for verified badge)
        let verified = false;
        if (productId && userId) {
            const order = await Order.findOne({
                customerId: userId,
                'products.productId': productId,
                orderStatus: { $in: ['delivered', 'completed'] }
            });
            verified = !!order;
        }

        // Create review
        const reviewData = {
            rating,
            title,
            comment,
            verified,
            reviewerName: reviewerName || 'Anonymous'
        };

        // Only add productId and userId if they exist
        if (productId) reviewData.productId = productId;
        if (userId) reviewData.userId = userId;

        const review = new Review(reviewData);
        await review.save();

        // Update product rating if productId exists
        if (productId) {
            const allReviews = await Review.find({ productId });
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            
            const ratingBreakdown = {
                5: allReviews.filter(r => r.rating === 5).length,
                4: allReviews.filter(r => r.rating === 4).length,
                3: allReviews.filter(r => r.rating === 3).length,
                2: allReviews.filter(r => r.rating === 2).length,
                1: allReviews.filter(r => r.rating === 1).length
            };

            await Product.findByIdAndUpdate(productId, {
                averageRating: avgRating,
                totalReviews: allReviews.length,
                ratingBreakdown
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: review
        });
    } catch (error) {
        console.error('Error adding review:', error);
        return res.status(500).json({ success: false, message: 'Error adding review', error: error.message });
    }
});

// Update review
router.put('/:reviewId', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, title, comment } = req.body;

        const review = await Review.findByIdAndUpdate(
            reviewId,
            { rating, title, comment, updatedAt: Date.now() },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Update product rating
        const allReviews = await Review.find({ productId: review.productId });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        const ratingBreakdown = {
            5: allReviews.filter(r => r.rating === 5).length,
            4: allReviews.filter(r => r.rating === 4).length,
            3: allReviews.filter(r => r.rating === 3).length,
            2: allReviews.filter(r => r.rating === 2).length,
            1: allReviews.filter(r => r.rating === 1).length
        };

        await Product.findByIdAndUpdate(review.productId, {
            averageRating: avgRating,
            totalReviews: allReviews.length,
            ratingBreakdown
        });

        return res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Error updating review:', error);
        return res.status(500).json({ success: false, message: 'Error updating review', error: error.message });
    }
});

// Delete review
router.delete('/:reviewId', async (req, res) => {
    try {
        const { reviewId } = req.params;

        const review = await Review.findByIdAndDelete(reviewId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Update product rating
        const allReviews = await Review.find({ productId: review.productId });
        
        if (allReviews.length > 0) {
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            const ratingBreakdown = {
                5: allReviews.filter(r => r.rating === 5).length,
                4: allReviews.filter(r => r.rating === 4).length,
                3: allReviews.filter(r => r.rating === 3).length,
                2: allReviews.filter(r => r.rating === 2).length,
                1: allReviews.filter(r => r.rating === 1).length
            };

            await Product.findByIdAndUpdate(review.productId, {
                averageRating: avgRating,
                totalReviews: allReviews.length,
                ratingBreakdown
            });
        } else {
            await Product.findByIdAndUpdate(review.productId, {
                averageRating: 0,
                totalReviews: 0,
                ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        return res.status(500).json({ success: false, message: 'Error deleting review', error: error.message });
    }
});

// Mark review as helpful
router.put('/:reviewId/helpful', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await Review.findByIdAndUpdate(
            reviewId,
            { $inc: { helpful: 1 } },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Error marking helpful:', error);
        return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }
});

module.exports = router;
