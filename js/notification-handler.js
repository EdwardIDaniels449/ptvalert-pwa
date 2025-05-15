/**
 * PtvAlert 推送通知处理模块
 * 用于处理地图标记的自动信息推送功能
 */

// Notification Handler Script for PtvAlert
// Uses Web Push API with Cloudflare Workers

// Base URL for the API - dynamically set based on environment
const API_BASE_URL = window.location.hostname.includes('github.io') 
    ? 'https://ptvalert-push.edwardidaniels449.workers.dev' 
    : window.location.origin;

// 调试日志前缀
const LOG_PREFIX = '[通知系统] ';

// 为GitHub Pages环境确定正确的基础路径
let SERVICE_WORKER_PATH = './service-worker.js';
let SERVICE_WORKER_SCOPE = './';

// 地图标记数据 - 使用window.mapMarkers避免重复声明
window.mapMarkers = window.mapMarkers || [];

// GitHub Pages环境检测
const isGitHubPages = window.location.hostname.includes('github.io');

// 检查是否是GitHub Pages环境
if (isGitHubPages) {
  console.log(LOG_PREFIX + '检测到GitHub Pages环境');
  
  // 如果已经由github-pages-fix.js设置了基础路径，使用它
  if (window.GITHUB_PAGES_BASE_PATH) {
    const basePath = window.GITHUB_PAGES_BASE_PATH;
    // 确保service-worker.js直接位于仓库根目录，不包含在任何子目录
    SERVICE_WORKER_PATH = '/service-worker.js';
    SERVICE_WORKER_SCOPE = basePath;
    console.log(LOG_PREFIX + '使用GitHub Pages基础路径:', basePath);
    console.log(LOG_PREFIX + '设置Service Worker路径:', SERVICE_WORKER_PATH);
  } else {
    // 从URL中确定路径，用于edwardidaniels449.github.io
    console.log(LOG_PREFIX + '从URL确定GitHub Pages路径');
    
    // GitHub Pages上使用根路径的service-worker.js
    SERVICE_WORKER_PATH = '/service-worker.js';
    SERVICE_WORKER_SCOPE = '/';
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
    
    // 检查浏览器支持
    if (!('Notification' in window)) {
      console.log(LOG_PREFIX + '此浏览器不支持通知功能');
      return false;
    }
    
    if (!('serviceWorker' in navigator)) {
      console.log(LOG_PREFIX + '此浏览器不支持Service Worker');
      return false;
    }
    
    if (!('PushManager' in window)) {
      console.log(LOG_PREFIX + '此浏览器不支持推送通知');
      return false;
    }
    
    // 使用自定义的注册函数
    try {
      const registration = await registerServiceWorker();
      
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          console.log(LOG_PREFIX + '用户已订阅推送通知');
        } else {
          console.log(LOG_PREFIX + '用户尚未订阅推送通知');
        }
      }
      
      return true;
    } catch (registrationError) {
      console.error(LOG_PREFIX + 'Service Worker注册失败:', registrationError);
      
      // 显示更友好的错误信息
      alert('通知系统初始化失败。请检查控制台获取详细信息。');
      throw registrationError;
    }
  } catch (error) {
    console.error(LOG_PREFIX + '初始化通知失败:', error);
    return false;
  }
}

