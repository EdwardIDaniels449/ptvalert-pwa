// Web Push库
import webpush from 'web-push';

// 环境变量将在Cloudflare Workers中设置
const vapidDetails = {
  subject: 'mailto:qingyangzhou85@gmail.com',
  publicKey: VAPID_PUBLIC_KEY, // 这会通过Cloudflare环境变量注入
  privateKey: VAPID_PRIVATE_KEY // 这会通过Cloudflare环境变量注入
};

// 初始化Web Push
webpush.setVapidDetails(
  vapidDetails.subject,
  vapidDetails.publicKey,
  vapidDetails.privateKey
);

// KV命名空间将用于存储订阅信息
// 在Workers dashboard中创建并绑定到SUBSCRIPTIONS变量

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 路由处理
    if (path === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    } else if (path === '/api/test-config') {
      return handleTestConfig(env);
    } else if (path === '/api/send-notification' && request.method === 'POST') {
      return handleSendNotification(request, env);
    } else {
      return new Response('Not Found', { status: 404 });
    }
  },

  // 处理来自外部触发的事件（如定时任务或webhook）
  async scheduled(event, env, ctx) {
    // 可以实现定期检查新标记并发送通知
    console.log("运行定时任务检查新标记");
    // 这里可以添加检查新标记并发送通知的逻辑
  }
};

// 处理订阅请求
async function handleSubscribe(request, env) {
  try {
    const data = await request.json();
    const { subscription, userId } = data;
    
    if (!subscription) {
      return new Response('缺少订阅数据', { status: 400 });
    }
    
    // 将订阅保存到KV存储
    const subscriptionId = userId || crypto.randomUUID();
    await env.SUBSCRIPTIONS.put(
      subscriptionId,
      JSON.stringify({
        subscription,
        userId,
        createdAt: new Date().toISOString()
      })
    );
    
    return new Response(JSON.stringify({ success: true, id: subscriptionId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 测试配置是否正确
async function handleTestConfig(env) {
  try {
    // 检查VAPID密钥是否已正确配置
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({
        success: true,
        message: '推送通知配置正确',
        publicKeyConfigured: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '推送通知配置缺失',
        publicKeyConfigured: !!env.VAPID_PUBLIC_KEY,
        privateKeyConfigured: !!env.VAPID_PRIVATE_KEY
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 发送通知
async function handleSendNotification(request, env) {
  try {
    const { markerId, markerData } = await request.json();
    
    if (!markerId) {
      return new Response('缺少标记ID', { status: 400 });
    }
    
    // 获取所有订阅
    const subscriptions = await getAllSubscriptions(env);
    const notificationPromises = [];
    
    // 构建通知内容
    const notificationPayload = {
      title: '新地图标记已添加',
      body: `位置: ${markerData?.location || '未知位置'}`,
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
    
    // 发送通知并处理结果
    for (const [id, subscriptionData] of Object.entries(subscriptions)) {
      try {
        await webpush.sendNotification(
          subscriptionData.subscription,
          JSON.stringify(notificationPayload)
        );
      } catch (error) {
        console.error(`向订阅ID ${id} 发送通知失败:`, error);
        
        // 如果订阅过期或无效，删除它
        if (error.statusCode === 404 || error.statusCode === 410) {
          await env.SUBSCRIPTIONS.delete(id);
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true, message: '通知已发送' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 从KV存储获取所有订阅
async function getAllSubscriptions(env) {
  const list = await env.SUBSCRIPTIONS.list();
  const subscriptions = {};
  
  for (const key of list.keys) {
    const value = await env.SUBSCRIPTIONS.get(key.name, { type: 'json' });
    if (value) {
      subscriptions[key.name] = value;
    }
  }
  
  return subscriptions;
} 