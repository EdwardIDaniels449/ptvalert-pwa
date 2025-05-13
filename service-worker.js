// 定义缓存名称和应用版本
const CACHE_NAME = 'ptvalert-cache-v2';
const APP_VERSION = '1.0.1';

// 需要缓存的核心资源
const urlsToCache = [
  '/ptvalert-pwa/',
  '/ptvalert-pwa/index.html',
  '/ptvalert-pwa/manifest.json',
  '/ptvalert-pwa/offline.html',
  // CSS
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  // JavaScript
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
  // 图标和图片
  '/ptvalert-pwa/images/icon-72x72.png',
  '/ptvalert-pwa/images/icon-96x96.png',
  '/ptvalert-pwa/images/icon-128x128.png',
  '/ptvalert-pwa/images/icon-144x144.png',
  '/ptvalert-pwa/images/icon-152x152.png',
  '/ptvalert-pwa/images/icon-192x192.png',
  '/ptvalert-pwa/images/icon-384x384.png',
  '/ptvalert-pwa/images/icon-512x512.png',
  '/ptvalert-pwa/images/icon-512x512-maskable.png',
  '/ptvalert-pwa/images/report-icon-192x192.png',
  '/ptvalert-pwa/images/map-icon-192x192.png'
];

// 安装Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] 安装');
  
  // 跳过等待，直接激活
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 缓存应用Shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] 缓存失败:', error);
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] 激活');
  
  // 立即获取控制权
  event.waitUntil(clients.claim());
  
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 处理网络请求策略
self.addEventListener('fetch', event => {
  // 排除不需要缓存的请求
  // 如Firebase API请求、地图瓦片、分析请求等
  if (
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('tile.openstreetmap.org') ||
    event.request.url.includes('analytics') ||
    event.request.url.includes('chrome-extension')
  ) {
    return;
  }
  
  // 处理导航请求
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/ptvalert-pwa/offline.html');
        })
    );
    return;
  }
  
  // 对其他请求使用"缓存优先，不命中则网络获取并缓存"策略
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果在缓存中找到响应，则返回缓存的版本
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 否则尝试从网络获取
        return fetch(event.request)
          .then(response => {
            // 检查是否获得了有效的响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应以便我们可以将其添加到缓存中
            // 因为响应流只能被消费一次
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // 排除不需要缓存的请求
                if (!event.request.url.includes('socket.io')) {
                  cache.put(event.request, responseToCache);
                }
              });
              
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] 获取资源失败:', error);
            // 对于图片等资源，可以返回一个占位图像
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/ptvalert-pwa/images/offline-image.png');
            }
            
            // 对于不关键的请求，可以返回一个空响应
            return new Response('', {
              status: 408,
              statusText: '离线模式: 资源不可用'
            });
          });
      })
  );
});

// 监听推送事件
self.addEventListener('push', event => {
  console.log('[Service Worker] 收到推送通知', event);
  
  let notificationData = {};
  
  try {
    if (event.data) {
      console.log('推送数据:', event.data.text());
      notificationData = event.data.json();
    } else {
      console.log('推送事件没有数据');
    }
  } catch (e) {
    console.error('解析推送数据出错:', e);
    notificationData = {
      title: 'PtvAlert通知',
      body: event.data ? event.data.text() : '有新的消息',
      icon: '/ptvalert-pwa/images/icon-192x192.png',
      badge: '/ptvalert-pwa/images/badge-72x72.png',
      data: {
        url: '/ptvalert-pwa/'
      }
    };
  }
  
  console.log('处理的通知数据:', notificationData);
  
  // Cloudflare Worker 格式的推送通知处理
  if (notificationData.title && notificationData.data && notificationData.data.url) {
    const options = {
      body: notificationData.body,
      icon: notificationData.icon || '/ptvalert-pwa/images/icon-192x192.png',
      badge: notificationData.badge || '/ptvalert-pwa/images/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: notificationData.data || {},
      actions: notificationData.actions || [
        { action: 'view', title: '查看详情' }
      ]
    };
    
    // 如果有markerId，认为是地图标记通知
    if (notificationData.data.markerId) {
      console.log('显示地图标记通知:', notificationData.data.markerId);
      // 保存/更新地图标记数据到IndexedDB
      if (notificationData.data.markerInfo) {
        updateLocalMarkers(notificationData.data.markerInfo);
      }
    }
    
    event.waitUntil(
      self.registration.showNotification(notificationData.title, options)
        .then(() => console.log('通知显示成功'))
        .catch(err => console.error('显示通知失败:', err))
    );
    
    return;
  }
  
  // 处理地图标记推送通知 (兼容旧格式)
  if (notificationData.type === 'map-marker') {
    const markerData = notificationData.markerData || {};
    const options = {
      body: `新标记: ${markerData.title || '未命名位置'}\n${markerData.description || ''}`,
      icon: '/ptvalert-pwa/images/map-icon-192x192.png',
      badge: '/ptvalert-pwa/images/badge-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        url: `/ptvalert-pwa/?lat=${markerData.lat || 0}&lng=${markerData.lng || 0}&zoom=15`,
        markerId: markerData.id,
        markerInfo: markerData
      },
      actions: [
        { action: 'view-map', title: '查看地图' },
        { action: 'view-details', title: '查看详情' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(`新地图标记: ${markerData.title || '未命名位置'}`, options)
    );
    
    // 更新地图标记缓存
    updateLocalMarkers(markerData);
    
    return;
  }
  
  // 处理其他类型的推送通知
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/ptvalert-pwa/images/icon-192x192.png',
    badge: notificationData.badge || '/ptvalert-pwa/images/badge-96x96.png',
    vibrate: [100, 50, 100],
    data: notificationData.data || {},
    actions: notificationData.actions || [
      { action: 'view', title: '查看详情' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// 处理通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] 通知被点击', event.notification.data);
  
  event.notification.close();
  
  // 处理地图标记通知的特定操作
  if (event.notification.data && event.notification.data.markerId) {
    if (event.action === 'view-map') {
      // 打开地图并将地图定位到标记位置
      event.waitUntil(
        clients.openWindow(event.notification.data.url)
      );
      return;
    }
    
    if (event.action === 'view-details') {
      // 打开标记详情页面
      event.waitUntil(
        clients.openWindow(`/ptvalert-pwa/marker-details.html?id=${event.notification.data.markerId}`)
      );
      return;
    }
  }
  
  // 处理其他通知动作
  if (event.action === 'view' && event.notification.data.url) {
    // 如果定义了特定URL，则打开该URL
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    // 默认打开应用
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // 检查是否已经有打开的窗口
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            // 如果已有窗口，则聚焦它
            if ('focus' in client) {
              return client.focus();
            }
          }
          // 否则打开新窗口
          if (clients.openWindow) {
            return clients.openWindow('/ptvalert-pwa/');
          }
        })
    );
  }
});

