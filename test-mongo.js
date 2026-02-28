require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || '';

if (!uri) {
  console.error('No MONGODB_URI found in environment');
  process.exit(1);
}

console.log('Testing MongoDB URI:', uri.replace(/:(?:[^:@]+)@/, ':*****@'));

(async () => {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Test connection successful');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test connection failed:');
    console.error(err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
