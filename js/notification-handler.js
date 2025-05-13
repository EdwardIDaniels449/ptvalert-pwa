/**
 * PtvAlert 推送通知处理模块
 * 用于处理地图标记的自动信息推送功能
 */

// Web Push 公钥 - 用于订阅推送服务
// 已经处理为二进制格式，不需要解码
const applicationServerKey = new Uint8Array([
  4, 183, 80, 182, 40, 255, 100, 198, 99, 20, 68, 39, 245, 110, 149, 49, 196, 15, 26, 106, 
  233, 185, 12, 175, 152, 158, 236, 200, 70, 50, 155, 130, 112, 32, 88, 213, 131, 59, 144, 
  37, 221, 107, 68, 26, 16, 116, 254, 107, 184, 1, 4, 195, 244, 108, 24, 136, 24, 219, 18, 
  216, 193, 137, 197, 239, 175
]);

let isSubscribed = false;
let swRegistration = null;

/**
 * 初始化推送通知功能
 */
function initNotifications() {
  // 检查浏览器是否支持推送通知
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('推送通知不受支持');
    return;
  }

  // 获取Service Worker注册
  navigator.serviceWorker.ready.then(registration => {
    swRegistration = registration;
    
    // 检查当前订阅状态
    swRegistration.pushManager.getSubscription()
      .then(subscription => {
        isSubscribed = subscription !== null;
        
        if (isSubscribed) {
          console.log('用户已订阅推送通知');
        } else {
          // 尝试获取通知权限并订阅
          requestNotificationPermission();
        }
      });
  });
}

/**
 * 请求通知权限
 */
function requestNotificationPermission() {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('通知权限已授予');
      // 订阅推送服务
      subscribeUserToPush();
    } else {
      console.log('通知权限被拒绝');
      showNotificationPrompt();
    }
  });
}

/**
 * 显示通知提示
 * 当用户拒绝通知权限时，提供方式让用户了解启用通知的好处
 */
