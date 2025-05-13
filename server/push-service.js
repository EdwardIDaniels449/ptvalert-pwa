/**
 * PtvAlert 推送通知服务
 * 用于处理推送订阅和发送推送通知
 */

const webpush = require('web-push');
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// 初始化 Express 应用
const app = express();
app.use(bodyParser.json());

// 初始化 Firebase Admin SDK
// 在实际应用中，您需要设置自己的Firebase凭据
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

// 数据库引用
const db = admin.database();
const subscriptionsRef = db.ref('push-subscriptions');
const markersRef = db.ref('markers');

// 设置VAPID详细信息 - 用于Web Push
// 在实际应用中，这些应该是您生成的密钥
const vapidKeys = {
  publicKey: 'YOUR_PUBLIC_VAPID_KEY',
  privateKey: 'YOUR_PRIVATE_VAPID_KEY'
};

// 设置Web Push
webpush.setVapidDetails(
  'mailto:your-email@example.com', // 更改为您的电子邮件
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * 保存推送订阅
 */
app.post('/api/push-subscriptions', async (req, res) => {
  try {
    const { userId, subscription, userAgent, createdAt } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: '无效的订阅数据' });
    }
    
    // 使用endpoint作为唯一标识符
    const subscriptionId = createHashFromString(subscription.endpoint);
    
    // 保存到Firebase
    await subscriptionsRef.child(subscriptionId).set({
      userId,
      subscription,
      userAgent,
      createdAt,
      updatedAt: new Date().toISOString()
    });
    
    res.status(201).json({ success: true, id: subscriptionId });
  } catch (error) {
    console.error('保存订阅失败:', error);
    res.status(500).json({ error: '保存订阅失败' });
  }
});

/**
 * 删除推送订阅
 */
app.delete('/api/push-subscriptions', async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: '无效的订阅端点' });
    }
    
    const subscriptionId = createHashFromString(endpoint);
    
    // 从Firebase删除
    await subscriptionsRef.child(subscriptionId).remove();
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除订阅失败:', error);
    res.status(500).json({ error: '删除订阅失败' });
  }
});

/**
 * 监听新的地图标记
 * 当新标记添加到Firebase时，发送推送通知
 */
markersRef.on('child_added', async (snapshot) => {
  try {
    const marker = snapshot.val();
    const markerId = snapshot.key;
    
    // 检查是否应该发送通知
    // 例如，可能只想为特定类型的标记发送通知
    if (shouldSendNotification(marker)) {
      await sendMarkerNotification(marker, markerId);
    }
  } catch (error) {
    console.error('处理新标记失败:', error);
  }
});

/**
 * 监听标记更新
 * 当标记更新时，发送更新通知
 */
markersRef.on('child_changed', async (snapshot) => {
  try {
    const marker = snapshot.val();
    const markerId = snapshot.key;
    
    // 检查是否为重要更新
    if (isSignificantUpdate(marker)) {
      await sendMarkerUpdateNotification(marker, markerId);
    }
  } catch (error) {
    console.error('处理标记更新失败:', error);
  }
});

/**
 * 判断是否应该为此标记发送通知
 * @param {Object} marker - 标记数据
 * @return {boolean} - 是否应该发送通知
 */
function shouldSendNotification(marker) {
  // 根据应用逻辑实现
  // 例如，可能只为紧急标记发送通知
  return marker.priority === 'high' || marker.type === 'alert';
}

/**
 * 判断更新是否重要到需要通知
 * @param {Object} marker - 标记数据
 * @return {boolean} - 是否为重要更新
 */
function isSignificantUpdate(marker) {
  // 判断更新是否足够重要
  return marker.updated && (marker.priority === 'high' || marker.statusChanged);
}

/**
 * 为新地图标记发送推送通知
 * @param {Object} marker - 标记数据
 * @param {string} markerId - 标记ID
 */
async function sendMarkerNotification(marker, markerId) {
  try {
    // 获取所有活跃订阅
    const snapshot = await subscriptionsRef.once('value');
    const subscriptions = snapshot.val() || {};
    
    // 构建通知数据
    const notificationPayload = {
      type: 'map-marker',
      title: `新地图标记: ${marker.title || '未命名位置'}`,
      markerData: {
        id: markerId,
        title: marker.title,
        description: marker.description,
        lat: marker.location.lat,
        lng: marker.location.lng,
        type: marker.type,
        priority: marker.priority,
        timestamp: marker.timestamp
      }
    };
    
    // 对每个订阅发送通知
    const sendPromises = Object.values(subscriptions).map(subscription => {
      return sendPushNotification(subscription.subscription, notificationPayload);
    });
    
    await Promise.allSettled(sendPromises);
    console.log(`为新标记 ${markerId} 发送了 ${sendPromises.length} 个通知`);
  } catch (error) {
    console.error('发送标记通知失败:', error);
  }
}

/**
 * 为标记更新发送推送通知
 * @param {Object} marker - 标记数据
 * @param {string} markerId - 标记ID
 */
async function sendMarkerUpdateNotification(marker, markerId) {
  try {
    // 获取所有活跃订阅
    const snapshot = await subscriptionsRef.once('value');
    const subscriptions = snapshot.val() || {};
    
    // 构建通知数据
    const notificationPayload = {
      type: 'map-marker',
      title: `地图标记更新: ${marker.title || '未命名位置'}`,
      markerData: {
        id: markerId,
        title: marker.title,
        description: marker.description,
        lat: marker.location.lat,
        lng: marker.location.lng,
        type: marker.type,
        priority: marker.priority,
        timestamp: marker.timestamp,
        updated: true
      }
    };
    
    // 对每个订阅发送通知
    const sendPromises = Object.values(subscriptions).map(subscription => {
      return sendPushNotification(subscription.subscription, notificationPayload);
    });
    
    await Promise.allSettled(sendPromises);
    console.log(`为标记更新 ${markerId} 发送了 ${sendPromises.length} 个通知`);
  } catch (error) {
    console.error('发送标记更新通知失败:', error);
  }
}

/**
 * 发送推送通知
 * @param {Object} subscription - 推送订阅对象
 * @param {Object} payload - 通知数据
 */
async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('发送推送通知失败:', error);
    
    // 如果订阅失效，应该删除它
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('订阅已失效，将删除');
      
      try {
        const subscriptionId = createHashFromString(subscription.endpoint);
        await subscriptionsRef.child(subscriptionId).remove();
      } catch (deleteError) {
        console.error('删除失效的订阅失败:', deleteError);
      }
    }
    
    return false;
  }
}

/**
 * 从字符串创建哈希
 * 用于从endpoint生成唯一标识符
 * @param {string} str - 输入字符串
 * @return {string} - 哈希值
 */
function createHashFromString(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(16);
}

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`推送通知服务运行在端口 ${PORT}`);
});

// 导出Express应用（用于单元测试或其他集成）
module.exports = app; 