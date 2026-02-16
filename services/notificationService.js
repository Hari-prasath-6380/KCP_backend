require('dotenv').config();

// ===== TELEGRAM CONFIGURATION (FREE - completely free forever) =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Admin notification details
const ADMIN_PHONE = process.env.ADMIN_PHONE || '6380442089';

// Send Telegram message (FREE)
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('📱 Telegram message (not configured):\n' + message);
        return false;
    }

    try {
        const https = require('https');
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const data = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });
        
        return new Promise((resolve) => {
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
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        console.log('✅ Telegram message sent successfully');
                        resolve(true);
                    } else {
                        console.log('⚠️ Telegram message sent but got status:', res.statusCode);
                        if (body) {
                            try {
                                const errorData = JSON.parse(body);
                                console.log('📋 Telegram Error Details:', errorData);
                            } catch (e) {
                                console.log('📋 Telegram Response:', body);
                            }
                        }
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Telegram error:', error.message);
                resolve(false);
            });

            req.write(data);
            req.end();
        });
    } catch (error) {
        console.error('❌ Error sending Telegram message:', error.message);
        return false;
    }
}

// Email configuration removed - Using Telegram only
// Email transporter removed to eliminate authentication errors
console.log('📱 Using Telegram notification service (FREE, fully configured)');

// SMS and WhatsApp removed - Using Telegram only
console.log('💬 SMS and WhatsApp services removed - Using Telegram instead');

// Send order notification via Telegram (FREE)
async function sendOrderTelegram(orderDetails) {
    try {
        // Build product list with full details
        let productsList = '';
        if (orderDetails.products && Array.isArray(orderDetails.products)) {
            orderDetails.products.forEach((product, index) => {
                const productName = product.name || 'Product';
                const productId = product.productId || 'N/A';
                const productPrice = product.price || 0;
                const quantity = product.quantity || 1;
                const total = (productPrice * quantity).toFixed(2);
                
                productsList += `${index + 1}. ${productName}\n   ID: ${productId}\n   Price: Rs.${productPrice}\n   Qty: ${quantity}\n   Total: Rs.${total}\n\n`;
            });
        }

        // Create detailed message with product information
        const message = `Order Confirmed!\n\nOrder ID: ${orderDetails.orderId}\nCustomer: ${orderDetails.customerName}\nPhone: ${orderDetails.customerPhone}\n\nPRODUCTS:\n${productsList}\nTotal Amount: Rs.${orderDetails.amount}\nPayment: ${orderDetails.paymentMethod}\nStatus: Pending\n\nDelivery Address:\n${orderDetails.address}\n\nTrack: Use Order ID and Mobile on track-order.html`;
        
        console.log('📱 Sending Telegram order notification to Chat ID:', TELEGRAM_CHAT_ID);
        const result = await sendTelegramMessage(message);
        
        if (result) {
            console.log('✅ Telegram order notification sent successfully');
        } else {
            console.log('⚠️ Telegram notification may not have been delivered');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error formatting Telegram order notification:', error.message);
        return false;
    }
}

// Admin notification removed - Using Telegram only
console.log('📨 Admin email notifications removed - Using Telegram instead');

module.exports = {
    sendOrderTelegram,
    sendTelegramMessage,
    ADMIN_PHONE
};