function showNotificationPrompt() {
  const notificationPrompt = document.createElement('div');
  notificationPrompt.className = 'notification-prompt';
  notificationPrompt.innerHTML = `
    <div class="notification-prompt-content">
      <h3>开启通知以接收实时地图信息</h3>
      <p>开启通知后，您可以实时接收地图标记的更新。</p>
      <div class="notification-prompt-buttons">
        <button id="enable-notification-btn" class="primary-button">开启通知</button>
        <button id="dismiss-notification-btn" class="secondary-button">稍后再说</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notificationPrompt);
  
  // 添加事件监听器
  document.getElementById('enable-notification-btn').addEventListener('click', () => {
    notificationPrompt.remove();
    requestNotificationPermission();
  });
  
  document.getElementById('dismiss-notification-btn').addEventListener('click', () => {
    notificationPrompt.remove();
  });
}

/**
 * 将用户订阅到推送服务
 */
function subscribeUserToPush() {
  try {
    console.log('开始订阅推送...');
    
    // 直接使用预定义的applicationServerKey
    // 这是已经转换为Uint8Array的VAPID公钥
    // 绕过了base64解码的步骤，避免出现atob解码错误
    console.log('使用预定义的应用服务器密钥:', applicationServerKey.length, '字节');
    
    // 清除任何现有的订阅
    swRegistration.pushManager.getSubscription()
      .then(subscription => {
        if (subscription) {
          console.log('发现现有订阅，先取消...');
          return subscription.unsubscribe();
        }
        return Promise.resolve();
      })
      .then(() => {
        console.log('创建新订阅...');
        return swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      })
      .then(subscription => {
        console.log('用户已成功订阅:', subscription);
        isSubscribed = true;
        
        // 将订阅信息发送到服务器
        return saveSubscription(subscription);
      })
      .then(() => {
        console.log('推送通知设置完成!');
      })
      .catch(err => {
        console.error('订阅推送过程中出错:', err);
        
        if (err.name === 'NotAllowedError') {
          console.log('用户拒绝了通知权限');
          showNotificationPrompt();
        } else {
          console.error('未知错误:', err);
        }
      });
  } catch (error) {
    console.error('订阅过程中发生严重错误:', error);
  }
}

/**
 * 将订阅信息保存到服务器
 * @param {PushSubscription} subscription - 推送订阅对象
 * @returns {Promise} - 返回Promise以便链式调用
 */
function saveSubscription(subscription) {
  console.log('保存订阅到服务器...');
  const subscriptionJson = subscription.toJSON();
  
  // 获取当前用户信息（如果已登录）
  const userId = getCurrentUserId();
  console.log('用户ID:', userId);
  
  // 构建请求数据
  const subscriptionData = {
    userId: userId,
    subscription: subscriptionJson,
    userAgent: navigator.userAgent,
    createdAt: new Date().toISOString()
  };
  
  console.log('发送订阅数据:', JSON.stringify(subscriptionData, null, 2));
  
  // 发送到Cloudflare Worker
  return fetch('https://push-notification-service.qingyangzhou85.workers.dev/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscriptionData)
  })
  .then(response => {
    if (!response.ok) {
      console.error('服务器响应错误:', response.status, response.statusText);
      return response.text().then(text => {
        throw new Error(`保存订阅失败: ${response.status} ${text}`);
      });
    }
    console.log('订阅已成功保存到服务器');
    return response.json();
  })
  .then(data => {
    console.log('服务器响应:', data);
    return data;
  })
  .catch(error => {
    console.error('保存订阅失败:', error);
    // 继续抛出错误，让上层函数处理
    throw error;
  });
}

/**
 * 获取当前用户ID
 * 不再依赖Firebase，改用localStorage或生成唯一ID
 */
function getCurrentUserId() {
  // 从localStorage获取用户ID，如果不存在则创建一个
  let userId = localStorage.getItem('ptvAlertUserId');
  
  if (!userId) {
    // 生成一个随机ID
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('ptvAlertUserId', userId);
  }
  
  return userId;
}

/**
 * 取消推送通知订阅
 */
function unsubscribeFromPush() {
  swRegistration.pushManager.getSubscription()
    .then(subscription => {
      if (subscription) {
        // 从服务器删除订阅
        deleteSubscriptionFromServer(subscription);
        
        // 取消客户端订阅
        return subscription.unsubscribe();
      }
    })
    .then(() => {
      console.log('用户已取消订阅');
      isSubscribed = false;
    })
    .catch(err => {
      console.error('无法取消订阅:', err);
    });
}

/**
 * 从服务器删除订阅
 * @param {PushSubscription} subscription - 推送订阅对象
 */
function deleteSubscriptionFromServer(subscription) {
  const subscriptionJson = subscription.toJSON();
  
  fetch('https://push-notification-service.qingyangzhou85.workers.dev/api/subscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: subscriptionJson.endpoint
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('删除订阅失败');
    }
    console.log('订阅已从服务器删除');
  })
  .catch(error => {
    console.error('删除订阅失败:', error);
  });
}

// 注册周期性后台同步
function registerPeriodicSync() {
  if ('serviceWorker' in navigator && 'periodicSync' in registration) {
    // 每隔一小时同步一次
    navigator.serviceWorker.ready.then(registration => {
      registration.periodicSync.register('update-markers', {
        minInterval: 60 * 60 * 1000 // 每小时
      })
      .then(() => {
        console.log('周期性同步已注册');
      })
      .catch(error => {
        console.error('周期性同步注册失败:', error);
      });
    });
  }
}

// 手动触发更新地图标记
function manualUpdateMarkers() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('update-markers')
        .then(() => {
          console.log('已触发更新地图标记');
        })
        .catch(error => {
          console.error('触发更新失败:', error);
        });
    });
  }
}

// 在页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
  initNotifications();
}); 