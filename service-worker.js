// 推送通知Service Worker
const CACHE_NAME = 'ptvalert-cache-v7';
const APP_NAME = '网站地图标记';
const APP_VERSION = '1.0.8';

// 确定基础路径 - 使用简单稳定的方法
function getBasePath() {
  console.log('[Service Worker] 检测运行环境...');
  
  // 记录当前地址
  const currentLocation = self.location.href;
  console.log('[Service Worker] 当前脚本URL:', currentLocation);
  
  // 检测是否运行在GitHub Pages环境中
  const isGithubPages = currentLocation.includes('github.io');
  if (isGithubPages) {
    console.log('[Service Worker] 检测到GitHub Pages环境');
    // 尝试从URL中提取仓库名
    const urlParts = new URL(currentLocation);
    const pathSegments = urlParts.pathname.split('/');
    
    if (pathSegments.length >= 2 && pathSegments[1]) {
      const repoName = pathSegments[1];
      const basePath = '/' + repoName + '/';
      console.log('[Service Worker] 提取的仓库路径:', basePath);
      return basePath;
    }
  }
  
  // 无论在什么环境下，默认使用相对路径
  // 这样可以避免复杂的路径解析问题
  return './';
}

const BASE_PATH = getBasePath();

// 导入必要的脚本 - 使用绝对路径和相对路径都尝试
try {
  // 首先尝试使用基础路径
  try {
    importScripts(BASE_PATH + 'vapid-keys.js');
    console.log('[Service Worker] 成功使用基础路径加载VAPID密钥配置');
  } catch (e) {
    // 如果失败，尝试使用相对路径
    importScripts('./vapid-keys.js');
    console.log('[Service Worker] 成功使用相对路径加载VAPID密钥配置');
  }
} catch (error) {
  console.error('[Service Worker] 加载VAPID密钥配置失败:', error);
  
  // 为防止错误中断Service Worker加载，定义默认值
  self.VAPID_KEYS = {
    publicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
  };
  
  self.PUSH_CONFIG = {
    VAPID_PUBLIC_KEY: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
  };
}

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

// 要缓存的核心资源 - 使用相对路径以兼容GitHub Pages
const CORE_ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'favicon.ico',
  BASE_PATH + 'js/notification-handler.js',
  BASE_PATH + 'js/url-fix.js',
  BASE_PATH + 'js/github-pages-fix.js',
  BASE_PATH + 'js/globals-fix.js',
  BASE_PATH + 'js/firebase-to-cloudflare-sync.js',
  BASE_PATH + 'js/markers-cleanup.js',
  BASE_PATH + 'images/icon-192x192.png'
];

