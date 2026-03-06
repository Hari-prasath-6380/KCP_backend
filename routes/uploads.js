const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mammoth = require('mammoth');
const Product = require('../models/Product');
const router = express.Router();

// Create uploads directories if they don't exist
const uploadsProductsDir = path.join(__dirname, '../uploads/products');
const uploadsVideosDir = path.join(__dirname, '../uploads/videos');
const uploadsDocsDir = path.join(__dirname, '../uploads/docs');

if (!fs.existsSync(uploadsProductsDir)) {
    fs.mkdirSync(uploadsProductsDir, { recursive: true });
}
if (!fs.existsSync(uploadsVideosDir)) {
    fs.mkdirSync(uploadsVideosDir, { recursive: true });
}
if (!fs.existsSync(uploadsDocsDir)) {
    fs.mkdirSync(uploadsDocsDir, { recursive: true });
}

// Configure multer for product image storage
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsProductsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

// Configure multer for video storage
const videoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsVideosDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

// Filter to only allow image files
const imageFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
};

// Filter to only allow video files
const videoFilter = (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only video files are allowed (MP4, WebM, OGG, MOV, AVI)'), false);
    }
};

// Create multer upload middleware for images
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Create multer upload middleware for videos
const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit for videos
    }
});

// Configure multer for docx storage
const docxStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDocsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

const docxFilter = (req, file, cb) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.docx')) {
        cb(null, true);
    } else {
        cb(new Error('Only .docx Word documents are allowed'), false);
    }
};

