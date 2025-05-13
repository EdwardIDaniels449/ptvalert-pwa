# PtvAlert

PtvAlert is a Progressive Web App (PWA) for sharing and receiving real-time transit information and alerts in Melbourne. This version uses Cloudflare Workers and KV storage instead of Firebase for backend functionality.

## Features

- **Real-time map markers**: Users can add markers on the map to share information about transit issues or events
- **Push notifications**: Receive instant notifications about new markers in your area
- **Offline support**: The app works even when you're offline using IndexedDB
- **PWA features**: Install to home screen, offline access, and push notifications
- **Multi-language support**: Available in English and Chinese

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Map**: Leaflet.js
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare KV
- **Push Notifications**: Web Push API
- **Offline Storage**: IndexedDB

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- A Cloudflare account with Workers enabled

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ptvalert.git
   cd ptvalert
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Generate VAPID keys for push notifications:
   ```
   npm run generate-keys
   ```

4. Update the `wrangler.toml` file with your KV namespace IDs and VAPID keys.

5. Deploy the Cloudflare Worker:
   ```
   npm run publish
   ```

6. Update the API_BASE_URL in `js/notification-handler.js` to your Cloudflare Worker URL.

## Directory Structure

```
├── cloudflare-setup-guide.md   # Guide for setting up Cloudflare Workers
├── cloudflare-worker.js        # Main Cloudflare Worker code
├── generate-keys.js            # Script to generate VAPID keys
├── images/                     # App icons and images
├── index.html                  # Main app page
├── js/                         # JavaScript files
│   └── notification-handler.js # Push notification handling
├── login.html                  # User login page
├── manifest.json               # Web app manifest
├── offline.html                # Offline fallback page
├── package.json                # Project dependencies
├── service-worker.js           # Service worker for PWA functionality
└── wrangler.toml               # Cloudflare Workers configuration
```

## Cloudflare KV Namespaces

The app uses the following KV namespaces:

1. **SUBSCRIPTIONS**: Stores push notification subscriptions
2. **MARKERS**: Stores map marker data
3. **ADMIN_USERS**: Stores admin user IDs
4. **BANNED_USERS**: Stores banned user information

## Admin Functions

To set a user as admin:

1. Use the make-admin.html tool
2. Or use the admin panel in the app (if you already have admin access)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 