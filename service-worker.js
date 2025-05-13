// 推送通知Service Worker
const CACHE_NAME = 'ptvalert-cache-v6';
const APP_NAME = '网站地图标记';
const APP_VERSION = '1.0.7';

// 调试输出
console.log('[Service Worker] 启动，版本:', APP_VERSION);

// 确定基础路径 - 处理GitHub Pages的仓库路径问题
function getBasePath() {
  console.log('[Service Worker] 检测运行环境...');
  
  // 记录当前地址
  const currentLocation = self.location.href;
  console.log('[Service Worker] 当前脚本URL:', currentLocation);
  
  // 检测GitHub Pages环境
  if (self.location.hostname.includes('github.io')) {
    console.log('[Service Worker] 检测到GitHub Pages环境');
    
    // 从URL中提取仓库名称
    const pathMatch = self.location.pathname.match(/\/([^\/]+)\//);
    if (pathMatch && pathMatch[1]) {
      const repoName = pathMatch[1];
      const basePath = '/' + repoName + '/';
      console.log('[Service Worker] GitHub Pages仓库名:', repoName);
      console.log('[Service Worker] 使用基础路径:', basePath);
      return basePath;
    } else {
      console.log('[Service Worker] 无法检测到GitHub Pages仓库名，使用根路径');
      return '/';
    }
  }
  
  // 默认使用根路径
  console.log('[Service Worker] 非GitHub Pages环境，使用根路径');
  return '/';
}

const BASE_PATH = getBasePath();

// 记录一些调试信息
console.log('[Service Worker] 启动配置:');
console.log('- 缓存名称:', CACHE_NAME);
console.log('- 应用名称:', APP_NAME);
console.log('- 版本:', APP_VERSION);
console.log('- 基础路径:', BASE_PATH);
console.log('- 主机名:', self.location.hostname);
console.log('- 完整URL:', self.location.href);

// 要缓存的资源 - 使用相对路径以兼容GitHub Pages
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'offline.html',
  BASE_PATH + 'push-client.js',
  BASE_PATH + 'styles.css',
  BASE_PATH + 'js/notification-handler.js',
  BASE_PATH + 'js/url-fix.js',
  BASE_PATH + 'js/github-pages-fix.js',
  // 图标和图片
  BASE_PATH + 'images/icon-192x192.png',
  BASE_PATH + 'images/badge-72x72.png'
];

// 安装Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] 正在安装');
  
  // 跳过等待，让新的service worker立即激活
  self.skipWaiting();
  
  // 缓存核心静态资源
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 缓存静态资源');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] 缓存失败:', error);
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] 已激活');
  
  // 声明控制权
  event.waitUntil(clients.claim());
  
  // 清理旧版本缓存
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

// 处理fetch请求，使用缓存优先策略
self.addEventListener('fetch', event => {
  // 跳过非GET请求
  if (event.request.method !== 'GET') return;
  
  // 跳过API请求和其他不可缓存的请求
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('chrome-extension')
  ) {
    return;
  }
  
  // 处理导航请求 - 提供index.html或离线页面
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(BASE_PATH + 'offline.html');
        })
    );
    return;
  }
  
  // 对于其他请求，先尝试缓存，然后网络，同时更新缓存
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果在缓存中找到，返回缓存的响应
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 否则从网络获取
        return fetch(event.request)
          .then(response => {
            // 检查有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应以保存在缓存中
            const responseToCache = response.clone();
            
            // 添加到缓存
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch失败:', error);
            
            // 图片返回占位符
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match(BASE_PATH + 'images/offline-image.png');
            }
            
            // 其他请求返回空响应
            return new Response('', {
              status: 408,
              statusText: '离线模式：资源不可用'
            });
          });
      })
  );
});

// 处理推送事件（通知）
self.addEventListener('push', event => {
  console.log('[Service Worker] 收到推送事件', event);
  
  let notificationData = {
    title: APP_NAME,
    body: '有新的更新',
    icon: BASE_PATH + 'images/icon-192x192.png',
    badge: BASE_PATH + 'images/badge-72x72.png',
    data: {
      url: BASE_PATH
    }
  };
  
  // 尝试解析推送数据
  if (event.data) {
    try {
      console.log('推送数据:', event.data.text());
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
      
      // 如果是地图标记通知，添加特殊处理
      if (notificationData.data && notificationData.data.markerId) {
        // 添加地图标记特定的操作
        notificationData.actions = [
          { action: 'view-details', title: '查看详情' },
          { action: 'view-map', title: '在地图上查看' }
        ];
        
        // 添加震动模式来提高关注度
        notificationData.vibrate = [100, 50, 100, 50, 100];
      } else if (notificationData.data && notificationData.data.markerCount) {
        // 这是标记汇总通知
        notificationData.actions = [
          { action: 'view-all', title: '查看所有标记' }
        ];
      }
    } catch (e) {
      console.error('解析推送数据失败:', e);
      notificationData.body = event.data.text();
    }
  }
  
  console.log('通知数据:', notificationData);
  
  // 显示通知
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate || [100, 50, 100],
      data: notificationData.data || {},
      actions: notificationData.actions || [
        { action: 'view', title: '查看详情' }
      ],
      // 添加更多选项
      requireInteraction: true, // 要求用户交互，通知不会自动消失
      tag: notificationData.data && notificationData.data.markerId ? 
           'marker-' + notificationData.data.markerId : 
           'ptvalert-notification-' + Date.now()
    })
    .then(() => console.log('通知显示成功'))
    .catch(err => console.error('显示通知失败:', err))
  );
});

