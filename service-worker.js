// 推送通知Service Worker
const CACHE_NAME = 'ptvalert-cache-v8';
const APP_NAME = '网站地图标记';
const APP_VERSION = '1.1.0';

// 确定基础路径 - 使用简单稳定的方法
function getBasePath() {
  // 记录当前地址
  const currentLocation = self.location.href;
  
  // 默认使用相对路径作为基础路径
  let basePath = './';
  
  try {
    // 检测是否运行在GitHub Pages环境中
    const isGithubPages = currentLocation.includes('github.io');
    if (isGithubPages) {
      // 尝试从URL中提取仓库名
      const urlParts = new URL(currentLocation);
      const pathSegments = urlParts.pathname.split('/');
      
      if (pathSegments.length >= 2 && pathSegments[1]) {
        const repoName = pathSegments[1];
        basePath = '/' + repoName + '/';
      }
    }
  } catch (e) {
    console.error('[Service Worker] 计算基础路径时出错:', e);
  }
  
  console.log('[Service Worker] 使用基础路径:', basePath);
  return basePath;
}

const BASE_PATH = getBasePath();

// 为避免加载问题，定义默认VAPID配置
self.VAPID_KEYS = {
  publicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
};

self.PUSH_CONFIG = {
  VAPID_PUBLIC_KEY: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
};

// 调试输出
console.log('[Service Worker] 启动，版本:', APP_VERSION);

// 记录一些调试信息
console.log('[Service Worker] 启动配置:');
console.log('- 缓存名称:', CACHE_NAME);
console.log('- 应用名称:', APP_NAME);
console.log('- 版本:', APP_VERSION);
console.log('- 基础路径:', BASE_PATH);
console.log('- 主机名:', self.location.hostname);
console.log('- 完整URL:', self.location.href);

// 要缓存的核心资源 - 兼容多种访问路径
const CORE_ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'favicon.ico',
  BASE_PATH + 'js/pure-google-maps-fix.js',
  BASE_PATH + 'js/marker-cleanup-service.js',
  BASE_PATH + 'js/ui-controller.js',
  BASE_PATH + 'js/marker-cleanup-fix.js',
  BASE_PATH + 'offline.html'
];

// 可选缓存资源 - 如果获取失败不会阻塞安装
const OPTIONAL_ASSETS = [
  BASE_PATH + 'js/notification-handler.js',
  BASE_PATH + 'js/url-fix.js',
  BASE_PATH + 'js/github-pages-fix.js',
  BASE_PATH + 'js/firebase-to-cloudflare-sync.js',
  BASE_PATH + 'images/icon-192x192.png',
  BASE_PATH + 'images/icon-512x512.png',
  BASE_PATH + 'images/badge-72x72.png'
];

// 安装Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] 正在安装');
  
  // 跳过等待，让新的service worker立即激活
  self.skipWaiting();
  
  // 缓存核心静态资源
  event.waitUntil(
    Promise.all([
      // 核心资源 - 逐个缓存以避免一个失败导致整个安装失败
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] 缓存核心资源');
          
          // 单独处理每个核心资源
          const corePromises = CORE_ASSETS.map(url => {
            return fetch(url, { cache: 'no-cache' })
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn(`[Service Worker] 核心资源获取失败: ${url}`, response.status);
                return Promise.resolve(); // 继续其他资源缓存
              })
              .catch(error => {
                console.warn(`[Service Worker] 核心资源缓存错误: ${url}`, error);
                return Promise.resolve(); // 继续其他资源缓存
              });
          });
          
          return Promise.allSettled(corePromises)
            .then(results => {
              const succeeded = results.filter(r => r.status === 'fulfilled').length;
              console.log(`[Service Worker] 核心资源缓存结果: ${succeeded}/${CORE_ASSETS.length} 成功`);
              return true;
            });
        }),
      
      // 可选资源 - 单独处理，以免一个失败导致整个安装失败
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] 尝试缓存可选资源');
          
          // 单独缓存每个文件
          const optionalCachePromises = OPTIONAL_ASSETS.map(url => {
            return fetch(url, { cache: 'no-cache' })
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn(`[Service Worker] 可选资源获取失败: ${url}`, response.status);
                return Promise.resolve();
              })
              .catch(error => {
                console.warn(`[Service Worker] 可选资源缓存错误: ${url}`, error);
                return Promise.resolve();
              });
          });
          
          return Promise.allSettled(optionalCachePromises)
            .then(results => {
              const succeeded = results.filter(r => r.status === 'fulfilled').length;
              console.log(`[Service Worker] 可选资源缓存结果: ${succeeded}/${OPTIONAL_ASSETS.length}成功`);
              return true;
            });
        }).catch(error => {
          console.warn('[Service Worker] 可选资源缓存过程出错:', error);
          return Promise.resolve();
        })
    ])
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
          if (cacheName !== CACHE_NAME && cacheName.startsWith('ptvalert-cache')) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
});

