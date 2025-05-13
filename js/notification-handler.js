/**
 * PtvAlert 推送通知处理模块
 * 用于处理地图标记的自动信息推送功能
 */

// Notification Handler Script for PtvAlert
// Uses Web Push API with Cloudflare Workers

// Base URL for the API - dynamically set based on environment
const API_BASE_URL = window.location.hostname.includes('github.io') 
    ? 'https://edwardidaniels449.github.io' 
    : window.location.origin;

// 调试日志前缀
const LOG_PREFIX = '[通知系统] ';

// 为GitHub Pages环境确定正确的基础路径
let SERVICE_WORKER_PATH = './service-worker.js';
let SERVICE_WORKER_SCOPE = './';

// 地图标记数据
let markers = [];

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
    // 从URL中确定路径，用于edwardidaniels449.github.io
    const pathSegments = window.location.pathname.split('/');
    console.log(LOG_PREFIX + 'URL路径段:', pathSegments);
    
    // GitHub Pages路径
    let repoPath = '';
    
    // 检查是否有特定路径段
    if (pathSegments.length >= 2 && pathSegments[1]) {
      // 从URL中确定正确的仓库名
      repoPath = '/' + pathSegments[1] + '/';
    }
    
    SERVICE_WORKER_PATH = repoPath + 'service-worker.js';
    SERVICE_WORKER_SCOPE = repoPath || '/';
    console.log(LOG_PREFIX + '基于URL确定GitHub Pages路径:', SERVICE_WORKER_PATH);
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
      // 使用自定义的注册函数
      const registration = await registerServiceWorker();
      
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
      throw registrationError;
    }
  } catch (error) {
    console.error(LOG_PREFIX + '初始化通知失败:', error);
    return false;
  }
}

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
          title: '测试通知',
          body: '这是来自PtvAlert的测试通知',
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

// 设置地图标记数据
function setMapMarkers(mapMarkers) {
  markers = mapMarkers;
  console.log(LOG_PREFIX + '更新地图标记数据，共', markers.length, '个标记');
}

// 推送单个地图标记内容
async function pushMarkerNotification(marker) {
  try {
    if (!marker || !marker.id) {
      console.error(LOG_PREFIX + '无效的标记数据');
      return;
    }
    
    // 检查是否已订阅
    if (!(await isSubscribedToPush())) {
      console.log(LOG_PREFIX + '用户未订阅推送，无法发送标记通知');
      return;
    }
    
    // 准备通知数据
    const notificationData = {
      title: marker.title || '地图标记更新',
      body: marker.description || '有新的地图标记信息',
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png',
      data: {
        url: '/',
        markerId: marker.id,
        markerInfo: marker,
        dateOfArrival: Date.now()
      }
    };
    
    // 发送通知
    const response = await fetch(`${API_BASE_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notification: notificationData,
        userId: notificationUserId
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '发送标记通知失败');
    }
    
    console.log(LOG_PREFIX + '标记通知发送成功:', marker.id);
    return data;
  } catch (error) {
    console.error(LOG_PREFIX + '发送标记通知失败:', error);
    throw error;
  }
}

// 推送所有地图标记
async function pushAllMarkers() {
  try {
    if (!markers || markers.length === 0) {
      console.log(LOG_PREFIX + '没有地图标记数据可推送');
      return;
    }
    
    console.log(LOG_PREFIX + '开始推送所有地图标记，共', markers.length, '个');
    
    // 准备通知数据
    const notificationData = {
      title: '地图标记汇总',
      body: `当前地图上有${markers.length}个标记`,
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png',
      data: {
        url: '/',
        markerCount: markers.length,
        dateOfArrival: Date.now()
      }
    };
    
    // 发送通知
    const response = await fetch(`${API_BASE_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notification: notificationData,
        userId: notificationUserId
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '发送标记汇总通知失败');
    }
    
    console.log(LOG_PREFIX + '标记汇总通知发送成功');
    return data;
  } catch (error) {
    console.error(LOG_PREFIX + '发送标记汇总通知失败:', error);
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
    
    // 添加到本地标记列表
    if (markers) {
      markers.push(data.marker);
    }
    
    // 立即推送新添加的标记通知
    await pushMarkerNotification(data.marker);
    
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

// 主动请求通知权限
async function requestNotificationPermission() {
  try {
    console.log(LOG_PREFIX + '请求通知权限...');
    
    // 检查是否支持通知功能
    if (!("Notification" in window)) {
      console.log(LOG_PREFIX + '此浏览器不支持通知功能');
      return false;
    }
    
    // 如果已经有权限，直接返回
    if (Notification.permission === "granted") {
      console.log(LOG_PREFIX + '已有通知权限');
      return true;
    }
    
    // 如果已经被拒绝，提示用户在浏览器设置中允许
    if (Notification.permission === "denied") {
      console.log(LOG_PREFIX + '通知权限已被拒绝');
      return false;
    }
    
    // 请求权限
    const permission = await Notification.requestPermission();
    console.log(LOG_PREFIX + '通知权限请求结果:', permission);
    
    // 如果获得权限，初始化推送服务
    if (permission === "granted") {
      await initNotifications();
      await subscribeUserToPush();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(LOG_PREFIX + '请求通知权限失败:', error);
    return false;
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
  storeMarkerInIndexedDB,
  setMapMarkers,
  pushMarkerNotification,
  pushAllMarkers,
  requestNotificationPermission
}; 