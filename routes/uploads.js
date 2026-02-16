const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();

// Create uploads directories if they don't exist
const uploadsProductsDir = path.join(__dirname, '../uploads/products');
const uploadsVideosDir = path.join(__dirname, '../uploads/videos');

if (!fs.existsSync(uploadsProductsDir)) {
    fs.mkdirSync(uploadsProductsDir, { recursive: true });
}
if (!fs.existsSync(uploadsVideosDir)) {
    fs.mkdirSync(uploadsVideosDir, { recursive: true });
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
