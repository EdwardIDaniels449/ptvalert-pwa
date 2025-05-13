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

    // 处理favicon.ico请求
    if (path === '/favicon.ico') {
      // 提供一个真正的favicon图标 (基本的云形状图标)
      // 这是一个16x16像素的ico文件的Base64编码
      const faviconBase64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAMMOAADDDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACEfHwwhHx9nIR8fZyEfH2chHx9nIR8fZyEfH2chHx9nIR8fZyEfH2chHx9nIR8fZyEfH2chHx8MAAAAACEfH2chHx//IR8f/yEfH/8hHx//IR8f/yEfH/8hHx//IR8f/yEfH/8hHx//IR8f/yEfH/8hHx9nAAAAACEfH2chHx//IR8f/yEfH/8hHx//IR8f/yEfH/8hHx//IR8f/yEfH/8hHx//IR8f/yEfH/8hHx9nAAAAACEfH2chHx//IR8f/yEeHv8eFhb/IBIS/3JoaP+MhIT/Khsb/x8XF/8hHh7/IR8f/yEfH/8hHx9nAAAAACEfH2chHx//IBoZ/yASEv9LPj7/rqen/9HOzv/b2dn/qaGh/1lPT/8gEhL/IBoZ/yEfH/8hHx9nAAAAACEfH2cgGBj/IBIS/3JoaP/JxcX/3dzc/8rGxv/JxcX/3Nvb/9LPz/95cHD/IBIS/yAYGP8hHx9nAAAAACEfH2ceEhL/STw8/8jDw//W1NT/mJCQ/zQnJ/81KCj/nJSU/9jW1v/LyMj/UD4+/x4SEv8hHx9nAAAAACEfH2ceEhL/lIuL/9vZ2f+tpqb/JBgY/yEfH/8hHx//JhoY/7Kqqv/c29v/mpCQ/x4SEv8hHx9nAAAAACEfH2cgFhb/v7m5/87Kyv9kWFj/IBoZ/yEfH/8hHx//IBoZ/2ldXf/Qzc3/w7y8/yAWFv8hHx9nAAAAACEfH2chFRX/xcDA/7u2tv9GNzf/IBoa/yEfH/8hHx//IBoa/0c5Of+9uLj/xsHB/yEVFf8hHx9nAAAAACEfH2chHR3/l5CQ/9LOzv9+d3f/Hi4u/yEfH/8hHx//IBkZ/4N9ff/Uz8//nZaW/yEdHf8hHx9nAAAAACEfH2chHx//IRER/3tycv/GwcH/cmlp/xcVFf8WFxf/b2Vl/8jDw/+AdXX/IRER/yEfH/8hHx9nAAAAACEfH2chHx//IR8f/xwPD/82KSn/WVFR/15XVv9dVVX/W1NR/zosK/8cDw//IR8f/yEfH/8hHx9nAAAAACEfHwwhHx9nIR8fZyEfH2chHx9nIR8fZyEfH2chHx9nIR8fZyEfH2chHx9nIR8fZyEfH2chHx8MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      
      return new Response(atob(faviconBase64), {
        status: 200,
        headers: {
          'Content-Type': 'image/x-icon',
          ...corsHeaders
        }
      });
    }

    // 路由处理
    // 推送通知相关路由
    if (path === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env, corsHeaders);
    } else if (path === '/api/subscribe' && request.method === 'DELETE') {
      return handleUnsubscribe(request, env, corsHeaders);
    } else if (path === '/api/test-config') {
      return handleTestConfig(env, corsHeaders);
    } else if (path === '/api/test-vapid-headers' && request.method === 'GET') {
      try {
        const testEndpoint = "https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB..."; 
        const headers = await generateVAPIDHeaders(testEndpoint, env);
        return new Response(JSON.stringify({ success: true, headers }), { headers: {'Content-Type': 'application/json', ...corsHeaders }});
      } catch (e) {
        console.error("VAPID Header Test Error:", e);
        return new Response(JSON.stringify({ success: false, error: e.message, stack: e.stack }), { status: 500, headers: {'Content-Type': 'application/json', ...corsHeaders }});
      }
    } else if (path === '/api/send-notification' && request.method === 'POST') {
      return handleSendNotification(request, env, corsHeaders);
    } else if (path === '/api/sync-from-firebase' && request.method === 'POST') {
      return handleSyncFromFirebase(request, env, ctx, corsHeaders);
    }
    // 标记数据管理路由
    else if (path === '/api/markers' && request.method === 'GET') {
      return handleGetMarkers(request, env, corsHeaders);
    } else if (path === '/api/markers' && request.method === 'POST') {
      return handleAddMarker(request, env, ctx, corsHeaders);
    } else if (path.startsWith('/api/markers/') && request.method === 'GET') {
      const markerId = path.split('/').pop();
      return handleGetMarker(markerId, env, corsHeaders);
    } else if (path.startsWith('/api/markers/') && request.method === 'PUT') {
      const markerId = path.split('/').pop();
      return handleUpdateMarker(markerId, request, env, ctx, corsHeaders);
    } else if (path.startsWith('/api/markers/') && request.method === 'DELETE') {
      const markerId = path.split('/').pop();
      return handleDeleteMarker(markerId, env, corsHeaders);
    }
    // 用户管理路由
    else if (path === '/api/users/admin' && request.method === 'POST') {
      return handleSetAdmin(request, env, corsHeaders);
    } 
    // 根路径或其他路径的处理
    else if (path === '/' || path === '') {
      return new Response('API服务正常运行', { 
        status: 200,
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          ...corsHeaders
        }
      });
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
    let data;
    try {
      data = await request.json();
    } catch (e) {
      console.error('在 handleSubscribe 中解析请求JSON失败:', e.message);
      return new Response(JSON.stringify({ error: '请求体不是有效的JSON格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { subscription, userId } = data;

    if (!subscription ||
        typeof subscription.endpoint !== 'string' || !subscription.endpoint.trim() ||
        !subscription.keys ||
        typeof subscription.keys.p256dh !== 'string' || !subscription.keys.p256dh.trim() ||
        typeof subscription.keys.auth !== 'string' || !subscription.keys.auth.trim()) {
      console.error('handleSubscribe 中无效或缺失的订阅数据:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: '缺少或无效的订阅数据对象 (需要有效的 endpoint, keys.p256dh, keys.auth)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!env.SUBSCRIPTIONS) {
        console.error('KV命名空间 SUBSCRIPTIONS 未绑定');
        return new Response(JSON.stringify({ error: '服务器配置错误：KV存储不可用 (SUBSCRIPTIONS)' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    const subscriptionId = await createHash(subscription.endpoint);
    
    await env.SUBSCRIPTIONS.put(
      subscriptionId,
      JSON.stringify({
        subscription,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
    
    console.log(`订阅成功，endpoint: ${subscription.endpoint.substring(0, 50)}... ID: ${subscriptionId}`);
    return new Response(JSON.stringify({ success: true, id: subscriptionId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('handleSubscribe 发生错误:', error.message, error.stack);
    return new Response(JSON.stringify({ error: '订阅处理过程中发生服务器内部错误', details: error.message }), {
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
        
        if (!result.success) {
            console.error(`向订阅ID ${id} 发送通知失败: Status ${result.status}, ${result.statusText}, Body: ${result.responseBody}, Error: ${result.error}`);
        }

        notificationResults.push({ 
          id, 
          success: result.success,
          status: result.status,
          error: result.error || null
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
async function handleAddMarker(request, env, ctx, corsHeaders) {
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
async function handleUpdateMarker(markerId, request, env, ctx, corsHeaders) {
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
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// 新增: ArrayBuffer to Base64URL
function arrayBufferToBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// 发送推送通知
async function sendPushNotification(subscription, payloadString, env) {
  try {
    // 1. 验证订阅对象
    if (!subscription || typeof subscription.endpoint !== 'string' || !subscription.endpoint.trim() ||
        !subscription.keys || typeof subscription.keys.p256dh !== 'string' || !subscription.keys.p256dh.trim() ||
        typeof subscription.keys.auth !== 'string' || !subscription.keys.auth.trim()) {
      console.error('传递给 sendPushNotification 的订阅对象无效:', JSON.stringify(subscription));
      return { 
        success: false,
        status: 0,
        statusText: 'Invalid subscription object provided to sendPushNotification',
        error: 'Invalid subscription object (requires endpoint, keys.p256dh, keys.auth)'
      };
    }

    // 2. 生成VAPID头部
    let vapidHeaders;
    try {
        vapidHeaders = await generateVAPIDHeaders(subscription.endpoint, env);
    } catch (vapidError) {
        console.error("VAPID头部生成失败:", vapidError.message, vapidError.stack);
        return {
            success: false,
            status: 0,
            statusText: 'VAPID header generation failed',
            error: vapidError.message
        };
    }
    
    // 3. 实现ECE加密 (根据RFC 8291)
    let encryptedPayloadInfo;
    try {
      // 从Base64 URL编码转换为ArrayBuffer
      const p256dhKey = urlBase64ToUint8Array(subscription.keys.p256dh);
      const authSecret = urlBase64ToUint8Array(subscription.keys.auth);
      
      // 实现ECE加密
      encryptedPayloadInfo = await encryptMessage(
        new TextEncoder().encode(payloadString),
        p256dhKey,
        authSecret
      );
    } catch (encryptionError) {
      console.error("ECE加密失败:", encryptionError.message, encryptionError.stack);
      return {
        success: false, 
        status: 0, 
        statusText: 'Encryption failed', 
        error: encryptionError.message
      };
    }

    // 4. 发送推送请求
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400', // 消息存活时间 (秒)
        ...vapidHeaders
      },
      body: encryptedPayloadInfo.ciphertext // 使用加密后的负载
    });
    
    let responseBody = null;
    if (!response.ok) {
        try {
            responseBody = await response.text();
        } catch (e) {
            responseBody = "无法读取错误响应体";
        }
        console.error(
            `发送推送失败到 ${subscription.endpoint.substring(0,50)}...`,
            `状态: ${response.status}`,
            `状态文本: ${response.statusText}`,
            `响应体: ${responseBody}`,
            `VAPID头部: ${JSON.stringify(vapidHeaders)}`
        );
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseBody: responseBody
    };

  } catch (error) {
    console.error('sendPushNotification 内部捕获的意外错误:', error.message, error.stack);
    return {
        success: false,
        status: 0,
        statusText: 'Internal Worker Error in sendPushNotification',
        error: error.message
    };
  }
}

// ECE加密函数 (RFC 8291实现)
async function encryptMessage(plaintext, p256dhKey, authSecret) {
  // 1. 生成本地密钥对
  const localKeyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );
  
  // 2. 导入客户端公钥
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dhKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
  
  // 3. 执行ECDH密钥协商
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: clientPublicKey
    },
    localKeyPair.privateKey,
    256
  );
  
  // 4. 生成随机salt (16字节)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // 5. 使用PRK作为根密钥从sharedSecret和authSecret派生密钥
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await hkdfGenerate(
    authSecret,
    new Uint8Array(sharedSecret),
    authInfo,
    32
  );
  
  // 6. 从PRK派生内容加密密钥 (CEK) 和随机数 (Nonce)
  const keyInfo = new TextEncoder().encode('Content-Encoding: aesgcm\0');
  const cekInfo = concat(keyInfo, new Uint8Array([0]));
  const nonceInfo = concat(keyInfo, new Uint8Array([1]));
  
  const contentEncryptionKey = await hkdfGenerate(
    salt,
    prk,
    cekInfo,
    16
  );
  
  const nonce = await hkdfGenerate(
    salt,
    prk,
    nonceInfo,
    12
  );
  
  // 7. 导入AES-GCM密钥
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // 8. 获取本地公钥的原始字节
  const localPublicKeyBytes = await crypto.subtle.exportKey(
    'raw',
    localKeyPair.publicKey
  );
  
  // 9. 设置记录大小
  const recordSize = 4096;
  const recordSizeBytes = new Uint8Array([
    (recordSize >> 8) & 0xff,
    recordSize & 0xff
  ]);
  
  // 10. 创建aes128gcm格式头部
  // 格式: salt(16) + recordSizeBytes(2) + idlenPrefix(1) + serverPublicKeyBytes
  const idlenPrefix = new Uint8Array([65]); // 固定值，表示服务器公钥长度为65字节
  
  const header = concat(
    salt,
    recordSizeBytes,
    idlenPrefix,
    new Uint8Array(localPublicKeyBytes)
  );
  
  // 11. 使用AES-GCM加密消息
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      tagLength: 128 // GCM认证标签长度 (位)
    },
    encryptionKey,
    plaintext // 原始消息
  );
  
  // 12. 合并头部和密文
  const encryptedBuffer = concat(header, new Uint8Array(ciphertext));
  
  // 返回加密结果
  return {
    ciphertext: encryptedBuffer,
    localPublicKey: new Uint8Array(localPublicKeyBytes),
    salt
  };
}

// HKDF密钥派生函数实现 (RFC 5869)
async function hkdfGenerate(salt, ikm, info, length) {
  // 1. 提取步骤: HMAC-SHA-256(salt, IKM) -> PRK
  const baseKey = await crypto.subtle.importKey(
    'raw',
    salt.byteLength ? salt : new Uint8Array(32), // 如果salt为空，使用32字节的零填充
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const prk = await crypto.subtle.sign(
    'HMAC',
    baseKey,
    ikm
  );
  
  // 2. 扩展步骤: T = T(1) | T(2) | ... | T(N)
  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  let t = new Uint8Array(0);
  let lastT = new Uint8Array(0);
  let outputBytes = new Uint8Array(length);
  let counter = 0;
  
  while (counter * 32 < length) {
    counter++;
    const inputBytes = concat(lastT, info, new Uint8Array([counter]));
    
    const nextT = await crypto.subtle.sign(
      'HMAC',
      prkKey,
      inputBytes
    );
    
    lastT = new Uint8Array(nextT);
    
    // 填充输出结果
    const remaining = Math.min(32, length - (counter - 1) * 32);
    outputBytes.set(new Uint8Array(nextT, 0, remaining), (counter - 1) * 32);
  }
  
  return outputBytes;
}

// 连接多个Uint8Array
function concat(...arrays) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.byteLength;
  }
  
  return result;
}

// 重命名并修正 generateJWT 为 generateVAPIDJWT
async function generateVAPIDJWT(audience, subject, vapidPrivateKeyString, expirationSeconds = 12 * 60 * 60) {
  const header = { alg: 'ES256', typ: 'JWT' };
  const encodedHeader = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expirationSeconds,
    sub: subject,
  };
  const encodedPayload = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signingInputBytes = new TextEncoder().encode(signingInput);
  
  // VAPID 私钥应该是 Base64URL 编码的原始32字节密钥
  const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKeyString);

  let importedPrivateKey;
  try {
    // 对于 ECDSA P-256，私钥通常以 PKCS#8 或 JWK 格式导入。
    // 如果 'web-push' 生成的 VAPID_PRIVATE_KEY 是原始的32字节的D值（d component），
    // 并且是 base64url 编码的，则需要一种方法将其转换为 crypto.subtle 可接受的格式。
    // 最直接的方式可能是将其包装成一个 JWK (JSON Web Key)。
    // 假设 privateKeyBytes 是原始的32字节私钥 (D-value for P-256 curve)
    // 我们尝试将其作为 "raw" 导入，但这通常用于对称密钥或特定曲线的未封装格式，
    // ECDSA P-256的 "raw" 私钥导入在 Web Crypto API 中并不标准。
    // 更标准的方法是使用 JWK 格式。
    //
    // 临时尝试 'raw'，但请注意这可能在所有环境中都不起作用，或者期望特定的字节序。
    // JWK import:
    const jwk = {
        kty: "EC",
        crv: "P-256",
        d: vapidPrivateKeyString, // 必须是 base64url 编码的私钥 D 值
        // 为了完整性，通常也包含 x 和 y (公钥坐标)，但对于签名，d 可能是足够的
        // 如果 VAPID_PUBLIC_KEY 包含 x 和 y，可以从那里提取并添加到此 jwk 中
        // key_ops: ["sign"] // 可选
    };
    
    // 尝试导入为 JWK
    importedPrivateKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true, // extractable
      ['sign']
    );
  } catch (e) {
    console.error("导入VAPID私钥失败: ", e.message, e.stack);
    console.error("使用的私钥字符串 (vapidPrivateKeyString 前5位): ", vapidPrivateKeyString.substring(0,5));
    throw new Error(`无法导入VAPID私钥: ${e.message}. 请检查密钥格式 (应为Base64URL编码的P-256私钥D值) 和内容。`);
  }

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    importedPrivateKey,
    signingInputBytes
  );

  const encodedSignature = arrayBufferToBase64Url(signatureBuffer);
  return `${signingInput}.${encodedSignature}`;
}

// 生成VAPID头部
async function generateVAPIDHeaders(endpointUrlString, env) {
  const publicKey = env.VAPID_PUBLIC_KEY; 
  const privateKey = env.VAPID_PRIVATE_KEY; 
  
  if (!publicKey || !privateKey) {
    console.error('VAPID 公钥或私钥未在环境变量中配置');
    throw new Error('VAPID密钥缺失，无法生成头部。请在Cloudflare Worker环境变量中设置VAPID_PUBLIC_KEY和VAPID_PRIVATE_KEY。');
  }
  
  const url = new URL(endpointUrlString);
  const audience = `${url.protocol}//${url.host}`;
  const subject = env.VAPID_SUBJECT || 'mailto:your-default-email@example.com'; // 建议在env中配置VAPID_SUBJECT

  try {
    const jwtToken = await generateVAPIDJWT(audience, subject, privateKey);
    return {
      'Authorization': `WebPush ${jwtToken}`,
      'Crypto-Key': `p256ecdsa=${publicKey}`
    };
  } catch (e) {
    console.error("生成VAPID JWT时出错: ", e.message, e.stack);
    throw new Error(`生成VAPID头部失败: ${e.message}`);
  }
}

// 创建哈希值
async function createHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// 添加处理从Firebase同步数据的函数
async function handleSyncFromFirebase(request, env, ctx, corsHeaders) {
  try {
    console.log("接收到Firebase同步请求");
    
    // 获取请求数据
    const syncData = await request.json();
    
    if (!syncData || !syncData.reports || !Array.isArray(syncData.reports)) {
      return new Response(JSON.stringify({ 
        error: '无效的同步数据格式，需要包含reports数组' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    console.log(`同步${syncData.reports.length}条报告数据`);
    
    // 处理报告数据，保存到Cloudflare KV
    const processResults = [];
    
    for (const report of syncData.reports) {
      try {
        // 确保report有id
        if (!report.id) {
          processResults.push({
            success: false,
            error: '报告缺少ID'
          });
          continue;
        }
        
        // 格式化为标记数据
        const marker = {
          ...report,
          timestamp: report.time || new Date().toISOString(),
          createdAt: report.time || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          location: {
            lat: report.lat,
            lng: report.lng
          },
          title: report.description || '未命名位置',
          description: report.originalDescription || report.description || '',
          source: 'firebase_sync'
        };
        
        // 保存到KV存储
        await env.MARKERS.put(report.id.toString(), JSON.stringify(marker));
        
        processResults.push({
          success: true,
          id: report.id
        });
      } catch (error) {
        console.error(`处理报告 ${report.id} 失败:`, error);
        processResults.push({
          success: false,
          id: report.id,
          error: error.message
        });
      }
    }
    
    // 如果请求中明确要求发送通知
    if (syncData.sendNotifications === true) {
      const subscriptions = await getAllSubscriptions(env);
      
      // 对于成功同步的每个报告，发送通知
      for (const result of processResults) {
        if (result.success) {
          const report = syncData.reports.find(r => r.id.toString() === result.id.toString());
          
          if (report) {
            // 构建通知内容
            const notificationPayload = {
              title: `实时交通报告: ${report.description || '未命名位置'}`,
              body: report.originalDescription || report.description || '新的交通报告已添加',
              icon: '/ptvalert-pwa/images/icon-192x192.png',
              badge: '/ptvalert-pwa/images/badge-72x72.png',
              data: {
                url: `/ptvalert-pwa/marker-details.html?id=${report.id}`,
                dateOfArrival: Date.now(),
                primaryKey: 1,
                markerId: report.id,
                markerInfo: report
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
        }
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      processed: processResults.length,
      succeeded: processResults.filter(r => r.success).length,
      failed: processResults.filter(r => !r.success).length,
      results: processResults
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Firebase同步处理失败:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
} 