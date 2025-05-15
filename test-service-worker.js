/**
 * 简易的服务工作线程用于推送通知测试
 */

// 导入VAPID密钥配置 - 使用多种方式尝试
try {
  // 尝试使用相对路径
  try {
    importScripts('./vapid-keys.js');
    console.log('[测试 Service Worker] 成功使用相对路径加载VAPID密钥配置');
  } catch (e) {
    // 尝试使用绝对路径
    importScripts('/vapid-keys.js');
    console.log('[测试 Service Worker] 成功使用绝对路径加载VAPID密钥配置');
  }
} catch (error) {
  console.error('[测试 Service Worker] 加载VAPID密钥配置失败:', error);
  
  // 为防止错误中断Service Worker加载，定义默认值
  self.VAPID_KEYS = {
    publicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
  };
  
  self.PUSH_CONFIG = {
    VAPID_PUBLIC_KEY: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
  };
}

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