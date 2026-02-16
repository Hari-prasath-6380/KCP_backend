const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products with pagination
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, category, sortBy = 'newest' } = req.query;
        const skip = (page - 1) * limit;

        let query = { isActive: true };
        if (category) query.category = category;

        let sortOption = { createdAt: -1 };
        if (sortBy === 'price-asc') sortOption = { price: 1 };
        if (sortBy === 'price-desc') sortOption = { price: -1 };
        if (sortBy === 'rating') sortOption = { averageRating: -1 };
        if (sortBy === 'popular') sortOption = { sales: -1 };

        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        res.status(200).json({
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
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        // Increment views
        await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create product (with full fields)
router.post('/', async (req, res) => {
    try {
        const {
            name,
            slug,
            description,
            shortDescription,
            price,
            originalPrice,
            discount,
            cost,
            stock,
            sku,
            image,
            images,
            category,
            subCategory,
            tags,
            variants,
            attributes,
            units,
            metaTitle,
            metaDescription,
            metaKeywords,
            isFeatured,
            isActive
        } = req.body;

        if (!name || !description || !price || !category) {
            return res.status(400).json({ success: false, message: 'Required fields missing' });
        }

        // Generate slug if not provided
        const productSlug = slug || name.toLowerCase().replace(/\s+/g, '-');

        const newProduct = new Product({
            name,
            slug: productSlug,
            description,
            shortDescription: shortDescription || description.substring(0, 200),
            price,
            originalPrice: originalPrice || price,
            discount: discount || 0,
            cost,
            stock: stock || 0,
            sku,
            image: image || 'product.jpg',
            images: images || [],
            category,
            subCategory,
            tags: tags || [],
            variants: variants || [],
            units: units || [], // Add units for kg/litre pricing
            attributes: attributes || {},
            metaTitle: metaTitle || name,
            metaDescription: metaDescription || shortDescription,
            metaKeywords: metaKeywords || [],
            isFeatured: isFeatured || false,
            isActive: isActive !== undefined ? isActive : true
        });

        await newProduct.save();
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: newProduct
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    try {
        const updates = req.body;
        
        // If name is updated, regenerate slug
        if (updates.name && !updates.slug) {
            updates.slug = updates.name.toLowerCase().replace(/\s+/g, '-');
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { ...updates, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Bulk update product status
router.put('/bulk/status', async (req, res) => {
    try {
        const { productIds, isActive } = req.body;

        if (!Array.isArray(productIds)) {
            return res.status(400).json({ success: false, message: 'Product IDs must be an array' });
        }

        const result = await Product.updateMany(
            { _id: { $in: productIds } },
            { isActive, updatedAt: Date.now() }
        );

        res.status(200).json({
            success: true,
            message: `Updated ${result.modifiedCount} products`,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get low stock products (admin)
router.get('/admin/low-stock', async (req, res) => {
    try {
        const { threshold = 10 } = req.query;

        const products = await Product.find({
            stock: { $lte: parseInt(threshold) }
        }).sort({ stock: 1 });

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
