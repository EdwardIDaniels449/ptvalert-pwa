/**
 * 备用服务工作线程
 * 在主服务工作线程加载失败时提供基本功能
 */

console.log('[备用SW] 备用服务工作线程已加载');

// 安装事件
self.addEventListener('install', event => {
  console.log('[备用SW] 安装事件');
  // 立即激活
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('[备用SW] 激活事件');
  // 接管所有客户端
  event.waitUntil(clients.claim());
});

// 获取事件 - 简单的网络优先策略
self.addEventListener('fetch', event => {
  console.log('[备用SW] 截获请求:', event.request.url);
  
  // 特殊处理GitHub Pages环境中的请求
  if (self.location.hostname.includes('github.io')) {
    // 处理API请求 (模拟响应)
    if (event.request.url.includes('/api/')) {
      return event.respondWith(handleApiRequest(event.request));
    }
  }
  
  // 对于普通请求，尝试网络，如果失败则使用缓存
  event.respondWith(
    fetch(event.request)
      .catch(error => {
        console.log('[备用SW] 网络请求失败，尝试使用缓存:', error);
        return caches.match(event.request);
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