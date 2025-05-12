// 定义缓存名称和应用版本
const CACHE_NAME = 'ptvalert-cache-v1';
const APP_VERSION = '1.0.0';

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
  console.log('[Service Worker] 收到推送通知');
  
  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'PtvAlert通知',
      body: event.data ? event.data.text() : '有新的消息',
      icon: '/ptvalert-pwa/images/icon-192x192.png',
      badge: '/ptvalert-pwa/images/badge-96x96.png',
      data: {
        url: '/ptvalert-pwa/'
      }
    };
  }
  
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
  
  // 处理通知动作
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
    event.waitUntil(updateMarkers());
  }
});

function updateMarkers() {
  return new Promise((resolve, reject) => {
    // 在后台获取最新的标记点数据
    console.log('[Service Worker] 执行周期性同步，更新地图标记');
    resolve();
  });
} 