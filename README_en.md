# PtvAlert - English Documentation

## Overview

PtvAlert is a Progressive Web App (PWA) for sharing and receiving real-time transit information and alerts in Melbourne. This version uses Cloudflare Workers and KV storage for backend functionality, completely replacing Firebase.

## Key Features

- **Real-time Map Markers**: Share information about transit issues or events
- **Push Notifications**: Receive instant alerts about new markers
- **Offline Support**: The app works even without internet connection
- **PWA Features**: Install to home screen, background sync, and more
- **Multi-language**: Available in English and Chinese

## Technical Architecture

### Frontend
- HTML, CSS, JavaScript
- Leaflet.js for mapping
- IndexedDB for offline data storage
- Service Workers for PWA functionality

### Backend
- Cloudflare Workers for serverless execution
- Cloudflare KV for data storage
- Web Push API for push notifications

## Installation

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Cloudflare account with Workers enabled

### Setup Steps

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

## Usage

### Adding Markers
1. Open the app and locate yourself on the map
2. Click the "Add Report" button
3. Select a location on the map
4. Fill in the description and optionally add a photo
5. Submit the report

### Receiving Notifications
1. When you first use the app, you'll be asked for permission to receive notifications
2. Once granted, you'll receive notifications when new markers are added
3. Click on a notification to view the marker details

### Offline Use
1. The app works offline, allowing you to view previously loaded markers
2. You can add new markers when offline, which will sync when you reconnect
3. A special offline page appears when you try to access a page that isn't cached

## Development

### Project Structure
```
├── cloudflare-setup-guide.md   # Guide for setting up Cloudflare
├── cloudflare-worker.js        # Main Worker code
├── generate-keys.js            # VAPID key generator
├── images/                     # App icons and images
├── index.html                  # Main application
├── js/                         # JavaScript files
├── login.html                  # User authentication
├── manifest.json               # PWA manifest
├── offline.html                # Offline fallback page
├── package.json                # Dependencies
├── service-worker.js           # PWA service worker
└── wrangler.toml               # Cloudflare configuration
```

### Local Development
1. Start the development server:
   ```
   npm run dev
   ```

2. Make changes to the code
3. Test changes in the browser
4. Deploy to production:
   ```
   npm run publish
   ```

## Admin Features

To set a user as admin:
1. Use the make-admin.html tool
2. Or use the admin panel (if you already have admin access)

Admin users can:
- Delete any marker
- Ban users
- Send global announcements
- Promote other users to admin status

## Troubleshooting

### Push Notifications Not Working
- Check that VAPID keys are correctly configured
- Ensure the service worker is registered
- Verify browser compatibility (Chrome, Edge, Firefox support Web Push)

### Offline Mode Issues
- Clear site data and cache if the app behaves unexpectedly
- Check IndexedDB permissions in your browser

## License

This project is licensed under the MIT License. 