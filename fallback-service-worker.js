/**
 * 备用服务工作线程
 * 在主服务工作线程加载失败时提供基本功能
 */

// 导入VAPID密钥配置 - 使用多种方式尝试
try {
  // 尝试使用相对路径
  try {
    importScripts('./vapid-keys.js');
    console.log('[备用SW] 成功使用相对路径加载VAPID密钥配置');
  } catch (e) {
    // 尝试使用绝对路径
    importScripts('/vapid-keys.js');
    console.log('[备用SW] 成功使用绝对路径加载VAPID密钥配置');
  }
} catch (error) {
  console.error('[备用SW] 加载VAPID密钥配置失败:', error);
  
  // 为防止错误中断Service Worker加载，定义默认值
  self.VAPID_KEYS = {
    publicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
  };
  
  self.PUSH_CONFIG = {
    VAPID_PUBLIC_KEY: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
  };
}

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
  
  let notificationData = {
    title: '新通知',
    body: '收到新地图标记',
    icon: './images/icon-192x192.png',
    badge: './images/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'fallback-notification',
    data: {
      url: self.location.origin,
      timeStamp: Date.now()
    },
    actions: [
      { action: 'view', title: '查看地图' }
    ]
  };
  
  // 尝试解析推送数据
  try {
    if (event.data) {
      console.log('[备用SW] 推送载荷:', event.data.text());
      let data;
      try {
        data = event.data.json();
        console.log('[备用SW] 解析的JSON推送数据:', data);
      } catch (jsonError) {
        // 如果不是JSON，尝试使用文本数据
        const text = event.data.text();
        console.log('[备用SW] 非JSON推送数据:', text);
        try {
          // 再次尝试解析可能被包装的JSON
          data = JSON.parse(text);
        } catch (e) {
          console.log('[备用SW] 使用纯文本作为消息体');
          data = { body: text };
        }
      }
      
      // 合并数据
      if (data) {
        console.log('[备用SW] 使用推送数据更新通知');
        
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
    console.error('[备用SW] 解析推送数据失败:', error);
  }
  
  console.log('[备用SW] 最终通知数据:', notificationData);
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('[备用SW] 通知被点击');
  
  // 关闭通知
  event.notification.close();
  
  // 获取通知数据
  const notificationData = event.notification.data || {};
  
  // 准备URL
  let url = notificationData.url || self.location.origin;
  
  // 如果有标记ID，添加到URL
  if (notificationData.markerId) {
    url += `?marker=${notificationData.markerId}`;
  }
  
  console.log('[备用SW] 将打开URL:', url);
  
  // 处理通知操作
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // 查找已打开的窗口
        for (const client of clientList) {
          if ((new URL(client.url).origin === new URL(url).origin) && 'focus' in client) {
            // 找到匹配的源，发送消息并聚焦
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: notificationData
            });
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