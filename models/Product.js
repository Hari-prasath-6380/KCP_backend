const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // Basic Info
    name: { type: String, required: true, index: true },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 200 },
    
    // Pricing & Inventory
    price: { type: Number, required: true },
    originalPrice: { type: Number }, // for showing discounts
    discount: { type: Number, default: 0 }, // discount percentage
    cost: { type: Number }, // cost price for admin
    stock: { type: Number, default: 0, index: true },
    sku: { type: String, unique: true, sparse: true },
    
    // Unit Information (for litre/kg pricing)
    units: [
        {
            unit: { type: String, enum: ['kg', 'litre', 'ml', 'g', 'piece'], required: true },
            quantity: { type: Number, required: true }, // e.g., 1 for 1kg, 500 for 500ml
            price: { type: Number, required: true },
            stock: { type: Number, default: 0 },
            sku: String
        }
    ],
    
    // Images & Media
    image: { type: String, default: 'product.jpg' },
    images: [{ type: String }], // multiple product images
    thumbnail: { type: String },
    
    // Categorization
    category: { type: String, required: true, index: true },
    subCategory: { type: String },
    tags: [{ type: String }],
    
    // Variants (size, weight, etc.)
    variants: [
        {
            name: String, // e.g., "Weight", "Size"
            options: [String] // e.g., ["500g", "1kg", "2kg"]
        }
    ],
    
    // Attributes
    attributes: {
        organic: { type: Boolean, default: true },
        glutenFree: { type: Boolean, default: false },
        vegan: { type: Boolean, default: false },
        nonGMO: { type: Boolean, default: true },
        weight: String, // e.g., "500g"
        origin: String,
        harvestDate: Date,
        expiryDate: Date,
        storageInstructions: String
    },
    
    // Ratings & Reviews
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    ratingBreakdown: {
        5: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        1: { type: Number, default: 0 }
    },
    
    // SEO
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    
    // Tracking
    views: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    
    // Status & Visibility
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
    saleStartDate: Date,
    saleEndDate: Date,
    
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create text index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Index for filtering and sorting
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ sales: -1 });

module.exports = mongoose.model('Product', productSchema);
