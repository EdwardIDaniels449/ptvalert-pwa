// 推送通知配置文件示例
// 复制此文件为config.js并填入实际值

window.PUSH_CONFIG = {
  // 服务器URL - 部署Cloudflare Worker的URL
  SERVER_URL: 'https://your-worker.your-account.workers.dev', // 请替换为您的实际Worker URL
  
  // VAPID公钥 - 需要与服务端使用的公钥匹配
  VAPID_PUBLIC_KEY: '', // 填入您的VAPID公钥
  
  // 服务工作线程文件的路径
  SERVICE_WORKER_PATH: '/service-worker.js'
}; 