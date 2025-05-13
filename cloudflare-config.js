/**
 * PtvAlert Cloudflare API配置
 */
const cloudflareConfig = {
  // API 基础URL
  apiBaseUrl: 'https://ptvalert.qingyangzhou85.workers.dev',
  
  // 使用真实API (不是模拟响应)
  useRealApi: true,
  
  // 调试模式 (打印更多日志)
  debug: false,
  
  // VAPID 公钥 (用于推送通知)
  vapidPublicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cloudflareConfig;
} else if (typeof window !== 'undefined') {
  window.cloudflareConfig = cloudflareConfig;
} 