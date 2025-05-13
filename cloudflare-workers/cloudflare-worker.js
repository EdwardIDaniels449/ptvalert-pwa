// Cloudflare Worker推送通知服务
// 注意：不使用web-push库，使用原生实现

// 环境变量将在Cloudflare Workers中设置
const vapidDetails = {
  subject: 'mailto:qingyangzhou85@gmail.com',
  // 这两个值会通过Cloudflare环境变量注入
  publicKey: VAPID_PUBLIC_KEY, 
  privateKey: VAPID_PRIVATE_KEY
};

// KV命名空间将用于存储订阅信息

export default {
  async fetch(request, env, ctx) {
    // 添加CORS头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理OPTIONS请求（预检请求）
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // 路由处理
    if (path === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env, corsHeaders);
    } else if (path === '/api/test-config') {
      return handleTestConfig(env, corsHeaders);
    } else if (path === '/api/send-notification' && request.method === 'POST') {
      return handleSendNotification(request, env, corsHeaders);
    } else {
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
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
async function handleSubscribe(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { subscription, userId } = data;
    
    if (!subscription) {
      return new Response('缺少订阅数据', { 
        status: 400,
        headers: corsHeaders
      });
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
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// 测试配置是否正确
async function handleTestConfig(env, corsHeaders) {
  try {
    // 检查VAPID密钥是否已正确配置
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({
        success: true,
        message: '推送通知配置正确',
        publicKeyConfigured: true
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '推送通知配置缺失',
        publicKeyConfigured: !!env.VAPID_PUBLIC_KEY,
        privateKeyConfigured: !!env.VAPID_PRIVATE_KEY
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// 发送通知 - 使用原生WebPush实现，不依赖web-push库
async function handleSendNotification(request, env, corsHeaders) {
  try {
    const { markerId, markerData } = await request.json();
    
    if (!markerId) {
      return new Response('缺少标记ID', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 获取所有订阅
    const subscriptions = await getAllSubscriptions(env);
    const notificationResults = [];
    
    // 构建通知内容
    const notificationPayload = {
      title: '新地图标记已添加',
      body: `位置: ${markerData?.location || '未知位置'}`,
      icon: '/ptvalert-pwa/images/icon-192x192.png',
      badge: '/ptvalert-pwa/images/badge-72x72.png',
      data: {
        url: `/ptvalert-pwa/marker-details.html?id=${markerId}`,
        dateOfArrival: Date.now(),
        primaryKey: 1,
        markerId: markerId,
        markerInfo: markerData
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
        const subscription = subscriptionData.subscription;
        const result = await sendPushNotification(
          subscription,
          JSON.stringify(notificationPayload),
          env
        );
        
        notificationResults.push({ 
          id, 
          success: result.success,
          status: result.status
        });
        
        // 如果返回的状态码表明订阅无效，删除它
        if (result.status === 404 || result.status === 410) {
          await env.SUBSCRIPTIONS.delete(id);
          console.log(`已删除无效订阅: ${id}`);
        }
      } catch (error) {
        console.error(`向订阅ID ${id} 发送通知失败:`, error);
        notificationResults.push({ 
          id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '通知处理完成', 
      results: notificationResults 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
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

// 原生实现的Push通知发送方法
async function sendPushNotification(subscription, payload, env) {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;
  
  try {
    // 构建适当的Authorization头部
    const vapidHeaders = await getVAPIDHeaders(endpoint, env);
    
    // 使用订阅信息加密有效负载
    // 注意: Cloudflare Workers环境支持SubtleCrypto但功能有限
    // 在生产环境中可能需要更复杂的实现或使用Cloudflare专有API
    
    // 简单实现: 直接发送通知
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        ...vapidHeaders
      },
      body: payload  // 真实实现中需要加密
    });
    
    return {
      success: response.ok,
      status: response.status
    };
  } catch (error) {
    console.error('发送推送通知失败:', error);
    throw error;
  }
}

// 创建VAPID头部
async function getVAPIDHeaders(endpoint, env) {
  // 在实际生产环境中，这里应该实现完整的VAPID签名
  // 下面是一个简化版，实际项目需要更完整的实现
  
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // 这部分实现通常需要JWT编码和签名，这里简化处理
  return {
    'Authorization': `vapid t=${Date.now()}, k=${env.VAPID_PUBLIC_KEY}`
  };
} 