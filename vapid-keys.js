/**
 * VAPID Keys for Web Push Notifications
 * 这些密钥用于Web Push API身份验证
 */

// VAPID Keys 配置文件
// 这个文件包含敏感信息，不应该提交到代码仓库中

window.VAPID_KEYS = {
  // VAPID公钥 - 确保是有效的P-256公钥
  publicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8',
  
  // VAPID私钥
  privateKey: 'x2d0l1bc7Nzt432do68nVaBARMNBKz5rX0HnVFYquLE',
  
  // VAPID subject (一般是mailto:链接)
  subject: 'mailto:qingyangzhou85@gmail.com'
};

// 推送通知配置
window.PUSH_CONFIG = {
  // 服务器URL
  SERVER_URL: 'https://ptvalert.pages.dev',
  
  // VAPID公钥 (用于订阅推送通知) - 使用相同的公钥以保持一致性
  VAPID_PUBLIC_KEY: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8',
  
  // Service Worker路径
  SERVICE_WORKER_PATH: '/service-worker.js'
};

console.log('Push notification configuration loaded'); 