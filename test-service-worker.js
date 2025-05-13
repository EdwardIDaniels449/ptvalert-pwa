/**
 * 简易的服务工作线程用于推送通知测试
 */

// 安装事件
self.addEventListener('install', event => {
  console.log('[测试 Service Worker] 安装中');
  // 跳过等待，立即激活
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('[测试 Service Worker] 已激活');
  return self.clients.claim();
});

// 推送事件
self.addEventListener('push', event => {
  console.log('[测试 Service Worker] 收到推送消息', event);

  let notification = {
    title: '测试通知',
    body: '这是一条默认测试通知',
    icon: '/images/favicon.ico',
    badge: '/images/favicon.ico'
  };

  try {
    if (event.data) {
      const data = event.data.json();
      notification = data.notification || notification;
    }
  } catch (e) {
    console.error('[测试 Service Worker] 解析推送数据失败', e);
  }

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: notification.data || {}
    })
  );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('[测试 Service Worker] 通知被点击', event);
  
  event.notification.close();
  
  // 点击通知时打开URL
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

console.log('[测试 Service Worker] 已加载'); 