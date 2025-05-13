// Define cache name and app version
const CACHE_NAME = 'ptvalert-cache-v2';
const APP_VERSION = '1.0.2';

// Resources to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // CSS
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  // JavaScript
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
  '/js/notification-handler.js',
  // Icons and images
  '/images/icon-72x72.png',
  '/images/icon-96x96.png',
  '/images/icon-128x128.png',
  '/images/icon-144x144.png',
  '/images/icon-152x152.png',
  '/images/icon-192x192.png',
  '/images/icon-384x384.png',
  '/images/icon-512x512.png',
  '/images/icon-512x512-maskable.png',
  '/images/report-icon-192x192.png',
  '/images/map-icon-192x192.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  
  // Skip waiting to immediately activate
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  
  // Take control immediately
  event.waitUntil(clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle fetch requests with cache-first strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests and other non-cacheable requests
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('tile.openstreetmap.org') ||
    event.request.url.includes('analytics') ||
    event.request.url.includes('chrome-extension')
  ) {
    return;
  }
  
  // Handle navigation requests - serve index.html or return offline page if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }
  
  // For other requests, try cache first, then network with cache update
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If found in cache, return cached response
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Check for valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response to save in cache
            const responseToCache = response.clone();
            
            // Add to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed:', error);
            
            // Return placeholder for images
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/images/offline-image.png');
            }
            
            // Return empty response for other requests
            return new Response('', {
              status: 408,
              statusText: 'Offline mode: Resource unavailable'
            });
          });
      })
  );
});

// Handle push events (notifications)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received', event);
  
  let notificationData = {};
  
  try {
    if (event.data) {
      console.log('Push data:', event.data.text());
      notificationData = event.data.json();
    } else {
      console.log('Push event has no data');
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
    notificationData = {
      title: 'PtvAlert Notification',
      body: event.data ? event.data.text() : 'New message',
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png',
      data: {
        url: '/'
      }
    };
  }
  
  console.log('Notification data:', notificationData);
  
  // Handle push notification
  if (notificationData.title) {
    const options = {
      body: notificationData.body,
      icon: notificationData.icon || '/images/icon-192x192.png',
      badge: notificationData.badge || '/images/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: notificationData.data || {},
      actions: notificationData.actions || [
        { action: 'view', title: '查看详情' }
      ]
    };
    
    // If there's marker info, save it to IndexedDB
    if (notificationData.data && notificationData.data.markerId && notificationData.data.markerInfo) {
      updateLocalMarkers(notificationData.data.markerInfo);
    }
    
    event.waitUntil(
      self.registration.showNotification(notificationData.title, options)
        .then(() => console.log('Notification shown successfully'))
        .catch(err => console.error('Failed to show notification:', err))
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event);
  
  // Close the notification
  event.notification.close();
  
  // Get notification data
  const data = event.notification.data || {};
  let url = data.url || '/';
  
  // Handle different actions
  if (event.action === 'view' || event.action === 'view-details') {
    // View details
    if (data.markerId) {
      url = `/marker-details.html?id=${data.markerId}`;
    }
  } else if (event.action === 'navigate' || event.action === 'view-map') {
    // View on map
    if (data.markerInfo && data.markerInfo.lat && data.markerInfo.lng) {
      url = `/?lat=${data.markerInfo.lat}&lng=${data.markerInfo.lng}&zoom=15`;
    }
  }
  
  // Open the appropriate URL
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle sync events for offline support
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event);
  
  if (event.tag === 'submit-report') {
    event.waitUntil(syncOfflineReports());
  } else if (event.tag === 'update-markers') {
    event.waitUntil(updateMarkersFromServer());
  }
});

