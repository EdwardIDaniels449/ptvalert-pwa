/**
 * PtvAlert 推送通知处理模块
 * 用于处理地图标记的自动信息推送功能
 */

// Web Push 公钥 - 用于订阅推送服务
// 在实际应用中，这应该替换为您的VAPID公钥
const applicationServerPublicKey = 'BDPPAJUQVQaAFHFm7qc-Fzj6m9jQLgK90YAl-JDxZ9j5_DJIVg47iDoFw9MVeAvQwbPAXoP_j-B9YOZq4d5g4qI';

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
  const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
  
  swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey
  })
  .then(subscription => {
    console.log('用户已订阅:', subscription);
    isSubscribed = true;
    
    // 将订阅信息发送到服务器
    saveSubscription(subscription);
  })
  .catch(err => {
    console.error('无法订阅推送:', err);
  });
}

/**
 * 将订阅信息保存到服务器
 * @param {PushSubscription} subscription - 推送订阅对象
 */
function saveSubscription(subscription) {
  const subscriptionJson = subscription.toJSON();
  
  // 获取当前用户信息（如果已登录）
  const userId = getCurrentUserId();
  
  // 发送到服务器
  fetch('/api/push-subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      subscription: subscriptionJson,
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString()
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('保存订阅失败');
    }
    console.log('订阅已保存到服务器');
  })
  .catch(error => {
    console.error('保存订阅失败:', error);
  });
}

/**
 * 获取当前用户ID
 * 这里假设已经有firebase auth进行了用户认证
 */
function getCurrentUserId() {
  if (firebase.auth().currentUser) {
    return firebase.auth().currentUser.uid;
  }
  return 'anonymous';
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
  
  fetch('/api/push-subscriptions', {
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

/**
 * 将base64字符串转换为Unit8Array
 * 这是WebPush API需要的格式
 * @param {string} base64String - base64编码的字符串
 * @return {Uint8Array} - 转换后的数组
 */
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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