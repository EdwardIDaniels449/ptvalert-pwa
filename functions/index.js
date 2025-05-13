const functions = require('firebase-functions');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();

// 从Firebase配置获取VAPID密钥
const vapidPublicKey = functions.config().vapid?.public_key;
const vapidPrivateKey = functions.config().vapid?.private_key;

// 配置VAPID详情
webpush.setVapidDetails(
  'mailto:您的邮箱@example.com',  // 需要您修改为真实联系邮箱
  vapidPublicKey,
  vapidPrivateKey
);

// 监听新标记创建，并发送推送通知
exports.sendMapMarkerNotification = functions.database
  .ref('/markers/{markerId}')
  .onCreate(async (snapshot, context) => {
    const markerData = snapshot.val();
    const markerId = context.params.markerId;
    
    try {
      // 获取所有订阅
      const subscriptionsSnapshot = await admin.database()
        .ref('/push-subscriptions')
        .once('value');
      
      const subscriptions = subscriptionsSnapshot.val() || {};
      const notificationPromises = [];
      
      // 构建通知内容
      const notificationPayload = {
        title: '新地图标记已添加',
        body: `位置: ${markerData.location || '未知位置'}`,
        icon: '/ptvalert-pwa/images/icon-192x192.png',
        badge: '/ptvalert-pwa/images/badge-72x72.png',
        data: {
          url: `/ptvalert-pwa/marker-details.html?id=${markerId}`,
          dateOfArrival: Date.now(),
          primaryKey: 1
        },
        actions: [
          {
            action: 'view',
            title: '查看详情'
          },
          {
            action: 'navigate',
            title: '查看地图'
          }
        ]
      };
      
      // 向所有订阅发送通知
      Object.values(subscriptions).forEach(subscription => {
        notificationPromises.push(
          webpush.sendNotification(
            subscription.subscription,
            JSON.stringify(notificationPayload)
          ).catch(error => {
            console.error('向订阅发送通知失败:', error);
            
            // 如果订阅过期或无效，删除它
            if (error.statusCode === 404 || error.statusCode === 410) {
              console.log('删除无效订阅');
              return admin.database()
                .ref(`/push-subscriptions/${subscription.userId}`)
                .remove();
            }
          })
        );
      });
      
      // 等待所有通知发送完成
      await Promise.all(notificationPromises);
      console.log('所有通知已发送');
      return null;
    } catch (error) {
      console.error('发送通知时出错:', error);
      return null;
    }
  });

// API端点，测试推送通知配置
exports.testPushConfig = functions.https.onRequest((req, res) => {
  if (vapidPrivateKey && vapidPublicKey) {
    res.status(200).json({ 
      message: '推送通知配置正确',
      publicKeyConfigured: true
    });
  } else {
    res.status(500).json({ 
      error: '推送通知配置缺失',
      publicKeyConfigured: !!vapidPublicKey,
      privateKeyConfigured: !!vapidPrivateKey
    });
  }
}); 