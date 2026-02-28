const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Product = require('../models/Product');
const User = require('../models/User');

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kcp_organics';

async function run() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to', mongoUri);

    // OPTIONAL: clear existing data (comment out if you don't want this)
    // await Product.deleteMany({});
    // await User.deleteMany({});

    const products = [
      {
        name: 'Mixed Seeds Mix',
        slug: 'mixed-seeds-mix',
        description: 'Nutritious blend of sunflower, pumpkin, and sesame seeds. A superfood snack perfect for health-conscious individuals.',
        shortDescription: 'Nutritious blend of sunflower, pumpkin, and sesame seeds.',
        price: 120,
        originalPrice: 150,
        discount: 20,
        cost: 60,
        stock: 100,
        sku: 'SEEDS-001',
        image: 'mixed-seeds.jpg',
        images: [],
        category: 'snacks',
        tags: ['seeds','snacks','organic']
      },
      {
        name: 'Pure Honey',
        slug: 'pure-honey',
        description: 'Raw, unfiltered honey sourced from local beekeepers.',
        shortDescription: 'Raw, unfiltered honey.',
        price: 299,
        stock: 50,
        sku: 'HONEY-001',
        image: 'honey.jpg',
        category: 'sweeteners',
        tags: ['honey','organic']
      }
    ];

    const inserted = await Product.insertMany(products, { ordered: false });
    console.log('Inserted products:', inserted.length);

    // Create an admin user example (password stored as plain text here — change as needed)
    const admin = new User({ name: 'Admin', email: 'admin@kcp.local', number: '0000000000', password: 'admin123', role: 'admin' });
    await admin.save();
    console.log('Admin user created:', admin.email);

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding:', err.message || err);
    process.exit(1);
  }
}

run();