// 应用程序同步（仅Chrome/Firefox支持）
self.addEventListener('sync', event => {
  if (event.tag === 'submit-report') {
    console.log('[Service Worker] 尝试同步提交离线报告');
    event.waitUntil(syncOfflineReports());
  }
});

// 处理离线报告的同步逻辑（简化示例）
// 实际实现需要在前端配合indexedDB存储离线数据
function syncOfflineReports() {
  return new Promise((resolve, reject) => {
    // 在此处编写将IndexedDB中的离线报告发送到服务器的代码
    // 这只是一个框架，实际实现需要在前端代码中配合使用
    console.log('[Service Worker] 同步离线报告完成');
    resolve();
  });
}

// 周期性同步（仅Chrome支持）
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-markers') {
    event.waitUntil(updateMarkersFromServer());
  }
});

// 从服务器获取最新的标记点数据
function updateMarkersFromServer() {
  return new Promise((resolve, reject) => {
    console.log('[Service Worker] 执行周期性同步，更新地图标记');
    
    // 从服务器获取最新的标记数据
    fetch('/api/markers?updated_since=' + getLastUpdateTime())
      .then(response => response.json())
      .then(data => {
        // 检查是否有新标记
        if (data.markers && data.markers.length > 0) {
          // 处理每个新标记
          return Promise.all(data.markers.map(marker => {
            // 存储到IndexedDB
            return saveMarkerToIndexedDB(marker)
              .then(() => {
                // 如果这是新标记或有更新，发送通知
                if (marker.isNew || marker.hasUpdates) {
                  return notifyMarkerUpdate(marker);
                }
              });
          }));
        }
      })
      .then(() => {
        // 更新最后同步时间
        updateLastSyncTime(new Date().getTime());
        resolve();
      })
      .catch(error => {
        console.error('[Service Worker] 获取标记更新失败:', error);
        reject(error);
      });
  });
}

// 从IndexedDB获取最后更新时间
function getLastUpdateTime() {
  // 这里需要实现从IndexedDB获取上次更新时间的逻辑
  // 默认返回24小时前
  return new Date(Date.now() - 86400000).toISOString();
}

// 更新最后同步时间
function updateLastSyncTime(timestamp) {
  // 将时间戳保存到IndexedDB
  // 实现保存逻辑
}

// 将标记保存到IndexedDB
function saveMarkerToIndexedDB(marker) {
  return new Promise((resolve, reject) => {
    // 实现将标记保存到IndexedDB的逻辑
    resolve();
  });
}

// 当有新的标记数据时，更新本地存储
function updateLocalMarkers(markerData) {
  // 实现更新本地标记数据的逻辑
  // 这可以使用IndexedDB来完成
  return new Promise((resolve, reject) => {
    // 打开/创建IndexedDB数据库
    const request = indexedDB.open('PtvAlertDB', 1);
    
    request.onerror = function(event) {
      console.error('打开数据库失败:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      // 创建标记存储对象
      if (!db.objectStoreNames.contains('markers')) {
        const store = db.createObjectStore('markers', { keyPath: 'id' });
        store.createIndex('location', ['lat', 'lng'], { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['markers'], 'readwrite');
      const store = transaction.objectStore('markers');
      
      // 添加或更新标记
      const addRequest = store.put({
        ...markerData,
        timestamp: markerData.timestamp || Date.now()
      });
      
      addRequest.onsuccess = function() {
        console.log('[Service Worker] 标记已保存到IndexedDB');
        resolve();
      };
      
      addRequest.onerror = function(event) {
        console.error('[Service Worker] 保存标记失败:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = function() {
        db.close();
      };
    };
  });
}

// 为标记更新发送通知
function notifyMarkerUpdate(marker) {
  // 检查通知权限
  return self.registration.showNotification(`新地图标记: ${marker.title || '未命名位置'}`, {
    body: marker.description || '新的地图标记已添加',
    icon: '/ptvalert-pwa/images/map-icon-192x192.png',
    badge: '/ptvalert-pwa/images/badge-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      url: `/ptvalert-pwa/?lat=${marker.lat || 0}&lng=${marker.lng || 0}&zoom=15`,
      markerId: marker.id,
      markerInfo: marker
    },
    actions: [
      { action: 'view-map', title: '查看地图' },
      { action: 'view-details', title: '查看详情' }
    ]
  });
} 