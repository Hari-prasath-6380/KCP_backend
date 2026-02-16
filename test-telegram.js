// Test Telegram Connection
require('dotenv').config();
const https = require('https');

console.log('🔍 Testing Telegram Configuration\n');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('📋 Checking Configuration:');
console.log(`   Bot Token: ${TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ NOT SET'}`);
console.log(`   Chat ID: ${TELEGRAM_CHAT_ID ? '✅ Set' : '❌ NOT SET'}\n`);

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ ERROR: Telegram credentials not configured!\n');
    console.log('📝 SETUP INSTRUCTIONS:\n');
    console.log('1. Open Telegram app');
    console.log('2. Search for: @BotFather');
    console.log('3. Send: /newbot');
    console.log('4. Follow instructions and copy BOT TOKEN\n');
    console.log('5. Search for: @userinfobot');
    console.log('6. Send: /start and copy your CHAT ID\n');
    console.log('7. Edit backend/.env and replace:');
    console.log('   TELEGRAM_BOT_TOKEN=your_actual_token');
    console.log('   TELEGRAM_CHAT_ID=your_actual_id\n');
    console.log('8. Restart this test\n');
    process.exit(1);
}

console.log('⏳ Sending test message to Telegram...\n');

const message = `
🧪 **TELEGRAM CONNECTION TEST**

✅ Bot is connected and working!
⏰ Time: ${new Date().toLocaleString()}
🖥️ Server: KCP Organics Backend
`;

const data = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML'
});

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
    
    res.on('data', (chunk) => {
        body += chunk;
    });
    
    res.on('end', () => {
        console.log(`📡 Response Status: ${res.statusCode}\n`);
        
        if (res.statusCode === 200) {
            const response = JSON.parse(body);
            console.log('✅ SUCCESS! Telegram connection verified!\n');
            console.log('📱 Check your Telegram app for the test message.');
            console.log('🎉 Your Telegram is ready to receive order notifications!\n');
            process.exit(0);
        } else {
            const response = JSON.parse(body);
            console.error('❌ FAILED! Response:');
            console.error(JSON.stringify(response, null, 2));
            
            if (response.description && response.description.includes('chat not found')) {
                console.error('\n⚠️ Chat ID is incorrect or bot is not started.');
                console.error('   Make sure you sent /start to your bot first!\n');
            }
            
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Connection Error:', error.message);
    console.error('\nMake sure you have internet connection.\n');
    process.exit(1);
});

req.write(data);
req.end();
