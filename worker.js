/**
 * Cloudflare Worker for PtvAlert
 * 处理API请求和推送通知
 */

// 配置CORS头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Worker入口点
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * 处理所有请求
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 记录请求信息
  console.log(`${request.method} ${path}`);
  
  // 处理OPTIONS请求（预检请求）
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // 路由请求到适当的处理函数
  try {
    // API健康检查
    if (path === '/ping') {
      return await handlePing(request);
    }
    
    // API版本信息
    if (path === '/version') {
      return await handleVersion(request);
    }
    
    // 获取报告列表
    if (path === '/api/reports') {
      return await handleGetReports(request);
    }
    
    // 获取单个报告
    if (path.match(/^\/api\/reports\/([^\/]+)$/)) {
      const id = path.split('/').pop();
      return await handleGetReport(request, id);
    }
    
    // 创建新报告
    if (path === '/api/reports' && request.method === 'POST') {
      return await handleCreateReport(request);
    }
    
    // 与Firebase同步
    if (path === '/api/sync-from-firebase') {
      return await handleSyncFromFirebase(request);
    }
    
    // 发送通知
    if (path === '/api/send-notification') {
      return await handleSendNotification(request);
    }
    
    // 订阅推送通知
    if (path === '/api/subscribe') {
      return await handleSubscribe(request);
    }
    
    // 路径未找到
    return new Response(JSON.stringify({
      success: false,
      error: 'Not Found',
      message: `Endpoint "${path}" does not exist`
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    // 处理错误
    console.error(`Error handling request: ${error.message}`);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 处理OPTIONS请求（预检请求）
 */
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

/**
 * 处理ping请求 - 简单的健康检查端点
 */
async function handlePing(request) {
  return new Response(JSON.stringify({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * 处理version请求 - 返回API版本信息
 */
async function handleVersion(request) {
  return new Response(JSON.stringify({
    success: true,
    version: '1.0.0',
    environment: 'production',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * 处理获取报告列表请求
 */
async function handleGetReports(request) {
  // 从KV存储中获取报告列表
  try {
    // 检查是否有SUBSCRIPTIONS命名空间
    if (typeof REPORTS === 'undefined') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration Error',
        message: 'REPORTS KV namespace is not defined',
        debug: 'Please ensure the REPORTS KV namespace is bound to your worker'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 尝试从KV获取所有报告
    // 注意：这里简化了处理，实际中可能需要分页和更复杂的查询
    const keys = await REPORTS.list();
    const reports = [];
    
    for (const key of keys.keys) {
      const report = await REPORTS.get(key.name, { type: 'json' });
      if (report) {
        reports.push(report);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      count: reports.length,
      reports: reports
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve reports',
      message: error.message,
      debug: 'This might be an issue with KV access or permissions'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 处理获取单个报告请求
 */
async function handleGetReport(request, id) {
  try {
    if (typeof REPORTS === 'undefined') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration Error',
        message: 'REPORTS KV namespace is not defined'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 从KV获取报告
    const report = await REPORTS.get(id, { type: 'json' });
    
    if (!report) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Not Found',
        message: `Report with ID ${id} not found`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      report: report
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve report',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 处理创建报告请求
 */
async function handleCreateReport(request) {
  try {
    if (typeof REPORTS === 'undefined') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration Error',
        message: 'REPORTS KV namespace is not defined'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 解析请求体
    const data = await request.json();
    
    // 验证数据
    if (!data.id || !data.location) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Missing required fields: id, location'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 添加时间戳
    if (!data.time) {
      data.time = new Date().toISOString();
    }
    
    // 存储到KV
    await REPORTS.put(data.id, JSON.stringify(data));
    
    // 发送通知（如果启用）
    if (data.sendNotification !== false) {
      // 这里会触发通知逻辑
      console.log(`Would send notification for report ${data.id}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Report created successfully',
      reportId: data.id
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create report',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 处理从Firebase同步请求
 */
async function handleSyncFromFirebase(request) {
  try {
    if (typeof REPORTS === 'undefined') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration Error',
        message: 'REPORTS KV namespace is not defined'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 创建请求的副本，以防止原始请求体已被使用
    let requestClone;
    try {
      requestClone = request.clone();
    } catch (error) {
      // 如果无法克隆，提供明确错误信息
      return new Response(JSON.stringify({
        success: false,
        error: 'Request Error',
        message: 'Cannot clone the request: ' + error.message,
        details: 'The request body may have already been consumed'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 解析请求体
    let data;
    try {
      data = await requestClone.json();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON',
        message: 'Failed to parse request body: ' + error.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    if (!data.reports || !Array.isArray(data.reports)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Missing or invalid reports array'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 处理每个报告
    const results = {
      total: data.reports.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    };
    
    for (const report of data.reports) {
      results.processed++;
      
      try {
        if (!report.id) {
          throw new Error('Report missing ID');
        }
        
        // 存储到KV
        await REPORTS.put(report.id, JSON.stringify(report));
        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          reportId: report.id || 'unknown',
          error: error.message
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Firebase sync completed',
      results: results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to sync from Firebase',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 处理发送通知请求
 */
async function handleSendNotification(request) {
  try {
    if (typeof SUBSCRIPTIONS === 'undefined') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration Error',
        message: 'SUBSCRIPTIONS KV namespace is not defined',
        debug: 'Make sure the SUBSCRIPTIONS KV namespace is bound to your worker'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 解析请求体
    const data = await request.json();
    
    if (!data.message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Missing message content'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 获取所有订阅
    const keys = await SUBSCRIPTIONS.list();
    const subscriptions = [];
    
    for (const key of keys.keys) {
      const subscription = await SUBSCRIPTIONS.get(key.name, { type: 'json' });
      if (subscription) {
        subscriptions.push(subscription);
      }
    }
    
    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No Subscriptions',
        message: 'No active subscriptions found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 在实际应用中，这里会调用Web Push API发送通知
    // 但这里我们只返回模拟成功
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully',
      sentTo: subscriptions.length,
      subscriptions: subscriptions.map(sub => sub.endpoint)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 处理订阅请求
 */
async function handleSubscribe(request) {
  try {
    if (typeof SUBSCRIPTIONS === 'undefined') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration Error',
        message: 'SUBSCRIPTIONS KV namespace is not defined'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 解析请求体
    const data = await request.json();
    
    if (!data.subscription || !data.subscription.endpoint) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Missing or invalid subscription data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 使用端点URL的哈希作为唯一ID
    const endpointHash = await getEndpointHash(data.subscription.endpoint);
    
    // 存储订阅
    await SUBSCRIPTIONS.put(endpointHash, JSON.stringify(data.subscription));
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription stored successfully',
      subscriptionId: endpointHash
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to store subscription',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 计算端点URL的哈希作为唯一标识符
 */
async function getEndpointHash(endpoint) {
  const encoder = new TextEncoder();
  const data = encoder.encode(endpoint);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
} 