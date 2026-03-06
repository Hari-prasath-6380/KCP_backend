require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
console.log('Testing MongoDB URI:', uri ? uri.replace(/:[^:@]+@/, ':********@') : 'MONGODB_URI not set');

mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('Connected OK');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connect failed');
    console.error(err);
    process.exit(1);
  });
