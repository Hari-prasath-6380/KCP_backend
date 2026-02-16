// Minimal Telegram Test - Simple message only
require('dotenv').config();
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('Testing Telegram with minimal message...\n');

const message = 'Test message - Order received';

const data = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message
});

console.log('Sending to Chat ID:', TELEGRAM_CHAT_ID);
console.log('Message:', message);
console.log('Data:', data, '\n');

const options = {
    hostname: 'api.telegram.org',
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    console.log('Response Status:', res.statusCode);
    
    res.on('data', (chunk) => body += chunk);
    
    res.on('end', () => {
        console.log('\nResponse Body:');
        console.log(body);
        
        try {
            const parsed = JSON.parse(body);
            console.log('\nParsed Response:');
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('(Could not parse as JSON)');
        }
        
        process.exit(res.statusCode === 200 ? 0 : 1);
    });
});

req.on('error', (error) => {
    console.error('Error:', error.message);
    process.exit(1);
});

req.write(data);
req.end();
