/**
 * PtvAlert 推送通知处理模块
 * 用于处理地图标记的自动信息推送功能
 */

// Notification Handler Script for PtvAlert
// Uses Web Push API with Cloudflare Workers

// Base URL for the API - change to your Cloudflare Worker URL
const API_BASE_URL = 'https://ptvalert.pages.dev';

// 调试日志前缀
const LOG_PREFIX = '[通知系统] ';

// 为GitHub Pages环境确定正确的基础路径
let SERVICE_WORKER_PATH = './service-worker.js';
let SERVICE_WORKER_SCOPE = './';

// 检查是否是GitHub Pages环境
if (window.location.hostname.includes('github.io')) {
  console.log(LOG_PREFIX + '检测到GitHub Pages环境');
  
  // 如果已经由github-pages-fix.js设置了基础路径，使用它
  if (window.GITHUB_PAGES_BASE_PATH) {
    const basePath = window.GITHUB_PAGES_BASE_PATH;
    SERVICE_WORKER_PATH = basePath + 'service-worker.js';
    SERVICE_WORKER_SCOPE = basePath;
    console.log(LOG_PREFIX + '使用GitHub Pages基础路径:', basePath);
  } else {
    // 从URL中确定路径
    const pathSegments = window.location.pathname.split('/');
    if (pathSegments.length >= 2 && pathSegments[1]) {
      // GitHub Pages项目页面 (username.github.io/repo-name)
      const repoName = pathSegments[1];
      SERVICE_WORKER_PATH = '/' + repoName + '/service-worker.js';
      SERVICE_WORKER_SCOPE = '/' + repoName + '/';
      console.log(LOG_PREFIX + '基于URL确定GitHub Pages路径:', SERVICE_WORKER_PATH);
    }
  }
}

// Current user ID - should be set by the main application
let notificationUserId = '';

// Log current notification system state
console.log(LOG_PREFIX + '初始化配置:', {
  API_BASE_URL,
  SERVICE_WORKER_PATH,
  SERVICE_WORKER_SCOPE,
  BROWSER: navigator.userAgent
});

// Set the current user ID
function setCurrentUserId(userId) {
  notificationUserId = userId;
  console.log(LOG_PREFIX + '设置当前用户ID:', userId);
  
  // Check if already subscribed and update the subscription if user ID changed
  if (isSubscribedToPush()) {
    updateSubscriptionUserId(userId);
  }
}