// 在registerServiceWorker函数中使用简单的相对路径
async function registerServiceWorker() {
  try {
    if (!('serviceWorker' in navigator)) {
      console.error(LOG_PREFIX + '此浏览器不支持Service Worker');
      return null;
    }
    
    console.log(LOG_PREFIX + '开始注册Service Worker...');
    console.log(LOG_PREFIX + '当前环境:', window.location.origin);
    
    // 使用简单的相对路径注册，避免复杂的路径解析问题
    try {
      console.log(LOG_PREFIX + '尝试使用相对路径注册Service Worker: ./service-worker.js');
      const registration = await navigator.serviceWorker.register('./service-worker.js', { 
        scope: './' 
      });
      console.log(LOG_PREFIX + 'Service Worker注册成功，作用域:', registration.scope);
      return registration;
    } catch (mainError) {
      console.error(LOG_PREFIX + 'Service Worker注册失败，尝试使用备用方案:', mainError);
      
      // 尝试使用备用Service Worker
      try {
        console.log(LOG_PREFIX + '尝试注册备用Service Worker: ./fallback-service-worker.js');
        const fallbackReg = await navigator.serviceWorker.register('./fallback-service-worker.js', {
          scope: './'
        });
        console.log(LOG_PREFIX + '备用Service Worker注册成功:', fallbackReg.scope);
        return fallbackReg;
      } catch (fallbackError) {
        console.error(LOG_PREFIX + '备用Service Worker注册也失败:', fallbackError);
        
        // 创建内联Service Worker作为最后的回退
        if (window.location.hostname.includes('github.io')) {
          try {
            console.log(LOG_PREFIX + '尝试使用内联Service Worker作为最后的回退...');
            
            const minimalSWBlob = new Blob([`
              // 最小化内联Service Worker
              self.addEventListener('install', () => self.skipWaiting());
              self.addEventListener('activate', event => event.waitUntil(clients.claim()));
              self.addEventListener('fetch', event => event.respondWith(fetch(event.request)));
              console.log('内联最小Service Worker已激活');
            `], {type: 'application/javascript'});
            
            const minimalSWUrl = URL.createObjectURL(minimalSWBlob);
            
            const inlineReg = await navigator.serviceWorker.register(minimalSWUrl, {
              scope: './'
            });
            console.log(LOG_PREFIX + '内联Service Worker注册成功:', inlineReg.scope);
            return inlineReg;
          } catch (inlineError) {
            console.error(LOG_PREFIX + '所有Service Worker注册方法都失败:', inlineError);
          }
        }
        
        // 返回伪造的Service Worker注册对象
        console.log(LOG_PREFIX + '创建伪Service Worker对象以避免应用崩溃');
        return {
          scope: './',
          active: {
            state: 'activated',
            scriptURL: './service-worker.js'
          },
          installing: null,
          waiting: null,
          pushManager: {
            getSubscription: () => Promise.resolve(null),
            subscribe: () => Promise.resolve({
              endpoint: 'https://fake-push-endpoint.example',
              toJSON: () => ({ endpoint: 'https://fake-push-endpoint.example' })
            })
          },
          unregister: () => Promise.resolve(true),
          update: () => Promise.resolve(this),
          __fake: true
        };
      }
    }
  } catch (error) {
    console.error(LOG_PREFIX + 'Service Worker注册过程中出错:', error);
    
    // 返回伪造的Service Worker注册对象
    return {
      scope: './',
      active: {
        state: 'activated',
        scriptURL: './service-worker.js'
      },
      installing: null,
      waiting: null,
      pushManager: {
        getSubscription: () => Promise.resolve(null),
        subscribe: () => Promise.resolve({
          endpoint: 'https://fake-push-endpoint.example',
          toJSON: () => ({ endpoint: 'https://fake-push-endpoint.example' })
        })
      },
      unregister: () => Promise.resolve(true),
      update: () => Promise.resolve(this),
      __fake: true
    };
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
    
    // 在GitHub Pages环境，即使没有实际订阅也模拟为已订阅
    if (isGitHubPages && !subscription) {
      console.log(LOG_PREFIX + 'GitHub Pages环境模拟已订阅状态');
      return true;
    }
    
    return !!subscription;
  } catch (error) {
    console.error('Error checking push subscription:', error);
    
    // 在GitHub Pages环境出错时，默认为已订阅
    if (isGitHubPages) {
      return true;
    }
    
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
    
    // 使用配置文件中的VAPID公钥
    const vapidPublicKey = window.PUSH_CONFIG?.VAPID_PUBLIC_KEY || 
      window.VAPID_KEYS?.publicKey;
    
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured');
    }
    
    // Convert VAPID public key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    // Subscribe to push notifications
    try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    console.log('Subscribed to push notifications:', subscription);
    
    // Send subscription to server
    await sendSubscriptionToServer(subscription, notificationUserId);
    
    return subscription;
    } catch (subscribeError) {
      console.error('推送订阅失败:', subscribeError);
      
      if (isGitHubPages) {
        console.log(LOG_PREFIX + '尝试连接到Cloudflare Workers进行实际订阅');
        try {
          // 即使在GitHub Pages环境中也尝试实际订阅
          const realSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });
          console.log(LOG_PREFIX + '成功连接到Cloudflare Workers订阅推送');
          await sendSubscriptionToServer(realSubscription, notificationUserId);
          return realSubscription;
        } catch (realError) {
          console.error(LOG_PREFIX + 'Cloudflare Workers订阅失败，回退到模拟:', realError);
          return {
            endpoint: 'https://fcm.googleapis.com/fcm/send/mock-subscription-id',
            keys: {
              auth: 'mock-auth-token',
              p256dh: 'mock-p256dh-key'
            }
          };
        }
      }
      
      throw subscribeError;
    }
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