const uploadDocx = multer({ storage: docxStorage, fileFilter: docxFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Image upload endpoint
router.post('/upload', uploadImage.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Return the relative path to access the image
        const imagePath = `/uploads/products/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: imagePath,
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading file'
        });
    }
});

// Video upload endpoint with error handling
router.post('/upload-video', (req, res, next) => {
    uploadVideo.single('video')(req, res, function(err) {
        if (err) {
            console.error('Multer error:', err.message);
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload error'
            });
        }
        
        try {
            if (!req.file) {
                console.error('No file received in upload request');
                return res.status(400).json({
                    success: false,
                    message: 'No video file uploaded'
                });
            }

            // Return the relative path to access the video
            const videoPath = `/uploads/videos/${req.file.filename}`;

            console.log('✅ Video uploaded successfully:', videoPath);

            res.status(200).json({
                success: true,
                message: 'Video uploaded successfully',
                videoUrl: videoPath,
                filename: req.file.filename,
                data: {
                    videoUrl: videoPath,
                    filename: req.file.filename
                }
            });
        } catch (error) {
            console.error('❌ Error uploading video:', error.message);
            res.status(500).json({
                success: false,
                message: error.message || 'Error uploading video'
            });
        }
    });
});

// Docx upload endpoint - parses Word document and creates products (extracts embedded images)
router.post('/upload-docx', uploadDocx.single('docx'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const filePath = path.join(uploadsDocsDir, req.file.filename);
        console.log('📄 Received docx upload:', req.file.originalname, '->', filePath);

        // Convert docx to HTML and inline images as data URLs
        const result = await mammoth.convertToHtml({ path: filePath }, {
            convertImage: mammoth.images.inline(function(element) {
                return element.read('base64').then(function(imageBuffer) {
                    return { src: 'data:' + element.contentType + ';base64,' + imageBuffer };
                });
            })
        });

        const html = result.value || '';

        // Split into product blocks. Support paragraphs and headings (h1-h6) that start with Name/Product
        const blockRegex = /(<(?:p|h[1-6])[^>]*>\s*(?:Name|Product Name|Product):[\s\S]*?<\/(?:p|h[1-6])>)([\s\S]*?)(?=<(?:p|h[1-6])[^>]*>\s*(?:Name|Product Name|Product):|$)/gi;
        const parsed = [];
        const errors = [];
        let matchIndex = 0;

        const saveDataUrlImage = (dataUrl, prefix, idx) => {
            const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.*)$/);
            if (!m) return null;
            const contentType = m[1];
            const base64 = m[2];
            let ext = contentType.split('/')[1];
            if (ext === 'jpeg') ext = 'jpg';
            const filename = `${prefix}-${Date.now()}-${idx}.${ext}`;
            const outPath = path.join(uploadsProductsDir, filename);
            try {
                fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
                return `/uploads/products/${filename}`;
            } catch (e) {
                console.error('Error saving image from docx:', e);
                return null;
            }
        };

        let blockMatch;
        while ((blockMatch = blockRegex.exec(html)) !== null) {
            const headerHtml = blockMatch[1];
            const bodyHtml = blockMatch[2] || '';
            const blockHtml = headerHtml + bodyHtml;

            // Extract images in this block
            const imgRegex = /<img[^>]+src="([^"]+)"/gi;
            const images = [];
            let imgMatch, imgIdx = 0;
            while ((imgMatch = imgRegex.exec(blockHtml)) !== null) {
                const src = imgMatch[1];
                if (src && src.startsWith('data:')) {
                    const saved = saveDataUrlImage(src, 'docx-img', `${matchIndex}-${imgIdx}`);
                    if (saved) images.push(saved);
                }
                imgIdx++;
            }

            // Convert block HTML to plain lines for key:value parsing
            const blockText = blockHtml.replace(/<[^>]+>/g, '\n').replace(/&nbsp;|\u00a0/g, ' ');
            const lines = blockText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

            // Parse key:value lines
            const obj = {};
            for (const line of lines) {
                const m = line.match(/^([^:]+):\s*(.*)$/);
                if (m) {
                    const key = m[1].toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
                    obj[key] = m[2].trim();
                } else {
                    obj.description = (obj.description ? obj.description + '\n' : '') + line;
                }
            }

            // Map fields
            const name = obj['name'] || obj['product name'] || obj['product'];
            const description = obj['description'] || obj['details'] || obj['desc'] || '';
            const priceRaw = obj['price'] || obj['base price'] || obj['mrp'] || obj['cost'];
            const category = obj['category'] || 'Uncategorized';
            const stockRaw = obj['stock'] || obj['quantity'] || obj['stock (units)'] || '0';
            const sku = obj['sku'] || obj['id'] || '';
            const tags = obj['tags'] ? obj['tags'].split(/[,;]+/).map(t => t.trim()).filter(Boolean) : [];

            const price = priceRaw ? parseFloat(priceRaw.replace(/[^0-9.]/g, '')) : undefined;
            const stock = parseInt((stockRaw || '0').replace(/[^0-9]/g, '')) || 0;

            // Require at least name and price. Description can be inferred from remaining lines.
            if (!name || !price) {
                errors.push({ index: matchIndex, reason: 'Missing required fields (name or price)', parsed: obj, lines });
                matchIndex++;
                continue;
            }

            // Ensure description is present
            if (!description || description.trim().length === 0) {
                description = name;
            }

            // Ensure slug uniqueness by appending a docx marker and index timestamp
            const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
            const slug = `${baseSlug}-docx-${Date.now()}-${matchIndex}`;

            const productData = {
                name: name,
                slug: slug,
                description: description,
                shortDescription: (description || name).slice(0, 180),
                price: price,
                originalPrice: obj['original price'] ? parseFloat(obj['original price'].replace(/[^0-9.]/g, '')) : price,
                discount: obj['discount'] ? parseFloat(obj['discount'].replace(/[^0-9.]/g, '')) : 0,
                stock: stock,
                sku: sku || `DOCX-${Date.now()}-${matchIndex}`,
                category: category,
                tags: tags,
                image: images.length > 0 ? images[0] : (obj['image'] || 'product.jpg'),
                images: images.length > 0 ? images : (obj['images'] ? obj['images'].split(/[,;]+/).map(i=>i.trim()).filter(Boolean) : [])
            };

            // Parse units if provided (formats: "500g=150,1kg=250" or multiline entries like "500g:150")
            const unitsRaw = obj['units'] || obj['unit'] || obj['unit(s)'];
            if (unitsRaw) {
                const unitsArr = [];
                // split by comma or semicolon or pipe
                const parts = unitsRaw.split(/[;,|]+/).map(p => p.trim()).filter(Boolean);
                for (const part of parts) {
                    // match patterns like '500g=150' or '1kg:250' or '500 g - 150'
                    const m = part.match(/^(\d+(?:\.\d+)?)(\s*(kg|g|litre|l|ml|piece|pcs)?)\s*(?:[:=\-]\s*)?(\d+(?:\.\d+)?)(?:\s*\(stock\s*[:=]\s*(\d+)\))?/i);
                    if (m) {
                        let quantity = parseFloat(m[1]);
                        let unit = (m[3] || '').toLowerCase();
                        // normalize unit synonyms
                        if (/kg|kilogram|kilograms/i.test(unit)) unit = 'kg';
                        if (/g|gram|grams/i.test(unit)) unit = 'g';
                        if (/l|litre|liter|liters/i.test(unit)) unit = 'litre';
                        if (/ml/i.test(unit)) unit = 'ml';
                        if (/piece|pcs|pc|nos?/i.test(unit)) unit = 'piece';
                        if (!unit) {
                            // guess by magnitude: >1000 -> g or ml? leave as piece
                            unit = 'piece';
                        }
                        // normalize litre to litre
                        if (unit === 'l') unit = 'litre';
                        if (unit === 'pcs') unit = 'piece';
                        const price = parseFloat(m[4]);
                        const ustock = m[5] ? parseInt(m[5]) : (productData.stock || 0);
                        unitsArr.push({ unit, quantity, price, stock: ustock, sku: `${productData.sku}-${unit}-${quantity}` });
                    } else {
                        // try simple split like '500g 150' or '500g  - 150'
                        const m2 = part.match(/^(\d+(?:\.\d+)?)(\s*(kg|g|litre|l|ml|piece|pcs)?)\s+(\d+(?:\.\d+)?)/i);
                        if (m2) {
                            let quantity = parseFloat(m2[1]);
                            let unit = (m2[3] || '').toLowerCase();
                            if (/kg|kilogram|kilograms/i.test(unit)) unit = 'kg';
                            if (/g|gram|grams/i.test(unit)) unit = 'g';
                            if (/l|litre|liter|liters/i.test(unit)) unit = 'litre';
                            if (/ml/i.test(unit)) unit = 'ml';
                            if (/piece|pcs|pc|nos?/i.test(unit)) unit = 'piece';
                            if (unit === 'l') unit = 'litre';
                            if (unit === 'pcs') unit = 'piece';
                            const price = parseFloat(m2[4]);
                            unitsArr.push({ unit, quantity, price, stock: productData.stock || 0, sku: `${productData.sku}-${unit}-${quantity}` });
                        }
                    }
                }
                if (unitsArr.length > 0) productData.units = unitsArr;
            }

            parsed.push(productData);
            matchIndex++;
        }

        console.log(`Parsed ${parsed.length} product(s) from document, errors: ${errors.length}`);
        if (errors.length > 0) console.log('Parse errors preview:', JSON.stringify(errors.slice(0,5), null, 2));

        // If no products were parsed, try a fallback: treat the whole document as a single product
        if (parsed.length === 0) {
            try {
                const textAll = html.replace(/<[^>]+>/g, '\n').replace(/&nbsp;|\u00a0/g, ' ');
                const allLines = textAll.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                // Heuristics: first non-empty line -> name; find first price-like token -> price; rest -> description
                const maybeName = allLines[0] || null;
                let maybePrice;
                for (const l of allLines) {
                    const m = l.match(/(?:price[:\s]*|mrp[:\s]*|cost[:\s]*|₹|rs\.?|inr)?\s*([0-9]{1,3}(?:[,0-9]*)(?:\.[0-9]+)?)/i);
                    if (m) { maybePrice = parseFloat(m[1].replace(/,/g, '')); break; }
                }
                const maybeDescription = allLines.slice(1).join('\n');
                if (maybeName && maybePrice) {
                    const slug = maybeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                    const fallback = {
                        name: maybeName,
                        slug,
                        description: maybeDescription || maybeName,
                        shortDescription: (maybeDescription || maybeName).slice(0,180),
                        price: maybePrice,
                        originalPrice: maybePrice,
                        discount: 0,
                        stock: 0,
                        sku: `DOCX-FALLBACK-${Date.now()}`,
                        category: 'Uncategorized',
                        tags: [],
                        image: 'product.jpg'
                    };
                    parsed.push(fallback);
                    console.log('Fallback: parsed 1 product from entire document (heuristic)');
                } else {
                    console.log('Fallback parser did not find name+price');
                }
            } catch (fbErr) {
                console.error('Fallback parser error:', fbErr);
            }
        }

        // Insert parsed products
        let inserted = [];
        if (parsed.length > 0) {
            try {
                inserted = await Product.insertMany(parsed, { ordered: false });
            } catch (insertErr) {
                if (insertErr && insertErr.insertedDocs) inserted = insertErr.insertedDocs;
            }
        }

        console.log('Inserted products count:', inserted.length);

        // remove the uploaded docx after processing
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

        res.json({ success: true, message: 'Parsed document', created: inserted.length, errors });
    } catch (error) {
        console.error('Error parsing docx:', error);
        res.status(500).json({ success: false, message: error.message || 'Error parsing document' });
    }
});

// Delete file endpoint
router.delete('/delete/:type/:filename', (req, res) => {
    try {
        const { type, filename } = req.params;
        let filePath;
        
        if (type === 'products') {
            filePath = path.join(uploadsProductsDir, filename);
        } else if (type === 'videos') {
            filePath = path.join(uploadsVideosDir, filename);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type'
            });
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.status(200).json({
                success: true,
                message: 'File deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting file'
        });
    }
});

module.exports = router;