// 可选缓存资源 - 如果获取失败不会阻塞安装
const OPTIONAL_ASSETS = [
  BASE_PATH + 'offline.html',
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
      // 核心资源 - 必须全部缓存成功
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] 缓存核心资源');
          return cache.addAll(CORE_ASSETS)
            .then(() => {
              console.log('[Service Worker] 核心资源缓存成功');
              return true;
            })
            .catch(error => {
              console.error('[Service Worker] 缓存核心资源失败:', error);
              return Promise.reject(error);
            });
        }),
      
      // 可选资源 - 单独处理，以免一个失败导致整个安装失败
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] 尝试缓存可选资源');
          
          // 单独缓存每个文件，而不是使用addAll，这样一个文件失败不会导致整个缓存操作失败
          const optionalCachePromises = OPTIONAL_ASSETS.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`[Service Worker] 可选资源缓存失败: ${url}`, error);
              // 即使单个文件缓存失败，也继续进行
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
          // 可选资源错误不影响安装
          return Promise.resolve();
        })
    ]).catch(error => {
      console.error('[Service Worker] 安装失败:', error);
      return Promise.reject(error);
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

// 处理fetch请求，使用网络优先策略，但对静态资源使用缓存优先
self.addEventListener('fetch', event => {
  // 跳过非GET请求
  if (event.request.method !== 'GET') return;
  
  // 跳过非同源请求和不可缓存的请求
  const url = new URL(event.request.url);
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('chrome-extension') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }
  
  // 对核心静态资源使用缓存优先策略
  const isCoreAsset = CORE_ASSETS.some(asset => 
    event.request.url.endsWith(asset) || 
    event.request.url.includes(asset)
  );
  
  // 对CSS、JS、字体和图片等静态资源使用缓存优先
  const isStaticAsset = /\.(css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|ico)$/i.test(event.request.url);
  
  if (isCoreAsset || isStaticAsset) {
    // 缓存优先，网络回退
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // 如果在缓存中找到，异步更新缓存但立即返回缓存版本
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              // 更新缓存
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseToCache);
                });
              }
            })
            .catch(error => {
              console.log('[Service Worker] 静态资源网络更新失败，使用缓存版本:', error);
            });
            
          // 异步执行，不等待结果
          // fetchPromise不影响返回结果
          
          return cachedResponse;
        }
        
        // 如果未在缓存中找到，从网络获取并缓存
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            
            // 缓存网络响应
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] 静态资源获取失败:', error);
            // 对于图片，可以返回占位图
            if (/\.(png|jpe?g|gif|svg|webp)$/i.test(event.request.url)) {
              return caches.match(BASE_PATH + 'images/icon-192x192.png');
            }
            
            // 对于其他静态资源，尝试返回离线版本
            if (event.request.mode === 'navigate') {
              return caches.match(BASE_PATH + 'offline.html');
            }
            
            // 其他情况，返回错误响应
            return new Response('静态资源加载失败', {
              status: 503,
              statusText: '服务不可用'
            });
          });
      })
    );
  } else {
    // 对于其他请求（如API数据），使用网络优先，缓存回退策略
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 对成功的响应进行缓存
          if (response && response.status === 200) {
            // 非导航请求且不是https URL不要缓存，可能是第三方服务
            if (event.request.mode !== 'navigate' && 
                !event.request.url.startsWith('https')) {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(error => {
          console.log('[Service Worker] 网络请求失败，尝试从缓存获取:', error);
          
          // 从缓存中尝试获取
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // 如果是导航请求，返回离线页面
              if (event.request.mode === 'navigate') {
                return caches.match(BASE_PATH + 'offline.html');
              }
              
              // 其他情况，返回错误响应
              return new Response('网络错误，且缓存中无数据', {
                status: 503,
                statusText: '服务不可用'
              });
            });
        })
    );
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
      url: self.location.origin + BASE_PATH, // 使用正确的基础路径
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
    
    // 从IndexedDB获取待同步的标记
    const pendingMarkers = await getPendingMarkers();
    
    if (pendingMarkers.length === 0) {
      console.log('[Service Worker] 没有待同步的标记');
      return;
    }
    
    console.log(`[Service Worker] 找到${pendingMarkers.length}个待同步标记`);
    
    // 执行同步
    const result = await syncMarkersToServer(pendingMarkers);
    
    // 更新同步时间
    await updateLastSyncTime(now);
    
    console.log('[Service Worker] 同步完成，结果:', result);
    
    // 通知同步结果
    await notifySync(result);
    
    return result;
  } catch (error) {
    console.error('[Service Worker] 同步标记失败:', error);
    
    // 尝试通知失败
    try {
      await self.registration.showNotification('同步失败', {
        body: '标记数据同步失败，将稍后重试',
        icon: BASE_PATH + 'images/icon-192x192.png'
      });
    } catch (notificationError) {
      console.error('[Service Worker] 无法显示同步失败通知:', notificationError);
    }
    
    throw error;
  }
}

// 获取上次更新时间
async function getLastUpdateTime() {
  // 实现从缓存或IndexedDB获取上次更新时间
  return 0; // 默认返回0表示没有上次更新
}

// 更新同步时间
async function updateLastSyncTime(timestamp) {
  // 实现保存同步时间到缓存或IndexedDB
  console.log('[Service Worker] 更新同步时间:', new Date(timestamp).toISOString());
}

// 获取待同步的标记
async function getPendingMarkers() {
  // 从localStorage获取待同步的标记
  try {
    const pendingData = await getPendingDataFromClients();
    if (pendingData && pendingData.length > 0) {
      return pendingData;
    }
  } catch (error) {
    console.error('[Service Worker] 获取待同步标记失败:', error);
  }
  return [];
}

// 从客户端获取待同步的数据
async function getPendingDataFromClients() {
  const clientList = await clients.matchAll();
  
  // 尝试从每个客户端获取数据
  for (const client of clientList) {
    try {
      // 向客户端发送消息请求数据
      const response = await new Promise((resolve) => {
        let messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        client.postMessage({
          type: 'GET_PENDING_MARKERS'
        }, [messageChannel.port2]);
        
        // 5秒超时
        setTimeout(() => resolve(null), 5000);
      });
      
      if (response && response.pendingMarkers) {
        return response.pendingMarkers;
      }
    } catch (error) {
      console.error('[Service Worker] 从客户端获取数据失败:', error);
    }
  }
  
  return [];
}

// 将标记同步到服务器
async function syncMarkersToServer(markers) {
  console.log(`[Service Worker] 开始向服务器同步${markers.length}个标记`);
  
  // 这里应该实现向服务器同步数据的逻辑
  // 目前只是模拟同步
  
  return {
    total: markers.length,
    success: markers.length,
    failed: 0
  };
}

// 通知同步结果
async function notifySync(result) {
  if (result.success > 0) {
    await self.registration.showNotification('同步成功', {
      body: `成功同步${result.success}个标记`,
      icon: BASE_PATH + 'images/icon-192x192.png'
    });
  }
}

console.log('[Service Worker] 已加载'); 