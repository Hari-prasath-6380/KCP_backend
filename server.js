// server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

/* ===============================
   MIDDLEWARE
   =============================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   STATIC FILES
   =============================== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static files from the parent directory (root of the project)
app.use(express.static(path.join(__dirname, '..')));

/* ===============================
   DATABASE
   =============================== */
mongoose
    .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kcp_organics')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

/* ===============================
   MODELS
   =============================== */
const User = require('./models/User');

/* ===============================
   ROUTES
   =============================== */
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/admins'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/wishlist', require('./routes/wishlists'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/search', require('./routes/search'));
app.use('/api/videos', require('./routes/videos'));

/* ===============================
   AUTH ROUTES
   =============================== */
app.post('/user/signup', async (req, res) => {
    try {
        const { name, email, number, password, role } = req.body;

        if (!name || !email || !number || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = new User({ name, email, number, password, role });
        await user.save();

        res.status(201).json({
            message: 'Signup successful',
            data: { id: user._id, _id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/user/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.json({
            message: `Welcome ${user.name}`,
            data: { id: user._id, _id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ===============================
   HEALTH
   =============================== */
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

/* ===============================
   ERROR HANDLER
   =============================== */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message || 'Server error' });
});

/* ===============================
   404
   =============================== */
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

/* ===============================
   START
   =============================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
