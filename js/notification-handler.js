/**
 * PtvAlert 推送通知处理模块
 * 用于处理地图标记的自动信息推送功能
 */

// Notification Handler Script for PtvAlert
// Uses Web Push API with Cloudflare Workers

// Base URL for the API - change to your Cloudflare Worker URL
const API_BASE_URL = 'https://ptvalert.your-subdomain.workers.dev';

// Current user ID - should be set by the main application
let currentUserId = '';

// Set the current user ID
function setCurrentUserId(userId) {
  currentUserId = userId;
  
  // Check if already subscribed and update the subscription if user ID changed
  if (isSubscribedToPush()) {
    updateSubscriptionUserId(userId);
  }
}

// Initialize notification support
async function initNotifications() {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('This browser does not support service workers');
      return false;
    }
    
    // Check if push is supported
    if (!('PushManager' in window)) {
      console.log('This browser does not support push notifications');
      return false;
    }
    
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered with scope:', registration.scope);
    
    // Check for existing subscription
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('User is already subscribed to push notifications');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
}

// Check if subscribed to push notifications
async function isSubscribedToPush() {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return !!subscription;
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
}

// Convert a base64 string to Uint8Array for applicationServerKey
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

// Subscribe to push notifications
async function subscribeUserToPush() {
  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }
    
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Already subscribed to push notifications');
      
      // If the user ID has changed, update the subscription
      await updateSubscriptionUserId(currentUserId);
      
      return subscription;
    }
    
    // Get VAPID public key from server
    const response = await fetch(`${API_BASE_URL}/api/vapid-public-key`);
    const data = await response.json();
    
    if (!data.publicKey) {
      throw new Error('Failed to get VAPID public key');
    }
    
    // Convert VAPID public key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);
    
    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    console.log('Subscribed to push notifications:', subscription);
    
    // Send subscription to server
    await sendSubscriptionToServer(subscription, currentUserId);
    
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

// Send subscription to server
async function sendSubscriptionToServer(subscription, userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription,
        userId: userId || currentUserId || 'anonymous'
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to save subscription');
    }
    
    console.log('Subscription saved on server');
    return data;
  } catch (error) {
    console.error('Error saving subscription on server:', error);
    throw error;
  }
}

// Update subscription user ID
async function updateSubscriptionUserId(userId) {
  try {
    if (!userId) {
      return;
    }
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return;
    }
    
    // Send the updated user ID to the server
    await sendSubscriptionToServer(subscription, userId);
  } catch (error) {
    console.error('Error updating subscription user ID:', error);
  }
}

// Unsubscribe from push notifications
async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('No push subscription to unsubscribe');
      return true;
    }
    
    // Send unsubscribe request to server
    await fetch(`${API_BASE_URL}/api/subscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });
    
    // Unsubscribe locally
    const result = await subscription.unsubscribe();
    
    console.log('Unsubscribed from push notifications:', result);
    return result;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

// Send a test notification
async function sendTestNotification() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notification: {
          title: 'Test Notification',
          body: 'This is a test notification from PtvAlert',
          icon: '/images/icon-192x192.png',
          badge: '/images/badge-72x72.png',
          data: {
            url: '/',
            dateOfArrival: Date.now(),
            primaryKey: 1
          }
        },
        userId: currentUserId
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to send test notification');
    }
    
    console.log('Test notification sent');
    return data;
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
}

// Add a marker with notification
async function addMarkerWithNotification(markerData) {
  try {
    if (!markerData || !markerData.lat || !markerData.lng) {
      throw new Error('Invalid marker data');
    }
    
    // Add notify flag to send notifications
    const dataToSend = {
      ...markerData,
      userId: currentUserId || 'anonymous',
      notify: true,
      timestamp: new Date().toISOString()
    };
    
    const response = await fetch(`${API_BASE_URL}/api/markers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to add marker');
    }
    
    console.log('Marker added with notification:', data.marker);
    return data.marker;
  } catch (error) {
    console.error('Error adding marker with notification:', error);
    throw error;
  }
}

// Store marker in IndexedDB for offline access
async function storeMarkerInIndexedDB(marker) {
  if (!marker || !marker.id) {
    return;
  }
  
  try {
    // Check if IndexedDB is supported
    if (!('indexedDB' in window)) {
      console.log('IndexedDB not supported');
      return;
    }
    
    // Open the database
    const dbPromise = indexedDB.open('ptvalert-db', 1);
    
    // Set up the database
    dbPromise.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create markers object store if it doesn't exist
      if (!db.objectStoreNames.contains('markers')) {
        const store = db.createObjectStore('markers', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    // Handle database open error
    dbPromise.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
    };
    
    // Handle database open success
    dbPromise.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('markers', 'readwrite');
      const store = transaction.objectStore('markers');
      
      // Add or update the marker
      const request = store.put(marker);
      
      request.onerror = (event) => {
        console.error('Error storing marker in IndexedDB:', event.target.error);
      };
      
      request.onsuccess = () => {
        console.log('Marker stored in IndexedDB:', marker.id);
      };
      
      // Close the database when the transaction is complete
      transaction.oncomplete = () => {
        db.close();
      };
    };
  } catch (error) {
    console.error('Error storing marker in IndexedDB:', error);
  }
}

// Export the functions for use in other files
window.notificationHandler = {
  initNotifications,
  subscribeUserToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  setCurrentUserId,
  sendTestNotification,
  addMarkerWithNotification,
  storeMarkerInIndexedDB
}; 