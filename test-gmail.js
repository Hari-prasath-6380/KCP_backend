// Quick test to diagnose Gmail authentication issue
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔍 Diagnosing Gmail Authentication...\n');

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASSWORD;

console.log(`📧 Email User: ${emailUser}`);
console.log(`🔑 Password (masked): ${emailPass ? emailPass.substring(0, 4) + '...' : 'NOT SET'}`);
console.log(`📝 Password length: ${emailPass ? emailPass.length : 0} characters\n`);

if (!emailPass) {
    console.error('❌ EMAIL_PASSWORD is not set in .env file!');
    console.error('   Fix: Add EMAIL_PASSWORD=xxxx xxxx xxxx xxxx to .env\n');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass
    }
});

console.log('⏳ Testing Gmail connection...\n');

transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Gmail Authentication Failed!\n');
        console.error('Error Details:', error.message);
        console.error('\n🔧 Troubleshooting Steps:');
        console.error('1. Go to: https://myaccount.google.com/security');
        console.error('2. Enable 2-Step Verification (if not already enabled)');
        console.error('3. Go to: https://myaccount.google.com/apppasswords');
        console.error('4. Select "Mail" and "Windows Computer"');
        console.error('5. Copy the 16-character password (with spaces)');
        console.error('6. Paste it in .env as: EMAIL_PASSWORD=xxxx xxxx xxxx xxxx');
        console.error('7. Restart the server\n');
        process.exit(1);
    } else {
        console.log('✅ Gmail connection verified!\n');
        console.log('📧 Email configuration is correct.');
        console.log('   Orders will send notifications to customer and admin.\n');
        process.exit(0);
    }
});