// Sync offline reports
async function syncOfflineReports() {
  try {
    // Get offline reports from IndexedDB
    const db = await openDatabase();
    const transaction = db.transaction('offlineReports', 'readwrite');
    const store = transaction.objectStore('offlineReports');
    const reports = await store.getAll();
    
    console.log('[Service Worker] Syncing offline reports:', reports.length);
    
    // Send each report to the server
    for (const report of reports) {
      try {
        // Send to the API
        const response = await fetch('/api/markers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
        
        if (response.ok) {
          // Remove from offline store on success
          await store.delete(report.id);
          console.log('[Service Worker] Synced report:', report.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error syncing offline reports:', error);
  }
}

// Update markers from server
async function updateMarkersFromServer() {
  try {
    const response = await fetch('/api/markers');
    
    if (!response.ok) {
      throw new Error('Failed to fetch markers');
    }
    
    const markers = await response.json();
    const db = await openDatabase();
    const transaction = db.transaction('markers', 'readwrite');
    const store = transaction.objectStore('markers');
    
    // Get last update time
    const lastUpdateTime = await getLastUpdateTime();
    let newMarkers = 0;
    
    // Process each marker
    for (const [id, marker] of Object.entries(markers)) {
      // Add ID to marker object if not present
      const markerWithId = { ...marker, id: id };
      
      // Check if marker is newer than last update
      const markerTime = new Date(marker.timestamp || marker.time).getTime();
      if (!lastUpdateTime || markerTime > lastUpdateTime) {
        newMarkers++;
        // Save to IndexedDB
        await store.put(markerWithId);
        
        // Notify about new marker if it's recent (last hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (markerTime > oneHourAgo) {
          notifyMarkerUpdate(markerWithId);
        }
      }
    }
    
    // Update last sync time
    await updateLastSyncTime(Date.now());
    
    console.log(`[Service Worker] Updated markers: ${newMarkers} new/updated of ${Object.keys(markers).length} total`);
  } catch (error) {
    console.error('[Service Worker] Error updating markers:', error);
  }
}

// Get last update time from IndexedDB
async function getLastUpdateTime() {
  const db = await openDatabase();
  const transaction = db.transaction('meta', 'readonly');
  const store = transaction.objectStore('meta');
  return await store.get('lastUpdate') || 0;
}

// Update last sync time in IndexedDB
async function updateLastSyncTime(timestamp) {
  const db = await openDatabase();
  const transaction = db.transaction('meta', 'readwrite');
  const store = transaction.objectStore('meta');
  return await store.put(timestamp, 'lastUpdate');
}

// Save marker to IndexedDB
async function saveMarkerToIndexedDB(marker) {
  const db = await openDatabase();
  const transaction = db.transaction('markers', 'readwrite');
  const store = transaction.objectStore('markers');
  return await store.put(marker);
}

// Update local markers from notification data
async function updateLocalMarkers(markerData) {
  if (!markerData || !markerData.id) {
    console.error('[Service Worker] Invalid marker data:', markerData);
    return;
  }
  
  try {
    // Ensure we have a database connection
    const db = await openDatabase();
    const transaction = db.transaction('markers', 'readwrite');
    const store = transaction.objectStore('markers');
    
    // Check if we already have this marker
    const existingMarker = await store.get(markerData.id);
    
    // If the marker already exists and is not older, skip the update
    if (existingMarker) {
      const existingTime = new Date(existingMarker.timestamp || existingMarker.time).getTime();
      const newTime = new Date(markerData.timestamp || markerData.time).getTime();
      
      if (existingTime >= newTime) {
        console.log('[Service Worker] Marker already up to date:', markerData.id);
        return;
      }
    }
    
    // Save or update the marker
    await store.put(markerData);
    console.log('[Service Worker] Updated local marker:', markerData.id);
    
    // Update the last sync time
    await updateLastSyncTime(Date.now());
    
    return true;
  } catch (error) {
    console.error('[Service Worker] Error updating local marker:', error);
    return false;
  }
}

// Open IndexedDB
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ptvalert-db', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create markers store
      if (!db.objectStoreNames.contains('markers')) {
        const markersStore = db.createObjectStore('markers', { keyPath: 'id' });
        markersStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create offline reports store
      if (!db.objectStoreNames.contains('offlineReports')) {
        const reportsStore = db.createObjectStore('offlineReports', { keyPath: 'id' });
        reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create meta store for app data
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    };
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

// Show notification for marker update
function notifyMarkerUpdate(marker) {
  if (!marker) return;
  
  const title = marker.title || marker.description || '未命名位置';
  const options = {
    body: marker.description || '新的地图标记已添加',
    icon: '/images/map-icon-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: `/marker-details.html?id=${marker.id}`,
      markerId: marker.id,
      markerInfo: marker
    },
    actions: [
      { action: 'view', title: '查看详情' },
      { action: 'navigate', title: '查看地图' }
    ]
  };
  
  self.registration.showNotification(`新地图标记: ${title}`, options)
    .then(() => console.log('[Service Worker] Marker notification shown:', marker.id))
    .catch(error => console.error('[Service Worker] Failed to show marker notification:', error));
} 