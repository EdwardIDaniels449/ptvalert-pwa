// 推送通知Service Worker
const CACHE_NAME = 'ptvalert-cache-v6';
const APP_NAME = '网站地图标记';
const APP_VERSION = '1.0.7';

// 调试输出
console.log('[Service Worker] 启动，版本:', APP_VERSION);

// 确定基础路径 - 使用简单稳定的方法
function getBasePath() {
  console.log('[Service Worker] 检测运行环境...');
  
  // 记录当前地址
  const currentLocation = self.location.href;
  console.log('[Service Worker] 当前脚本URL:', currentLocation);
  
  // 无论在什么环境下，默认使用相对路径
  // 这样可以避免复杂的路径解析问题
  return './';
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
  // 移除可能不存在的文件，避免缓存失败
  // BASE_PATH + 'offline.html',
  // BASE_PATH + 'push-client.js',
  // BASE_PATH + 'styles.css',
  BASE_PATH + 'js/notification-handler.js',
  BASE_PATH + 'js/url-fix.js',
  BASE_PATH + 'js/github-pages-fix.js',
  // 图标和图片
  BASE_PATH + 'images/icon-192x192.png'
  // 移除可能不存在的图片
  // BASE_PATH + 'images/badge-72x72.png'
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
        // 单独缓存每个文件，而不是使用addAll，这样一个文件失败不会导致整个缓存操作失败
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(error => {
            console.error(`[Service Worker] 缓存文件失败: ${url}`, error);
            // 即使单个文件缓存失败，也继续进行
            return Promise.resolve();
          });
        });
        
        return Promise.all(cachePromises);
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
self.addEventListener('push', function(event) {
  console.log('[Service Worker] 收到推送消息');
  
  let notificationData = {
    title: '新地图标记',
    body: '地图上有新的标记信息',
    icon: './images/icon-192x192.png',
    badge: './images/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'map-marker-notification',
    data: {
      url: self.location.origin + getBasePath(), // 使用正确的基础路径
      timeStamp: Date.now()
    },
    actions: [
      { action: 'view', title: '查看地图' }
    ]
  };
  
  // 尝试解析推送数据
  try {
    if (event.data) {
      console.log('[Service Worker] 推送载荷:', event.data.text());
      let data;
      try {
        data = event.data.json();
        console.log('[Service Worker] 解析的JSON推送数据:', data);
      } catch (jsonError) {
        // 如果不是JSON，尝试使用文本数据
        const text = event.data.text();
        console.log('[Service Worker] 非JSON推送数据:', text);
        try {
          // 再次尝试解析可能被包装的JSON
          data = JSON.parse(text);
        } catch (e) {
          console.log('[Service Worker] 使用纯文本作为消息体');
          data = { body: text };
        }
      }
      
      // 合并数据
      if (data) {
        console.log('[Service Worker] 使用推送数据更新通知');
        
        // 如果收到完整的通知对象
        if (data.notification) {
          notificationData = {
            ...notificationData,
            ...data.notification
          };
        } 
        // 如果直接收到通知字段
        else {
          notificationData = {
            ...notificationData,
            ...data
          };
          
          // 确保有标题
          if (!notificationData.title && data.title) {
            notificationData.title = data.title;
          }
          
          // 提取标记信息
          if (data.marker) {
            notificationData.body = `新标记: ${data.marker.title || data.marker.description || '地图标记更新'}`;
            notificationData.data = notificationData.data || {};
            notificationData.data.markerId = data.marker.id;
            notificationData.data.markerInfo = data.marker;
          }
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] 解析推送数据失败:', error);
  }
  
  console.log('[Service Worker] 最终通知数据:', notificationData);
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] 通知被点击', event.notification.tag);
  console.log('[Service Worker] 通知数据:', event.notification.data);
  
  // 关闭通知
  event.notification.close();
  
  // 获取通知数据
  const notificationData = event.notification.data || {};
  
  // 准备URL
  let url = notificationData.url || (self.location.origin + getBasePath());
  
  // 如果有标记ID，添加到URL
  if (notificationData.markerId) {
    url += `?marker=${notificationData.markerId}`;
  }
  
  console.log('[Service Worker] 将打开URL:', url);
  
  // 处理通知操作
  if (event.action === 'view' || !event.action) {
    // 处理查看地图操作 - 打开或聚焦窗口
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(clientList) {
        // 查找已打开的窗口
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ((new URL(client.url).origin === new URL(url).origin) && 'focus' in client) {
            // 找到匹配的源，发送消息并聚焦
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: notificationData
            });
            return client.focus();
          }
        }
        
        // 如果没有找到窗口，就打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
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