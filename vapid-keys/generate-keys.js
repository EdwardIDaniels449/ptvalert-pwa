const webpush = require('web-push');

// 生成VAPID密钥
const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== VAPID 密钥 ===');
console.log('公钥:', vapidKeys.publicKey);
console.log('私钥:', vapidKeys.privateKey);
console.log('\n复制这些密钥并安全保存。公钥将用于客户端订阅，私钥用于服务器发送推送通知。'); 