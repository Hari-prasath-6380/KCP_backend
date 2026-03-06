const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products with pagination
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, category, sortBy = 'newest' } = req.query;
        const skip = (page - 1) * limit;

        // Treat documents without `isActive` field as active (backwards compatibility)
        let query = { $or: [ { isActive: { $exists: false } }, { isActive: true } ] };
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
        console.error('Error creating product:', error && error.stack ? error.stack : error);
        if (error && error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        }
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

// Decrement stock (used when user adds to cart)
router.post('/:id/decrement', async (req, res) => {
    try {
        const { quantity = 1, unitIndex = null } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (unitIndex !== null && Array.isArray(product.units) && product.units[unitIndex]) {
            const unit = product.units[unitIndex];
            if (typeof unit.stock === 'number') {
                if (unit.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient unit stock' });
                unit.stock = unit.stock - quantity;
            } else {
                // fallback to product.stock
                if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
                product.stock = product.stock - quantity;
            }
        } else {
            if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
            product.stock = product.stock - quantity;
        }

        product.updatedAt = Date.now();
        await product.save();

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

        if (!name || !price) {
            return res.status(400).json({ success: false, message: 'Required fields missing: name and price are required' });
        }

        // Ensure category and description defaults
        const safeCategory = category || 'Uncategorized';
        const safeDescription = description || name;

        // Sanitize tags and images
        const safeTags = Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : (typeof tags === 'string' ? tags.split(/[,;]+/).map(t=>t.trim()).filter(Boolean) : []);
        const safeImages = Array.isArray(images) ? images.map(i => String(i).trim()).filter(Boolean) : (images ? [String(images).trim()] : []);

        // Sanitize units to match schema expectations
        let safeUnits = [];
        if (Array.isArray(units)) {
            safeUnits = units.map(u => {
                try {
                    const unitRaw = (u.unit || '').toString().toLowerCase();
                    let unitNorm = unitRaw;
                    if (/kg|kilogram|kilograms/.test(unitRaw)) unitNorm = 'kg';
                    if (/g|gram|grams/.test(unitRaw)) unitNorm = 'g';
                    if (/l|litre|liter|liters/.test(unitRaw)) unitNorm = 'litre';
                    if (/ml/.test(unitRaw)) unitNorm = 'ml';
                    if (/piece|pcs|pc|nos?/.test(unitRaw)) unitNorm = 'piece';

                    return {
                        unit: unitNorm || 'piece',
                        quantity: Number(u.quantity) || 1,
                        price: Number(u.price) || Number(price) || 0,
                        stock: Number(u.stock) || 0,
                        sku: u.sku || (sku || '')
                    };
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
        }

        // Generate slug if not provided
        const productSlug = slug || name.toLowerCase().replace(/\s+/g, '-');

        const newProduct = new Product({
            name,
            slug: productSlug,
            description: safeDescription,
            shortDescription: shortDescription || (safeDescription.substring ? safeDescription.substring(0, 200) : safeDescription),
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : Number(price),
            discount: discount ? Number(discount) : 0,
            cost: cost ? Number(cost) : undefined,
            stock: Number(stock) || 0,
            sku: sku || undefined,
            image: image || (safeImages[0] || 'product.jpg'),
            images: safeImages,
            category: safeCategory,
            subCategory,
            tags: safeTags,
            variants: variants || [],
            units: safeUnits,
            attributes: attributes || {},
            metaTitle: metaTitle || name,
            metaDescription: metaDescription || (shortDescription || safeDescription.substring(0,160)),
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
