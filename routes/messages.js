const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { sendTelegramMessage } = require('../services/notificationService');

// Get all messages
router.get('/', async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single message by ID
router.get('/:id', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get unread messages count
router.get('/count/unread', async (req, res) => {
    try {
        const count = await Message.countDocuments({ status: 'unread' });
        res.status(200).json({ success: true, unreadCount: count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create message and send notification to admin
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const newMessage = new Message({
            name,
            email,
            subject,
            message
        });

        await newMessage.save();
        
        // Send notification to admin via Telegram (free service)
        try {
            const telegramMessage = `📩 *New Message from Contact Form*\n\n👤 *From:* ${name}\n📧 *Email:* ${email}\n📝 *Subject:* ${subject}\n\n💬 *Message:*\n${message}`;
            await sendTelegramMessage(telegramMessage);
            console.log('✅ Telegram notification sent to admin');
        } catch (notifError) {
            console.error('⚠️ Failed to send Telegram notification:', notifError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { status: 'read' },
            { new: true }
        );
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.status(200).json({ success: true, message: 'Message marked as read', data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reply to message
router.post('/:id/reply', async (req, res) => {
    try {
        const { replyMessage } = req.body;
        
        if (!replyMessage) {
            return res.status(400).json({ success: false, message: 'Reply message is required' });
        }

        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'replied',
                reply: replyMessage,
                repliedAt: new Date()
            },
            { new: true }
        );
        
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        
        res.status(200).json({ success: true, message: 'Reply sent successfully', data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete message
router.delete('/:id', async (req, res) => {
    try {
        const message = await Message.findByIdAndDelete(req.params.id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.status(200).json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
