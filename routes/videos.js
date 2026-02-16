const express = require('express');
const router = express.Router();
const Video = require('../models/Video');

// Get all active videos (for public display)
router.get('/', async (req, res) => {
    try {
        const { active = 'true', limit = 20, category } = req.query;
        
        let query = {};
        if (active === 'true') {
            query.isActive = true;
        }
        
        // Filter by category if provided
        if (category) {
            query.category = category;
        }

        const videos = await Video.find(query)
            .sort({ displayOrder: 1, createdAt: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all videos (admin - includes inactive)
router.get('/admin/all', async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = {};
        if (category) {
            query.category = category;
        }
        
        const videos = await Video.find(query)
            .sort({ displayOrder: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single video
router.get('/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }
        
        // Increment views
        await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        
        res.status(200).json({ success: true, data: video });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create video
router.post('/', async (req, res) => {
    try {
        const {
            title,
            videoUrl,
            thumbnailUrl,
            productId,
            productName,
            productLink,
            description,
            category,
            isActive,
            displayOrder
        } = req.body;

        if (!title || !videoUrl) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title and video URL are required' 
            });
        }

        const newVideo = new Video({
            title,
            videoUrl,
            thumbnailUrl: thumbnailUrl || '',
            productId: productId || null,
            productName: productName || '',
            productLink: productLink || '',
            description: description || '',
            category: category || 'General',
            isActive: isActive !== undefined ? isActive : true,
            displayOrder: displayOrder || 0
        });

        await newVideo.save();
        
        res.status(201).json({
            success: true,
            message: 'Video added successfully',
            data: newVideo
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update video
router.put('/:id', async (req, res) => {
    try {
        const updates = req.body;
        updates.updatedAt = Date.now();

        const video = await Video.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Video updated successfully',
            data: video
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete video
router.delete('/:id', async (req, res) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);

        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Video deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update video (PATCH)
router.patch('/:id', async (req, res) => {
    try {
        const updates = req.body;
        updates.updatedAt = Date.now();

        const video = await Video.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Video updated successfully',
            data: video
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Toggle video active status
router.patch('/:id/toggle', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        
        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        video.isActive = !video.isActive;
        video.updatedAt = Date.now();
        await video.save();

        res.status(200).json({
            success: true,
            message: `Video ${video.isActive ? 'activated' : 'deactivated'} successfully`,
            data: video
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update display order for multiple videos
router.post('/reorder', async (req, res) => {
    try {
        const { videos } = req.body; // Array of { id, displayOrder }
        
        if (!videos || !Array.isArray(videos)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Videos array is required' 
            });
        }

        const updates = videos.map(v => 
            Video.findByIdAndUpdate(v.id, { displayOrder: v.displayOrder })
        );
        
        await Promise.all(updates);

        res.status(200).json({
            success: true,
            message: 'Video order updated successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