// 处理fetch请求，简化处理逻辑以提高可靠性
self.addEventListener('fetch', event => {
  // 跳过非GET请求
  if (event.request.method !== 'GET') return;
  
  try {
    const url = new URL(event.request.url);
    
    // 跳过API请求和扩展请求
    if (
      event.request.url.includes('/api/') ||
      event.request.url.includes('chrome-extension') ||
      url.protocol === 'chrome-extension:'
    ) {
      return;
    }
    
    // 检查是否是导航请求（页面加载）
    const isNavigationRequest = event.request.mode === 'navigate';
    
    // 对导航请求和所有其他请求都使用网络优先策略，保证内容始终最新
    // 这种策略对移动端 Safari 更友好
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 只缓存成功的响应
          if (response && response.status === 200) {
            // 创建响应副本以便缓存
            const responseToCache = response.clone();
            
            // 异步缓存，不阻塞响应返回
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.warn('[Service Worker] 缓存响应失败:', err);
              });
          }
          
          return response;
        })
        .catch(error => {
          console.log('[Service Worker] 网络请求失败，尝试使用缓存:', error);
          
          // 网络请求失败，尝试从缓存获取
          return caches.match(event.request)
            .then(cachedResponse => {
              // 有缓存则使用缓存
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // 如果是导航请求，提供离线页面
              if (isNavigationRequest) {
                return caches.match(BASE_PATH + 'offline.html')
                  .catch(() => {
                    // 如果连离线页面都没有，返回一个基本提示
                    return new Response(
                      '网络连接失败。请检查您的网络连接并重试。',
                      {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                          'Content-Type': 'text/html;charset=UTF-8'
                        })
                      }
                    );
                  });
              }
              
              // 对于CSS和JS等资源，返回空响应避免控制台报错
              if (url.pathname.endsWith('.css')) {
                return new Response('/* 网络连接失败，使用空CSS */', { 
                  status: 200, 
                  headers: {'Content-Type': 'text/css'} 
                });
              }
              
              if (url.pathname.endsWith('.js')) {
                return new Response('// 网络连接失败，使用空JS', { 
                  status: 200, 
                  headers: {'Content-Type': 'application/javascript'} 
                });
              }
              
              // 对于图片，返回1x1透明图
              if (url.pathname.match(/\.(png|jpe?g|gif|webp|svg)$/i)) {
                return fetch(BASE_PATH + 'images/fallback-image.png')
                  .catch(() => {
                    // 如果 fallback 图片不存在，返回空响应
                    return new Response('', { status: 200 });
                  });
              }
              
              // 其他类型的请求返回空响应
              return new Response('', { status: 200 });
            });
        })
    );
  } catch (error) {
    console.error('[Service Worker] fetch 处理过程出错:', error);
    // 不中断，让浏览器继续处理请求
  }
});

