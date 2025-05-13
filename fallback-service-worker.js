/**
 * 备用服务工作线程
 * 在主服务工作线程加载失败时提供基本功能
 */

console.log('[备用SW] 备用服务工作线程已加载');

// 基本配置
const CACHE_NAME = 'ptvalert-fallback-cache-v1';
const APP_SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './images/icon-192x192.png'
];

// 安装事件
self.addEventListener('install', event => {
  console.log('[备用SW] 安装事件');
  
  // 立即激活
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      
      // 缓存基本资源
      caches.open(CACHE_NAME).then(cache => {
        console.log('[备用SW] 缓存核心资源');
        return cache.addAll(APP_SHELL_FILES).catch(err => {
          console.warn('[备用SW] 缓存资源失败，这在GitHub Pages环境下是正常的:', err);
        });
      })
    ])
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('[备用SW] 激活事件');
  
  // 接管所有客户端
  event.waitUntil(
    Promise.all([
      clients.claim(),
      
      // 清理旧缓存
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName !== CACHE_NAME;
          }).map(cacheName => {
            console.log('[备用SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    ])
  );
});

// 获取事件 - 缓存优先策略
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 不处理跨域请求
  if (url.origin !== self.location.origin) {
    // 处理API请求
    if (url.href.includes('/api/')) {
      return event.respondWith(handleApiRequest(event.request));
    }
    return;
  }
  
  // 处理导航请求
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log('[备用SW] 导航请求失败，回退到缓存:', event.request.url);
        return caches.match('./') || caches.match('./index.html');
      })
    );
    return;
  }
  
  // 处理其他请求
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        console.log('[备用SW] 从缓存提供:', event.request.url);
        return cachedResponse;
      }
      
      return fetch(event.request).then(response => {
        // 如果是成功的请求，缓存一份副本
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(error => {
        console.log('[备用SW] 网络请求失败:', event.request.url, error);
        
        // 对于CSS和JavaScript文件的请求失败，返回空响应避免报错
        if (url.pathname.endsWith('.css')) {
          return new Response('/* 备用空CSS */', {
            headers: { 'Content-Type': 'text/css' }
          });
        }
        
        if (url.pathname.endsWith('.js')) {
          return new Response('// 备用空JavaScript', {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
        
        throw error;
      });
    })
  );
});

// 推送事件
self.addEventListener('push', event => {
  console.log('[备用SW] 收到推送事件');
  
  const title = '新通知';
  const options = {
    body: '收到新地图标记',
    icon: './images/icon-192x192.png',
    badge: './images/icon-72x72.png',
    data: {
      url: self.location.origin
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('[备用SW] 通知被点击');
  
  event.notification.close();
  
  const url = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : self.location.origin;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // 查找已打开的窗口
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 如果没有找到窗口，打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// 处理API请求
async function handleApiRequest(request) {
  const url = new URL(request.url);
  console.log('[备用SW] 处理API请求:', url.pathname);
  
  // 模拟响应
  const mockResponse = {
    success: true,
    message: '这是一个模拟响应',
    timestamp: new Date().toISOString(),
    endpoint: url.pathname
  };
  
  // 添加特定API路径的模拟数据
  if (url.pathname.includes('/api/markers')) {
    mockResponse.data = {
      markers: [
        { id: 1, lat: -37.8136, lng: 144.9631, title: '墨尔本市中心' },
        { id: 2, lat: -37.8079, lng: 144.9732, title: '展览中心' }
      ]
    };
  } else if (url.pathname.includes('/api/notifications')) {
    mockResponse.data = {
      unread: 2,
      notifications: [
        { id: 101, title: '新标记', message: '墨尔本市中心有新标记' },
        { id: 102, title: '系统通知', message: '欢迎使用地图标记系统' }
      ]
    };
  }
  
  return new Response(JSON.stringify(mockResponse), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Generated-By': 'Fallback-Service-Worker'
    }
  });
} 