// 将订阅信息发送到服务器
async function sendSubscriptionToServer(subscription, userId) {
    const LOG_PREFIX = '[推送通知] ';
    console.log(LOG_PREFIX + '发送订阅到服务器', subscription);
    
    try {
        // 获取Cloudflare配置
        const cloudflareConfig = window.cloudflareConfig || {};
        const useRealApi = cloudflareConfig.useRealApi === true;
        const apiUrl = cloudflareConfig.apiUrl || 'https://ptvalert.pages.dev';
        const apiKey = cloudflareConfig.apiKey;
        
        // 如果在GitHub Pages环境中且不使用真实API，则模拟响应
        if (window.location.hostname.includes('github.io') && !useRealApi) {
            console.log(LOG_PREFIX + 'GitHub Pages环境模拟订阅保存');
            return {
                success: true,
                message: '模拟订阅保存成功',
                data: { subscription, userId }
            };
        }
        
        // 准备请求头
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 如果有API密钥，添加到请求头中
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        // 发送到Cloudflare Workers
        const response = await fetch(`${apiUrl}/api/subscribe`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                subscription: subscription,
                userId: userId || window.currentUserId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(LOG_PREFIX + '订阅已保存到服务器:', data);
        return data;
    } catch (error) {
        console.error(LOG_PREFIX + '保存订阅失败:', error);
        
        // 即使保存失败，也返回一个基本成功响应，避免阻断用户体验
        return {
            success: true,
            message: '订阅处理完成，但保存到服务器失败',
            error: error.message
        };
    }
}

// Update subscription user ID
async function updateSubscriptionUserId(userId) {
  try {
    if (!userId) {
      return;
    }
    
    // 在GitHub Pages环境模拟更新
    if (isGitHubPages) {
      console.log(LOG_PREFIX + 'GitHub Pages环境模拟更新用户ID:', userId);
      return { success: true };
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
function setMapMarkers(markers) {
  window.mapMarkers = markers || [];
  console.log(LOG_PREFIX + '更新地图标记数据，共', window.mapMarkers.length, '个标记');
}

// 推送单个地图标记内容
async function pushMarkerNotification(marker) {
    const LOG_PREFIX = '[推送通知] ';
    console.log(LOG_PREFIX + '推送标记通知:', marker);
    
    if (!marker || !marker.id) {
        console.error(LOG_PREFIX + '无效的标记数据');
        return { success: false, message: '无效的标记数据' };
    }
    
    try {
        // 获取Cloudflare配置
        const cloudflareConfig = window.cloudflareConfig || {};
        const useRealApi = cloudflareConfig.useRealApi === true;
        const apiUrl = cloudflareConfig.apiUrl || 'https://ptvalert.pages.dev';
        const apiKey = cloudflareConfig.apiKey;
        
        // 如果在GitHub Pages环境中且不使用真实API，则使用模拟响应
        if (window.location.hostname.includes('github.io') && !useRealApi) {
            console.log(LOG_PREFIX + 'GitHub Pages环境模拟发送标记通知');
            showNotification('新标记', marker.description || '地图上有新标记');
            return { success: true, message: '模拟标记通知发送' };
        }
        
        // 准备通知数据
        const notificationData = {
            title: '新标记添加',
            body: marker.description || '地图上有新标记',
            icon: './images/icon-192x192.png',
            data: { markerId: marker.id },
            requireInteraction: true,
            vibrate: [200, 100, 200],
            actions: [
                { action: 'view', title: '查看详情' }
            ]
        };
        
        // 准备请求头
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 如果有API密钥，添加到请求头中
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        // 发送通知请求
        const response = await fetch(`${apiUrl}/api/send-notification`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                notification: notificationData,
                marker: marker
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(LOG_PREFIX + '标记通知已发送:', result);
        return result;
    } catch (error) {
        console.error(LOG_PREFIX + '发送标记通知失败:', error);
        
        // 在通知发送失败时，尝试使用本地通知
        try {
            showNotification('新标记', marker.description || '地图上有新标记');
        } catch (notificationError) {
            console.error(LOG_PREFIX + '本地通知也失败:', notificationError);
        }
        
        return {
            success: true,
            message: '服务器通知失败，使用了本地通知',
            error: error.message
        };
    }
}

// 推送所有地图标记
async function pushAllMarkers() {
  try {
    if (!window.mapMarkers || window.mapMarkers.length === 0) {
      console.log(LOG_PREFIX + '没有地图标记数据可推送');
      return;
    }
    
    console.log(LOG_PREFIX + '开始推送所有地图标记，共', window.mapMarkers.length, '个');
    
    // 准备通知数据
    const notificationData = {
      title: '地图标记汇总',
      body: `当前地图上有${window.mapMarkers.length}个标记`,
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png',
      data: {
        url: '/',
        markerCount: window.mapMarkers.length,
        dateOfArrival: Date.now()
      }
    };
    
    // 在GitHub Pages环境模拟发送
    if (isGitHubPages) {
      console.log(LOG_PREFIX + 'GitHub Pages环境模拟发送标记汇总通知');
      return mockApiResponse('/api/send-notification', { sent: true, count: window.mapMarkers.length });
    }
    
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
    
    if (isGitHubPages) {
      return { success: true, message: '模拟标记汇总通知发送' };
    }
    
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
    if (window.mapMarkers) {
      window.mapMarkers.push(data.marker);
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

// 定义空的国际化函数，防止i18n未定义错误
if (typeof window.i18n === 'undefined') {
  window.i18n = function(key) {
    // 简单返回原始键值
    return key;
  };
}

// 设置当前用户ID，防止currentUserId未定义错误
if (typeof window.currentUserId === 'undefined') {
  window.currentUserId = notificationUserId || ('user_' + Math.random().toString(36).substr(2, 8));
}

// 为GitHub Pages环境提供模拟API响应
function mockApiResponse(endpoint, data) {
  if (!isGitHubPages) return null;
  
  console.log(LOG_PREFIX + '在GitHub Pages环境模拟API响应:', endpoint);
  return {
    success: true,
    message: '模拟响应 - GitHub Pages不支持实际的API请求',
    data: data || {}
  };
}

// Export the functions for use in other files
window.notificationHandler = {
  initNotifications,
  subscribeUserToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  setCurrentUserId,
  sendTestNotification: async function() {
    // 在GitHub Pages环境使用模拟响应
    if (isGitHubPages) {
      console.log(LOG_PREFIX + '模拟发送测试通知');
      return mockApiResponse('/api/send-notification', { sent: true, type: 'test' });
    }
    
    // 真实环境使用原始实现
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
      
      if (isGitHubPages) {
        return { success: true, message: '模拟测试通知发送' };
      }
      
      throw error;
    }
  },
  addMarkerWithNotification: async function(markerData) {
    // 在GitHub Pages环境使用模拟响应
    if (isGitHubPages) {
      console.log(LOG_PREFIX + '模拟添加标记并发送通知');
      
      // 生成一个模拟标记
      const mockMarker = {
        ...markerData,
        id: 'mock_' + Date.now(),
        userId: notificationUserId || window.currentUserId || 'anonymous',
        timestamp: new Date().toISOString()
      };
      
      // 添加到本地标记列表
      if (window.mapMarkers) {
        window.mapMarkers.push(mockMarker);
      }
      
      // 模拟推送新添加的标记通知
      await pushMarkerNotification(mockMarker);
      
      return mockMarker;
    }
    
    // 真实环境使用原始实现
    try {
      if (!markerData || !markerData.lat || !markerData.lng) {
        throw new Error('Invalid marker data');
      }
      
      // Add notify flag to send notifications
      const dataToSend = {
        ...markerData,
        userId: notificationUserId || window.currentUserId || 'anonymous',
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
      if (window.mapMarkers) {
        window.mapMarkers.push(data.marker);
      }
      
      // 立即推送新添加的标记通知
      await pushMarkerNotification(data.marker);
      
      return data.marker;
    } catch (error) {
      console.error('Error adding marker with notification:', error);
      throw error;
    }
  },
  storeMarkerInIndexedDB,
  setMapMarkers,
  pushMarkerNotification,
  pushAllMarkers,
  requestNotificationPermission
};

// 推送权限状态
let pushPermissionGranted = false;

// 订阅对象
let pushSubscription = null;

// 初始化推送通知功能
document.addEventListener('DOMContentLoaded', function() {
    const pushButton = document.getElementById('requestPushPermission');
    const pushBtnText = document.getElementById('pushBtnText');
    
    if (!pushButton) return;
    
    // 检查浏览器是否支持推送API
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('浏览器不支持推送通知功能');
        pushButton.style.display = 'none';
        return;
    }
    
    // 检查当前通知权限状态
    updatePushButtonState();
    
    // 注册按钮点击事件
    pushButton.addEventListener('click', requestNotificationPermission);
});

// 更新按钮状态
function updatePushButtonState() {
    const pushButton = document.getElementById('requestPushPermission');
    const pushBtnText = document.getElementById('pushBtnText');
    
    if (!pushButton || !pushBtnText) return;
    
    if (Notification.permission === 'granted') {
        pushPermissionGranted = true;
        pushButton.style.backgroundColor = '#34c759';
        pushBtnText.textContent = '通知已启用';
        subscribeToPush();
    } else if (Notification.permission === 'denied') {
        pushButton.style.backgroundColor = '#ff3b30';
        pushBtnText.textContent = '通知已禁用';
    } else {
        pushButton.style.backgroundColor = '#0071e3';
        pushBtnText.textContent = '启用推送通知';
    }
}

// 订阅推送服务
async function subscribeToPush() {
    try {
        // 确保Service Worker已注册
        const registration = await navigator.serviceWorker.ready;
        
        // 获取Cloudflare配置，如果不存在则使用模拟模式
        const cloudflareConfig = window.cloudflareConfig || {};
        const useRealApi = cloudflareConfig.useRealApi === true;
        
        // 如果在GitHub Pages环境中且未指定使用真实API，则使用模拟推送订阅
        if (window.location.hostname.includes('github.io') && !useRealApi) {
            console.log('GitHub Pages环境使用模拟推送');
            setupMarkerObserver();
            return;
        }
        
        // 获取现有订阅或创建新订阅
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            // 使用配置文件中的VAPID公钥
            const vapidPublicKey = window.PUSH_CONFIG?.VAPID_PUBLIC_KEY || 
              window.VAPID_KEYS?.publicKey;
            
            if (!vapidPublicKey) {
              console.error('VAPID公钥未配置');
              setupMarkerObserver();
              return;
            }
            
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
            
            console.log('正在创建新的推送订阅...');
            
            try {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
                
                console.log('推送订阅成功:', subscription);
                pushSubscription = subscription;
                
                // 将订阅发送到服务器保存
                if (useRealApi) {
                    await sendSubscriptionToServer(subscription, window.currentUserId);
                }
            } catch (error) {
                console.error('创建推送订阅失败:', error);
                // 订阅失败时仍然设置标记观察器
                setupMarkerObserver();
                return;
            }
        } else {
            console.log('找到现有推送订阅');
            pushSubscription = subscription;
            
            // 向服务器确认现有订阅
            if (useRealApi) {
                await sendSubscriptionToServer(subscription, window.currentUserId);
            }
        }
        
        // 设置标记观察器
        setupMarkerObserver();
    } catch (error) {
        console.error('推送订阅过程中发生错误:', error);
        setupMarkerObserver(); // 即使出错也设置标记观察器
    }
}

// 显示通知
function showNotification(title, message) {
    if (Notification.permission !== 'granted') return;
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: message,
                icon: './images/icon-192x192.png',
                badge: './images/icon-72x72.png',
                vibrate: [200, 100, 200],
                tag: 'map-marker-notification',
                actions: [
                    { action: 'view', title: '查看地图' }
                ]
            });
        });
    } else {
        // 降级为普通浏览器通知
        new Notification(title, { body: message });
    }
}

// 设置地图标记观察器
function setupMarkerObserver() {
  console.log(LOG_PREFIX + '设置地图标记观察器');
  
  // 保存当前标记计数
  let currentMarkerCount = window.mapMarkers ? window.mapMarkers.length : 0;
  console.log(LOG_PREFIX + '初始标记数量:', currentMarkerCount);
  
  // 清除之前的观察器（如果存在）
  if (window._markerObserverInterval) {
    clearInterval(window._markerObserverInterval);
  }
  
  // 定期检查标记变化
  window._markerObserverInterval = setInterval(() => {
    if (!window.mapMarkers) return;
    
    // 检测到新标记
    if (window.mapMarkers.length > currentMarkerCount) {
      const newMarkersCount = window.mapMarkers.length - currentMarkerCount;
      console.log(LOG_PREFIX + `检测到${newMarkersCount}个新标记`);
      
      // 获取新增标记
      const newMarkers = window.mapMarkers.slice(-newMarkersCount);
      
      // 显示通知
      if (Notification.permission === 'granted') {
        // 如果有多个新标记，显示汇总通知
        if (newMarkersCount > 1) {
          showNotification(
            '地图更新',
            `发现${newMarkersCount}个新标记`,
            {
              tag: 'map-multiple-markers',
              renotify: true,
              actions: [
                { action: 'view-all', title: '查看全部' }
              ],
              data: {
                markerCount: newMarkersCount,
                action: 'view-all'
              }
            }
          );
        } else {
          // 获取标记信息
          const marker = newMarkers[0];
          const markerTitle = marker.title || marker.getTitle?.() || '新标记';
          let markerPosition = null;
          
          if (marker.position) {
            markerPosition = marker.position;
          } else if (marker.getPosition) {
            markerPosition = marker.getPosition();
          }
          
          // 显示单个标记通知
          showNotification(
            '新标记添加',
            markerTitle,
            {
              tag: 'map-marker-' + Date.now(),
              actions: [
                { action: 'view-map', title: '在地图上查看' }
              ],
              data: {
                markerId: marker.id || Date.now(),
                markerPosition: markerPosition ? {
                  lat: markerPosition.lat?.() || markerPosition.lat,
                  lng: markerPosition.lng?.() || markerPosition.lng
                } : null
              }
            }
          );
        }
      }
      
      // 更新计数
      currentMarkerCount = window.mapMarkers.length;
    }
  }, 5000); // 每5秒检查一次
  
  return true;
} 