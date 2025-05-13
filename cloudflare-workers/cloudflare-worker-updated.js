// Cloudflare Worker推送通知与数据存储服务
// 完全替代Firebase，使用Cloudflare KV存储

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
    // 推送通知相关路由
    if (path === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env, corsHeaders);
    } else if (path === '/api/subscribe' && request.method === 'DELETE') {
      return handleUnsubscribe(request, env, corsHeaders);
    } else if (path === '/api/test-config') {
      return handleTestConfig(env, corsHeaders);
    } else if (path === '/api/send-notification' && request.method === 'POST') {
      return handleSendNotification(request, env, corsHeaders);
    } 
    // 标记数据管理路由
    else if (path === '/api/markers' && request.method === 'GET') {
      return handleGetMarkers(request, env, corsHeaders);
    } else if (path === '/api/markers' && request.method === 'POST') {
      return handleAddMarker(request, env, corsHeaders);
    } else if (path.startsWith('/api/markers/') && request.method === 'GET') {
      const markerId = path.split('/').pop();
      return handleGetMarker(markerId, env, corsHeaders);
    } else if (path.startsWith('/api/markers/') && request.method === 'PUT') {
      const markerId = path.split('/').pop();
      return handleUpdateMarker(markerId, request, env, corsHeaders);
    } else if (path.startsWith('/api/markers/') && request.method === 'DELETE') {
      const markerId = path.split('/').pop();
      return handleDeleteMarker(markerId, env, corsHeaders);
    }
    // 用户管理路由
    else if (path === '/api/users/admin' && request.method === 'POST') {
      return handleSetAdmin(request, env, corsHeaders);
    } 
    else {
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
    }
  },

  // 处理定时任务
  async scheduled(event, env, ctx) {
    console.log("运行定时任务检查新标记");
    
    // 获取所有标记
    const markers = await getAllMarkers(env);
    
    // 检查是否有新添加的标记（过去24小时内）
    const recentMarkers = [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    for (const [id, marker] of Object.entries(markers)) {
      const markerTime = new Date(marker.timestamp).getTime();
      if (markerTime > oneDayAgo) {
        recentMarkers.push({
          id,
          ...marker
        });
      }
    }
    
    // 如有新标记，给所有订阅者发送通知
    if (recentMarkers.length > 0) {
      const subscriptions = await getAllSubscriptions(env);
      
      for (const marker of recentMarkers) {
        const notificationPayload = {
          title: `新地图标记: ${marker.title || '未命名位置'}`,
          body: marker.description || '新的地图标记已添加',
          icon: '/ptvalert-pwa/images/icon-192x192.png',
          badge: '/ptvalert-pwa/images/badge-72x72.png',
          data: {
            url: `/ptvalert-pwa/marker-details.html?id=${marker.id}`,
            dateOfArrival: Date.now(),
            primaryKey: 1,
            markerId: marker.id,
            markerInfo: marker
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
        
        for (const [id, subscriptionData] of Object.entries(subscriptions)) {
          try {
            const subscription = subscriptionData.subscription;
            await sendPushNotification(
              subscription,
              JSON.stringify(notificationPayload),
              env
            );
          } catch (error) {
            console.error(`向订阅ID ${id} 发送通知失败:`, error);
          }
        }
      }
    }
  }
};

// ==================== 推送通知订阅相关函数 ====================

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
    
    // 使用endpoint的哈希值作为唯一标识符
    const subscriptionId = await createHash(subscription.endpoint);
    
    // 将订阅保存到KV存储
    await env.SUBSCRIPTIONS.put(
      subscriptionId,
      JSON.stringify({
        subscription,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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

// 处理取消订阅请求
async function handleUnsubscribe(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { endpoint } = data;
    
    if (!endpoint) {
      return new Response('缺少端点', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 使用endpoint的哈希值作为唯一标识符
    const subscriptionId = await createHash(endpoint);
    
    // 从KV存储中删除订阅
    await env.SUBSCRIPTIONS.delete(subscriptionId);
    
    return new Response(JSON.stringify({ success: true }), {
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

// 发送通知
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

// ==================== 标记数据管理相关函数 ====================

// 获取所有标记
async function handleGetMarkers(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const updatedSince = url.searchParams.get('updated_since');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    // 获取所有标记
    const markers = await getAllMarkers(env);
    
    // 如果指定了updated_since参数，则只返回指定时间后更新的标记
    let filteredMarkers = markers;
    if (updatedSince) {
      const sinceTime = new Date(updatedSince).getTime();
      filteredMarkers = {};
      
      for (const [id, marker] of Object.entries(markers)) {
        const markerTime = new Date(marker.timestamp).getTime();
        if (markerTime > sinceTime) {
          filteredMarkers[id] = marker;
        }
      }
    }
    
    // 将标记转换为数组格式并加入ID
    const markersList = Object.entries(filteredMarkers)
      .map(([id, marker]) => ({
        id,
        ...marker
      }))
      .sort((a, b) => {
        // 按时间戳倒序排列
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, limit); // 限制返回数量
    
    return new Response(JSON.stringify({ 
      success: true, 
      markers: markersList,
      total: markersList.length
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

// 获取单个标记
async function handleGetMarker(markerId, env, corsHeaders) {
  try {
    if (!markerId) {
      return new Response('缺少标记ID', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 从KV存储中获取标记
    const marker = await env.MARKERS.get(markerId, { type: 'json' });
    
    if (!marker) {
      return new Response(JSON.stringify({ error: '标记不存在' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      marker: {
        id: markerId,
        ...marker
      }
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

// 添加新标记
async function handleAddMarker(request, env, corsHeaders) {
  try {
    // 验证用户权限（可选）
    // 可以在这里添加用户认证逻辑
    
    const markerData = await request.json();
    
    if (!markerData || !markerData.location) {
      return new Response('无效的标记数据', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 添加时间戳和其他元数据
    const marker = {
      ...markerData,
      timestamp: markerData.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 生成唯一ID
    const markerId = crypto.randomUUID();
    
    // 保存到KV存储
    await env.MARKERS.put(markerId, JSON.stringify(marker));
    
    // 发送通知给所有订阅者
    const subscriptions = await getAllSubscriptions(env);
    
    // 构建通知内容
    const notificationPayload = {
      title: `新地图标记: ${marker.title || '未命名位置'}`,
      body: marker.description || '新的地图标记已添加',
      icon: '/ptvalert-pwa/images/icon-192x192.png',
      badge: '/ptvalert-pwa/images/badge-72x72.png',
      data: {
        url: `/ptvalert-pwa/marker-details.html?id=${markerId}`,
        dateOfArrival: Date.now(),
        primaryKey: 1,
        markerId: markerId,
        markerInfo: {
          id: markerId,
          ...marker
        }
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
    
    // 异步发送通知，不等待结果
    ctx.waitUntil(sendNotificationsToAll(subscriptions, notificationPayload, env));
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: markerId,
      marker: {
        id: markerId,
        ...marker
      }
    }), {
      status: 201,
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

// 更新标记
async function handleUpdateMarker(markerId, request, env, corsHeaders) {
  try {
    if (!markerId) {
      return new Response('缺少标记ID', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 检查标记是否存在
    const existingMarker = await env.MARKERS.get(markerId, { type: 'json' });
    
    if (!existingMarker) {
      return new Response(JSON.stringify({ error: '标记不存在' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 获取更新数据
    const updateData = await request.json();
    
    // 合并数据并更新
    const updatedMarker = {
      ...existingMarker,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // 保存到KV存储
    await env.MARKERS.put(markerId, JSON.stringify(updatedMarker));
    
    // 如果是重要更新，发送通知
    if (updateData.priority === 'high' || updateData.statusChanged === true) {
      const subscriptions = await getAllSubscriptions(env);
      
      // 构建通知内容
      const notificationPayload = {
        title: `地图标记更新: ${updatedMarker.title || '未命名位置'}`,
        body: updatedMarker.description || '地图标记已更新',
        icon: '/ptvalert-pwa/images/icon-192x192.png',
        badge: '/ptvalert-pwa/images/badge-72x72.png',
        data: {
          url: `/ptvalert-pwa/marker-details.html?id=${markerId}`,
          dateOfArrival: Date.now(),
          primaryKey: 1,
          markerId: markerId,
          markerInfo: {
            id: markerId,
            ...updatedMarker,
            updated: true
          }
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
      
      // 异步发送通知，不等待结果
      ctx.waitUntil(sendNotificationsToAll(subscriptions, notificationPayload, env));
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      marker: {
        id: markerId,
        ...updatedMarker
      }
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

// 删除标记
async function handleDeleteMarker(markerId, env, corsHeaders) {
  try {
    if (!markerId) {
      return new Response('缺少标记ID', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 检查标记是否存在
    const existingMarker = await env.MARKERS.get(markerId, { type: 'json' });
    
    if (!existingMarker) {
      return new Response(JSON.stringify({ error: '标记不存在' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 从KV存储中删除标记
    await env.MARKERS.delete(markerId);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: '标记已删除'
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

// ==================== 用户管理相关函数 ====================

// 设置用户为管理员
async function handleSetAdmin(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { userId } = data;
    
    if (!userId) {
      return new Response('缺少用户ID', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 保存到管理员KV存储
    await env.ADMIN_USERS.put(userId, JSON.stringify({
      isAdmin: true,
      updatedAt: new Date().toISOString()
    }));
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `用户 ${userId} 已设置为管理员`
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

// ==================== 辅助函数 ====================

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

// 从KV存储获取所有标记
async function getAllMarkers(env) {
  const list = await env.MARKERS.list();
  const markers = {};
  
  for (const key of list.keys) {
    const value = await env.MARKERS.get(key.name, { type: 'json' });
    if (value) {
      markers[key.name] = value;
    }
  }
  
  return markers;
}

// 向所有订阅发送通知
async function sendNotificationsToAll(subscriptions, notificationPayload, env) {
  const sendPromises = [];
  
  for (const [id, subscriptionData] of Object.entries(subscriptions)) {
    try {
      const subscription = subscriptionData.subscription;
      sendPromises.push(
        sendPushNotification(
          subscription,
          JSON.stringify(notificationPayload),
          env
        ).catch(error => {
          console.error(`向订阅ID ${id} 发送通知失败:`, error);
          
          // 如果返回的状态码表明订阅无效，删除它
          if (error.status === 404 || error.status === 410) {
            return env.SUBSCRIPTIONS.delete(id);
          }
        })
      );
    } catch (error) {
      console.error(`处理订阅ID ${id} 失败:`, error);
    }
  }
  
  await Promise.allSettled(sendPromises);
  return { sent: sendPromises.length };
}

// Base64编码URL安全
function urlBase64ToUint8Array(base64String) {
  try {
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
  } catch (error) {
    console.error('Base64 解码错误:', error, '原始字符串:', base64String);
    throw new Error('VAPID 密钥格式无效，请检查您的公钥');
  }
}

// 发送推送通知
async function sendPushNotification(subscription, payload, env) {
  try {
    // 生成VAPID签名
    const vapidHeaders = await generateVAPIDHeaders(subscription.endpoint, env);
    
    // 计算共享密钥和混合密钥（用于消息加密）
    const userKey = subscription.keys.p256dh;
    const userAuth = subscription.keys.auth;
    
    // 发送推送通知
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
        ...vapidHeaders
      },
      body: payload
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

// 生成JWT令牌
async function generateJWT(privateKey, claims) {
  // 头部
  const header = {
    alg: 'ES256',
    typ: 'JWT'
  };
  
  // 编码头部和载荷
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaims = btoa(JSON.stringify(claims));
  
  // 组合头部和载荷
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  
  // 签名
  const keyData = urlBase64ToUint8Array(privateKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );
  
  // 将签名转换为Base64URL
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return `${signingInput}.${encodedSignature}`;
}

// 生成VAPID头部
async function generateVAPIDHeaders(endpoint, env) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    throw new Error('缺少VAPID密钥');
  }
  
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const claims = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12小时过期
    sub: 'mailto:admin@ptvalert.com'
  };
  
  const jwt = await generateJWT(privateKey, claims);
  
  return {
    'Authorization': `WebPush ${jwt}`,
    'Crypto-Key': `p256ecdsa=${publicKey}`
  };
}

// 创建哈希值
async function createHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
} 