// 处理推送事件（通知）
self.addEventListener('push', function(event) {
  console.log('[Service Worker] 收到推送消息');
  
  let notificationData = {
    title: '新地图标记',
    body: '地图上有新的标记信息',
    icon: BASE_PATH + 'images/icon-192x192.png',
    badge: BASE_PATH + 'images/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'map-marker-notification',
    data: {
      url: self.location.origin + BASE_PATH,
      timeStamp: Date.now()
    },
    actions: [
      { action: 'view', title: '查看地图' }
    ]
  };
  
  // 尝试解析推送数据
  try {
    if (event.data) {
      let data;
      try {
        data = event.data.json();
      } catch (jsonError) {
        // 如果不是JSON，尝试使用文本数据
        const text = event.data.text();
        try {
          // 再次尝试解析可能被包装的JSON
          data = JSON.parse(text);
        } catch (e) {
          data = { body: text };
        }
      }
      
      // 合并数据
      if (data) {
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
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] 通知被点击:', event.notification.tag);
  
  event.notification.close();
  
  let notificationData = event.notification.data || {};
  let url = notificationData.url || self.location.origin + BASE_PATH;
  
  // 如果点击了特定的操作按钮
  if (event.action === 'view' && notificationData.markerId) {
    // 构建特定标记的URL
    url = `${url}?marker=${notificationData.markerId}`;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(function(clientList) {
      // 查找已经打开的窗口并导航
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('navigate' in client && client.url.includes(self.location.origin)) {
          return client.navigate(url).then(client => client.focus());
        }
      }
      // 如果没有打开的窗口，则打开新窗口
      return clients.openWindow(url);
    })
  );
});

// 后台同步支持
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] 收到后台同步请求:', event.tag);
  
  if (event.tag === 'sync-markers') {
    event.waitUntil(syncMarkers());
  }
});

// 后台同步标记数据
async function syncMarkers() {
  console.log('[Service Worker] 开始同步标记数据');
  
  try {
    // 获取上次同步时间
    const lastSync = await getLastUpdateTime();
    const now = Date.now();
    
    // 从客户端获取待同步的标记
    const pendingData = await getPendingDataFromClients();
    
    if (!pendingData || !pendingData.markers || pendingData.markers.length === 0) {
      console.log('[Service Worker] 没有待同步的标记');
      return;
    }
    
    // 同步标记到服务器
    const syncResult = await syncMarkersToServer(pendingData.markers);
    
    // 更新最后同步时间
    await updateLastSyncTime(now);
    
    // 通知同步结果
    await notifySync({
      success: true,
      count: pendingData.markers.length,
      message: '标记同步成功'
    });
    
    return syncResult;
  } catch (error) {
    console.error('[Service Worker] 同步标记数据失败:', error);
    
    // 通知同步失败
    await notifySync({
      success: false,
      error: error.message,
      message: '标记同步失败'
    });
    
    return { success: false, error: error.message };
  }
}

// 获取最后更新时间
async function getLastUpdateTime() {
  return 0; // 简化实现
}

// 更新最后同步时间
async function updateLastSyncTime(timestamp) {
  // 简化实现
}

// 获取待处理的标记
async function getPendingMarkers() {
  // 简化实现，返回空数组
  return [];
}

// 从客户端获取待处理数据
async function getPendingDataFromClients() {
  try {
    const clientList = await clients.matchAll();
    
    // 如果没有客户端，返回空数据
    if (!clientList || clientList.length === 0) {
      return { markers: [] };
    }
    
    // 向第一个客户端请求数据
    const client = clientList[0];
    
    // 创建一个Promise来处理消息响应
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('从客户端获取数据超时'));
      }, 3000);
      
      // 创建一个消息通道
      const messageChannel = new MessageChannel();
      
      // 设置响应处理
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data || { markers: [] });
      };
      
      // 发送消息到客户端
      client.postMessage({
        type: 'GET_PENDING_MARKERS'
      }, [messageChannel.port2]);
    });
  } catch (error) {
    console.error('[Service Worker] 从客户端获取数据失败:', error);
    return { markers: [] };
  }
}

// 同步标记到服务器
async function syncMarkersToServer(markers) {
  // 简化实现，模拟成功
  console.log('[Service Worker] 同步标记到服务器:', markers.length);
  
  // 通知客户端同步成功
  const clientList = await clients.matchAll();
  for (const client of clientList) {
    client.postMessage({
      type: 'MARKERS_SYNCED',
      data: { count: markers.length }
    });
  }
  
  return { success: true, count: markers.length };
}

// 通知同步结果
async function notifySync(result) {
  try {
    const clientList = await clients.matchAll();
    for (const client of clientList) {
      client.postMessage({
        type: 'SYNC_RESULT',
        data: result
      });
    }
  } catch (error) {
    console.error('[Service Worker] 通知同步结果失败:', error);
  }
}

console.log('[Service Worker] 已加载'); 