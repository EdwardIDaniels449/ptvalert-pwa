# PtvAlert Cloudflare Worker Setup Guide

This guide will walk you through setting up the Cloudflare Worker for PtvAlert, which handles push notifications and data storage using Cloudflare KV.

## Prerequisites

1. [Cloudflare Workers account](https://workers.cloudflare.com/) (free tier is sufficient to start)
2. [Node.js](https://nodejs.org/) installed (version 14 or higher)
3. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed

## Step 1: Generate VAPID Keys

Web Push requires VAPID (Voluntary Application Server Identification) keys. Let's generate them:

1. Create a directory for the keys:
   ```
   mkdir -p vapid-keys
   ```

2. Create a script to generate keys:
   ```js
   // generate-keys.js
   const webpush = require('web-push');
   
   const vapidKeys = webpush.generateVAPIDKeys();
   
   console.log('VAPID Public Key:', vapidKeys.publicKey);
   console.log('VAPID Private Key:', vapidKeys.privateKey);
   ```

3. Install the web-push package:
   ```
   npm install web-push
   ```

4. Run the script:
   ```
   node generate-keys.js
   ```

5. Save these keys securely - you'll need them later.

## Step 2: Create KV Namespaces

Cloudflare KV is used for data storage. Create the needed namespaces:

```bash
# Login to Cloudflare if you haven't already
wrangler login

# Create the KV namespaces
wrangler kv:namespace create SUBSCRIPTIONS
wrangler kv:namespace create MARKERS  
wrangler kv:namespace create ADMIN_USERS
wrangler kv:namespace create BANNED_USERS

# Also create preview namespaces for development
wrangler kv:namespace create SUBSCRIPTIONS --preview
wrangler kv:namespace create MARKERS --preview
wrangler kv:namespace create ADMIN_USERS --preview
wrangler kv:namespace create BANNED_USERS --preview
```

Take note of the namespace IDs returned for each namespace, as you'll need them for the configuration.

## Step 3: Configure wrangler.toml

Edit your `wrangler.toml` file with the KV namespace IDs and VAPID keys:

```toml
name = "ptvalert"
main = "cloudflare-worker.js"
compatibility_date = "2023-10-02"
usage_model = "bundled"
node_compat = true

# Triggers for scheduled tasks
[triggers]
crons = ["0 * * * *"] # Run hourly

# KV Namespaces bindings
[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "YOUR_SUBSCRIPTIONS_KV_ID" 
preview_id = "YOUR_SUBSCRIPTIONS_PREVIEW_KV_ID"

[[kv_namespaces]]
binding = "MARKERS"
id = "YOUR_MARKERS_KV_ID"
preview_id = "YOUR_MARKERS_PREVIEW_KV_ID"

[[kv_namespaces]]
binding = "ADMIN_USERS"
id = "YOUR_ADMIN_USERS_KV_ID"
preview_id = "YOUR_ADMIN_USERS_PREVIEW_KV_ID"

[[kv_namespaces]]
binding = "BANNED_USERS"
id = "YOUR_BANNED_USERS_KV_ID"
preview_id = "YOUR_BANNED_USERS_PREVIEW_KV_ID"

# Environment variables
[vars]
VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY"
VAPID_PRIVATE_KEY = "YOUR_VAPID_PRIVATE_KEY"
```

Replace the placeholders with your actual KV namespace IDs and VAPID keys.

## Step 4: Deploy the Worker

Deploy your worker to Cloudflare:

```bash
wrangler publish
```

## Step 5: Update Client-Side Code

Update your frontend code to use the Cloudflare Worker endpoints instead of Firebase:

### Key changes needed:

1. **Push notification subscription**:
   - Replace Firebase Cloud Messaging with Web Push API
   - Update the subscription endpoint to use your Cloudflare Worker

2. **Data storage**:
   - Replace Firebase Realtime Database with Cloudflare Worker API calls

3. **Authentication**:
   - Implement a simplified authentication mechanism using your Cloudflare Worker

### Example client code for push notifications:

```javascript
// Request permission and subscribe to push notifications
async function subscribeUserToPush() {
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission not granted for Notification');
    }
    
    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get the push subscription
    let subscription = await registration.pushManager.getSubscription();
    
    // If no subscription exists, create one
    if (!subscription) {
      // Get the VAPID public key from the server
      const response = await fetch('/api/vapid-public-key');
      const vapidData = await response.json();
      
      if (!vapidData.publicKey) {
        throw new Error('No VAPID public key available');
      }
      
      // Convert the VAPID public key to the required format
      const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);
      
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }
    
    // Send the subscription to the server
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription,
        userId: currentUserId // Your user ID variable
      }),
    });
    
    console.log('User subscribed to push notifications');
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

// Helper function to convert a base64 string to a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
```

## Step 6: Testing

Test your setup to ensure everything is working:

1. **Test Push Notifications**:
   - Subscribe to push notifications
   - Send a test notification using the `/api/send-notification` endpoint

2. **Test Data Storage**:
   - Add a marker using the `/api/markers` endpoint
   - Retrieve markers to verify they're stored correctly

## Troubleshooting

### Common Issues:

1. **Push notifications not working**:
   - Check that your VAPID keys are correctly configured
   - Ensure the service worker is registered and active
   - Verify that the subscription is saved in the KV storage

2. **KV storage issues**:
   - Check that the KV namespace IDs are correct in wrangler.toml
   - Verify that the worker has permission to access the KV namespaces

3. **CORS errors**:
   - Ensure the CORS headers are correctly set in the worker
   - Check that the worker is responding with the appropriate headers

### Debugging Tips:

- Use `wrangler tail` to see real-time logs from your worker
- Check the browser console for client-side errors
- Verify KV namespace contents using `wrangler kv:key get` commands

## Next Steps

After successful deployment, consider these improvements:

1. **Add authentication** - Implement a more secure authentication system
2. **Optimize KV usage** - Consider caching frequently accessed data
3. **Add analytics** - Track usage patterns to improve your application
4. **Set up monitoring** - Monitor your worker's performance and errors

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Web Push Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/) 