// Initialize notification support
async function initNotifications() {
  try {
    console.log(LOG_PREFIX + '开始初始化通知系统');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log(LOG_PREFIX + '此浏览器不支持通知功能');
      return false;
    }
    
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log(LOG_PREFIX + '此浏览器不支持Service Worker');
      return false;
    }
    
    // Check if push is supported
    if (!('PushManager' in window)) {
      console.log(LOG_PREFIX + '此浏览器不支持推送通知');
      return false;
    }
    
    console.log(LOG_PREFIX + '注册Service Worker:', SERVICE_WORKER_PATH, '作用域:', SERVICE_WORKER_SCOPE);
    
    try {
      // 先尝试获取现有注册
      const existingRegistration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
      
      if (existingRegistration) {
        console.log(LOG_PREFIX + '找到现有Service Worker注册:', existingRegistration.scope);
        return true;
      }
      
      // Register service worker with correct path and scope
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
        scope: SERVICE_WORKER_SCOPE
      });
      
      console.log(LOG_PREFIX + 'Service Worker注册成功，作用域:', registration.scope);
      
      // 等待控制
      if (!navigator.serviceWorker.controller) {
        console.log(LOG_PREFIX + '等待Service Worker激活并控制页面...');
        
        // 等待Service Worker控制页面
        await new Promise((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log(LOG_PREFIX + 'Service Worker现在控制了页面');
            resolve();
          });
        });
      }
      
      // Check for existing subscription
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log(LOG_PREFIX + '用户已订阅推送通知');
      } else {
        console.log(LOG_PREFIX + '用户尚未订阅推送通知');
      }
      
      return true;
    } catch (registrationError) {
      console.error(LOG_PREFIX + 'Service Worker注册失败:', registrationError);
      
      // 在GitHub Pages环境中尝试其他策略
      if (window.location.hostname.includes('github.io')) {
        console.log(LOG_PREFIX + '尝试使用绝对URL作为备用方案');
        
        try {
          // 使用完整的绝对URL
          const fullURL = new URL(SERVICE_WORKER_PATH, window.location.origin).href;
          console.log(LOG_PREFIX + '尝试使用完整URL:', fullURL);
          
          const registration = await navigator.serviceWorker.register(fullURL, {
            scope: SERVICE_WORKER_SCOPE
          });
          
          console.log(LOG_PREFIX + '使用绝对URL注册成功:', registration.scope);
          return true;
        } catch (fallbackError) {
          console.error(LOG_PREFIX + '备用注册方法也失败:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw registrationError;
      }
    }
  } catch (error) {
    console.error(LOG_PREFIX + '初始化通知失败:', error);
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
      await updateSubscriptionUserId(notificationUserId);
      
      return subscription;
    }
    
    // 使用硬编码的VAPID公钥，避免额外的API调用
    const vapidPublicKey = 'BMJeWRPvptRxO8Qcr5Qy_nGbH4RTMB92IXZySCqVE5mwB8KYw6DFwzMDQJm_HCQWXnLQzR4P0pQQIi45VF8E1xQ';
    
    // Convert VAPID public key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    console.log('Subscribed to push notifications:', subscription);
    
    // Send subscription to server
    await sendSubscriptionToServer(subscription, notificationUserId);
    
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
        userId: userId || notificationUserId || 'anonymous'
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
        userId: notificationUserId
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
      userId: notificationUserId || 'anonymous',
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

// 在registerServiceWorker函数中添加更多调试信息并明确指定GitHub Pages环境的处理
async function registerServiceWorker() {
  try {
    if (!('serviceWorker' in navigator)) {
      console.error(LOG_PREFIX + '此浏览器不支持Service Worker');
      return;
    }
    
    console.log(LOG_PREFIX + '开始注册Service Worker...');
    console.log(LOG_PREFIX + '当前环境:', window.location.origin);
    
    // 默认参数
    let swPath = './service-worker.js';
    let swOptions = { scope: './' };
    
    // GitHub Pages特殊处理
    if (window.location.hostname.includes('github.io')) {
      console.log(LOG_PREFIX + '检测到GitHub Pages环境');
      
      // 获取仓库名
      let repoName = '';
      const pathSegments = window.location.pathname.split('/');
      if (pathSegments.length >= 2 && pathSegments[1]) {
        repoName = pathSegments[1];
      } else {
        // 硬编码的回退值
        repoName = 'ptvalert-pwa';
      }
      
      // 构建正确的Service Worker URL和作用域
      const basePath = '/' + repoName + '/';
      swPath = basePath + 'service-worker.js';
      swOptions = { scope: basePath };
      
      console.log(LOG_PREFIX + 'GitHub Pages配置:');
      console.log('- 仓库名:', repoName);
      console.log('- 基础路径:', basePath);
      console.log('- Service Worker路径:', swPath);
      console.log('- 作用域:', swOptions.scope);
    }
    
    // 注册Service Worker
    console.log(LOG_PREFIX + '注册Service Worker，路径:', swPath, '作用域:', swOptions);
    const registration = await navigator.serviceWorker.register(swPath, swOptions);
    
    console.log(LOG_PREFIX + 'Service Worker注册成功，作用域:', registration.scope);
    return registration;
  } catch (error) {
    console.error(LOG_PREFIX + 'Service Worker注册失败:', error);
    throw error;
  }
} 