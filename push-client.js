// 推送通知客户端代码

// 从配置文件加载配置
let CONFIG = {
  SERVER_URL: 'https://your-worker.your-account.workers.dev', // 默认值，会被config.js中的值覆盖
  VAPID_PUBLIC_KEY: '',
  SERVICE_WORKER_PATH: '/service-worker.js'
};

// 尝试从config.js加载配置（如果存在）
try {
  if (window.PUSH_CONFIG) {
    CONFIG = { ...CONFIG, ...window.PUSH_CONFIG };
    console.log('已从配置文件加载推送通知配置');
  }
} catch (e) {
  console.warn('无法加载推送通知配置文件:', e);
}

// 检查浏览器是否支持推送通知
function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// 注册服务工作线程
async function registerServiceWorker() {
  if (!isPushNotificationSupported()) {
    console.log('推送通知不被此浏览器支持');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register(CONFIG.SERVICE_WORKER_PATH, {
      scope: '/'
    });
    console.log('服务工作线程已注册:', registration);
    return registration;
  } catch (error) {
    console.error('服务工作线程注册失败:', error);
    return null;
  }
}

// 请求通知权限
async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('通知权限未授予');
    }
    return true;
  } catch (error) {
    console.error('请求通知权限失败:', error);
    return false;
  }
}

// Base64 URL解码为Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// 订阅推送通知
async function subscribeToPushNotifications() {
  try {
    // 确保服务工作线程已注册
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('无法注册服务工作线程');
    }
    
    // 请求通知权限
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      throw new Error('通知权限未授予');
    }
    
    // 检查现有订阅
    let subscription = await registration.pushManager.getSubscription();
    
    // 如果没有现有订阅，创建新订阅
    if (!subscription) {
      if (!CONFIG.VAPID_PUBLIC_KEY) {
        throw new Error('未设置VAPID公钥，请检查配置文件');
      }
      
      // 转换VAPID公钥
      const applicationServerKey = urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY);
      
      // 创建推送订阅
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // 推送必须对用户可见
        applicationServerKey // VAPID公钥
      });
      
      console.log('已创建新的推送订阅');
    } else {
      console.log('使用现有的推送订阅');
    }
    
    // 将订阅信息发送到服务器
    const response = await fetch(`${CONFIG.SERVER_URL}/api/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription,
        userId: generateAnonymousId() // 可选，生成匿名ID或使用实际用户ID
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`服务器响应错误: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log('订阅成功:', result);
    
    return {
      success: true,
      subscription,
      result
    };
  } catch (error) {
    console.error('订阅推送通知失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 取消订阅推送通知
async function unsubscribeFromPushNotifications() {
  try {
    // 获取服务工作线程注册
    const registration = await navigator.serviceWorker.ready;
    
    // 获取现有订阅
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('没有找到活跃的推送订阅');
      return {
        success: true,
        message: '没有活跃的订阅'
      };
    }
    
    // 从浏览器取消订阅
    const unsubscribed = await subscription.unsubscribe();
    
    if (unsubscribed) {
      // 通知服务器取消订阅
      const response = await fetch(`${CONFIG.SERVER_URL}/api/subscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
      
      if (!response.ok) {
        console.warn('从服务器删除订阅失败，但已从浏览器中删除');
      }
      
      console.log('成功取消订阅');
      return {
        success: true,
        message: '成功取消订阅'
      };
    } else {
      throw new Error('取消订阅失败');
    }
  } catch (error) {
    console.error('取消订阅推送通知失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 生成匿名用户ID
function generateAnonymousId() {
  // 检查是否已有存储的ID
  let userId = localStorage.getItem('anonymous_user_id');
  
  if (!userId) {
    // 生成一个随机ID
    userId = 'anon_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonymous_user_id', userId);
  }
  
  return userId;
}

// 测试推送通知配置
async function testPushConfiguration() {
  try {
    const response = await fetch(`${CONFIG.SERVER_URL}/api/test-config`);
    const result = await response.json();
    
    console.log('推送配置测试结果:', result);
    return result;
  } catch (error) {
    console.error('测试推送配置失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 导出API
window.PushNotifications = {
  isPushNotificationSupported,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  testPushConfiguration,
  getConfig: () => ({ ...CONFIG }) // 添加获取配置的方法
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 添加示例UI按钮的事件监听器
  const subscribeButton = document.getElementById('push-subscribe');
  const unsubscribeButton = document.getElementById('push-unsubscribe');
  
  if (subscribeButton) {
    subscribeButton.addEventListener('click', async () => {
      const result = await subscribeToPushNotifications();
      alert(result.success ? '订阅成功！' : `订阅失败: ${result.error}`);
    });
  }
  
  if (unsubscribeButton) {
    unsubscribeButton.addEventListener('click', async () => {
      const result = await unsubscribeFromPushNotifications();
      alert(result.success ? '取消订阅成功！' : `取消订阅失败: ${result.error}`);
    });
  }
}); 