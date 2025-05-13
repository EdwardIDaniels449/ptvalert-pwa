// Script to generate VAPID keys for Web Push notifications
const webPush = require('web-push');

// Generate VAPID keys
const vapidKeys = webPush.generateVAPIDKeys();

console.log('VAPID Public Key:', vapidKeys.publicKey);
console.log('VAPID Private Key:', vapidKeys.privateKey);

// Instructions for adding keys to wrangler.toml
console.log('\nAdd these keys to your wrangler.toml file:');
console.log(`VAPID_PUBLIC_KEY = "${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY = "${vapidKeys.privateKey}"`); 