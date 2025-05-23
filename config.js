// 推送通知配置文件
// 这个文件包含敏感信息，不应该提交到代码仓库中

window.PUSH_CONFIG = {
  // 服务器URL - 修改为相对路径或正确的GitHub Pages路径
  SERVER_URL: window.location.hostname.includes('github.io') ? 
    'https://edwardidaniels449.github.io' : 
    window.location.origin,
  
  // VAPID公钥 - 需要与服务端使用的公钥匹配
  VAPID_PUBLIC_KEY: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8', // 更新为用户提供的VAPID公钥
  
  // 服务工作线程文件的路径
  SERVICE_WORKER_PATH: '/service-worker.js'
}; 