// 处理通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] 通知被点击', event);
  
  // 关闭通知
  event.notification.close();
  
  // 获取通知数据
  const data = event.notification.data || {};
  let url = data.url || BASE_PATH;
  
  // 处理不同的操作
  if (event.action === 'view' || event.action === 'view-details') {
    // 查看详情
    if (data.markerId) {
      url = `${BASE_PATH}?marker=${data.markerId}`;
    }
  } else if (event.action === 'view-map' && data.markerInfo) {
    // 在地图上查看
    if (data.markerInfo.lat && data.markerInfo.lng) {
      url = `${BASE_PATH}?lat=${data.markerInfo.lat}&lng=${data.markerInfo.lng}&zoom=15`;
    }
  } else if (event.action === 'view-all') {
    // 查看所有标记
    url = `${BASE_PATH}?show=all-markers`;
  }
  
  // 打开相应的URL
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // 检查是否已有窗口打开
        for (const client of clientList) {
          if ('focus' in client) {
            // 找到一个客户端窗口，发送消息告诉它显示这个标记
            client.focus();
            client.postMessage({
              type: 'SHOW_MARKER',
              markerId: data.markerId,
              markerInfo: data.markerInfo,
              action: event.action
            });
            return;
          }
        }
        
        // 如果没有窗口打开，打开一个新窗口
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// 处理同步事件以支持离线功能
self.addEventListener('sync', event => {
  console.log('[Service Worker] 后台同步:', event);
  
  if (event.tag === 'sync-markers') {
    event.waitUntil(syncMarkers());
  }
});

// 在后台同步标记
async function syncMarkers() {
  try {
    console.log('开始同步标记...');
    
    // 从服务器获取最新标记数据
    const lastUpdate = await getLastUpdateTime() || 0;
    const response = await fetch(`/api/markers?updated_since=${new Date(lastUpdate).toISOString()}`);
    
    if (!response.ok) {
      throw new Error('服务器响应错误: ' + response.statusText);
    }
    
    const data = await response.json();
    
    if (data.success && data.markers) {
      console.log(`同步到${data.markers.length}个标记`);
      
      // 将标记保存到本地
      for (const marker of data.markers) {
        await saveMarkerToIndexedDB(marker);
      }
      
      // 更新上次同步时间
      await updateLastSyncTime(Date.now());
    }
    
    return true;
  } catch (error) {
    console.error('同步标记失败:', error);
    return false;
  }
}

// 获取上次更新时间
async function getLastUpdateTime() {
  // 简化示例：从localStorage获取
  return parseInt(localStorage.getItem('markers_last_sync') || '0');
}

// 更新上次同步时间
async function updateLastSyncTime(timestamp) {
  // 简化示例：保存到localStorage
  localStorage.setItem('markers_last_sync', timestamp.toString());
}

// 保存标记到本地数据库
async function saveMarkerToIndexedDB(marker) {
  // 这里应该实现IndexedDB存储逻辑
  // 简化示例，实际应使用IndexedDB API
  console.log('保存标记到本地:', marker.id);
  
  // 如果有更新，通知用户
  if (marker.priority === 'high') {
    notifyMarkerUpdate(marker);
  }
}

// 通知标记更新
function notifyMarkerUpdate(marker) {
  self.registration.showNotification(`${APP_NAME}: 标记更新`, {
    body: marker.title || '地图标记已更新',
    icon: BASE_PATH + 'images/icon-192x192.png',
    badge: BASE_PATH + 'images/badge-72x72.png',
    data: {
      markerId: marker.id,
      markerInfo: marker
    },
    actions: [
      { action: 'view-details', title: '查看详情' },
      { action: 'view-map', title: '在地图上查看' }
    ]
  })
  .then(() => console.log('[Service Worker] 标记通知已显示:', marker.id))
  .catch(error => console.error('[Service Worker] 显示标记通知失败:', error));
}

// 处理消息事件 - 从网页接收消息
self.addEventListener('message', event => {
  console.log('[Service Worker] 收到消息', event.data);
  
  // 处理来自网页的消息
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] 已加载'); 