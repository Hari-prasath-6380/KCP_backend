const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Advanced search with filters
router.get('/search', async (req, res) => {
    try {
        const {
            q, // search query
            category,
            minPrice,
            maxPrice,
            rating,
            organic,
            glutenFree,
            vegan,
            sortBy = 'relevance',
            page = 1,
            limit = 20
        } = req.query;

        let query = { isActive: true };

        // Text search
        if (q) {
            query.$text = { $search: q };
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Rating filter
        if (rating) {
            query.averageRating = { $gte: parseFloat(rating) };
        }

        // Attributes filter
        if (organic === 'true') query['attributes.organic'] = true;
        if (glutenFree === 'true') query['attributes.glutenFree'] = true;
        if (vegan === 'true') query['attributes.vegan'] = true;

        // Sorting
        let sortOption = {};
        switch (sortBy) {
            case 'price-asc':
                sortOption = { price: 1 };
                break;
            case 'price-desc':
                sortOption = { price: -1 };
                break;
            case 'rating':
                sortOption = { averageRating: -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'popular':
                sortOption = { sales: -1 };
                break;
            case 'relevance':
            default:
                sortOption = { score: { $meta: 'textScore' } };
        }

        // Pagination
        const skip = (page - 1) * limit;

        // Execute query
        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .select('name slug price originalPrice discount image averageRating totalReviews stock category');

        const total = await Product.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error searching products:', error);
        return res.status(500).json({ success: false, message: 'Error searching products', error: error.message });
    }
});

// Get categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await Product.distinct('category', { isActive: true });
        const categoriesWithCount = await Promise.all(
            categories.map(async (cat) => ({
                name: cat,
                count: await Product.countDocuments({ category: cat, isActive: true })
            }))
        );

        return res.status(200).json({
            success: true,
            data: categoriesWithCount
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }
});

// Get featured products
router.get('/featured', async (req, res) => {
    try {
        const featured = await Product.find({
            isActive: true,
            isFeatured: true
        }).limit(12).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: featured
        });
    } catch (error) {
        console.error('Error fetching featured:', error);
        return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }
});

// Get on-sale products
router.get('/on-sale', async (req, res) => {
    try {
        const now = new Date();
        const onSale = await Product.find({
            isActive: true,
            isOnSale: true,
            saleStartDate: { $lte: now },
            saleEndDate: { $gte: now }
        }).limit(20).sort({ discount: -1 });

        return res.status(200).json({
            success: true,
            data: onSale
        });
    } catch (error) {
        console.error('Error fetching on-sale:', error);
        return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }
});

// Get product by slug
router.get('/slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await Product.findOne({ slug, isActive: true })
            .populate({
                path: 'reviews',
                model: 'Review',
                populate: { path: 'userId', select: 'name profileImage' }
            });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Increment views
        await Product.findByIdAndUpdate(product._id, { $inc: { views: 1 } });

        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }
});

// Get related products
router.get('/:productId/related', async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const related = await Product.find({
            _id: { $ne: productId },
            category: product.category,
            isActive: true
        }).limit(6);

        return res.status(200).json({
            success: true,
            data: related
        });
    } catch (error) {
        console.error('Error fetching related:', error);
        return res.status(500).json({ success: false, message: 'Error', error: error.message });
    }
});

module.exports = router;
