/**
 * VAPID Keys for Web Push Notifications
 * 这些密钥用于Web Push API身份验证
 */

// 检测当前环境 - 区分Service Worker和Window
const isServiceWorker = typeof self !== 'undefined' && !self.window;
const isWindow = typeof window !== 'undefined';

// 定义VAPID密钥
const VAPID_KEYS_DATA = {
  // VAPID公钥 - 确保是有效的P-256公钥
  publicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8',
  
  // VAPID私钥
  privateKey: 'x2d0l1bc7Nzt432do68nVaBARMNBKz5rX0HnVFYquLE',
  
  // VAPID subject (一般是mailto:链接)
  subject: 'mailto:qingyangzhou85@gmail.com'
};

// 推送通知配置
const PUSH_CONFIG_DATA = {
  // 服务器URL
  SERVER_URL: 'https://ptvalert.pages.dev',
  
  // VAPID公钥 (用于订阅推送通知) - 使用相同的公钥以保持一致性
  VAPID_PUBLIC_KEY: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8',
  
  // Service Worker路径
  SERVICE_WORKER_PATH: '/service-worker.js'
};

// 根据环境导出/设置变量
if (isServiceWorker) {
  // Service Worker 环境
  self.VAPID_KEYS = VAPID_KEYS_DATA;
  self.PUSH_CONFIG = PUSH_CONFIG_DATA;
  console.log('[SW] 推送通知配置已在Service Worker中加载');
} else if (isWindow) {
  // 浏览器环境
  window.VAPID_KEYS = VAPID_KEYS_DATA;
  window.PUSH_CONFIG = PUSH_CONFIG_DATA;
  console.log('推送通知配置已在浏览器中加载');
} else {
  // 其他环境（如Node.js）
  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        VAPID_KEYS: VAPID_KEYS_DATA,
        PUSH_CONFIG: PUSH_CONFIG_DATA
      };
    }
  } catch (e) {
    console.error('无法导出推送配置:', e);
  }
} 