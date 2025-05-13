// Cloudflare Worker for PtvAlert
// Handles push notifications and data storage using Cloudflare KV

export default {
  async fetch(request, env, ctx) {
    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route handling
    // Push notification routes
    if (path === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env, corsHeaders);
    } else if (path === '/api/subscribe' && request.method === 'DELETE') {
      return handleUnsubscribe(request, env, corsHeaders);
    } else if (path === '/api/vapid-public-key') {
      return handleGetPublicKey(env, corsHeaders);
    } else if (path === '/api/send-notification' && request.method === 'POST') {
      return handleSendNotification(request, env, corsHeaders);
    } 
    // Marker data management routes
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
    // User management routes
    else if (path === '/api/users/admin' && request.method === 'POST') {
      return handleSetAdmin(request, env, corsHeaders);
    } else if (path === '/api/users/ban' && request.method === 'POST') {
      return handleBanUser(request, env, corsHeaders);
    } else if (path === '/api/users/unban' && request.method === 'POST') {
      return handleUnbanUser(request, env, corsHeaders);
    }
    // Authentication check
    else if (path === '/api/auth/check' && request.method === 'GET') {
      return handleAuthCheck(request, env, corsHeaders);
    }
    else {
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
    }
  },

  // Scheduled tasks handler
  async scheduled(event, env, ctx) {
    console.log("Running scheduled task to check for new markers");
    
    try {
      // Get all markers
      const markers = await getAllMarkers(env);
      
      // Check for recently added markers (last 24 hours)
      const recentMarkers = [];
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      
      for (const [id, marker] of Object.entries(markers)) {
        const markerTime = new Date(marker.timestamp || marker.time).getTime();
        if (markerTime > oneDayAgo) {
          recentMarkers.push({
            id,
            ...marker
          });
        }
      }
      
      // If there are new markers, send notifications to all subscribers
      if (recentMarkers.length > 0) {
        const subscriptions = await getAllSubscriptions(env);
        
        for (const marker of recentMarkers) {
          const notificationPayload = {
            title: `新地图标记: ${marker.title || marker.description || '未命名位置'}`,
            body: marker.description || '新的地图标记已添加',
            icon: '/images/icon-192x192.png',
            badge: '/images/badge-72x72.png',
            data: {
              url: `/marker-details.html?id=${marker.id}`,
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
          
          await sendNotificationsToAll(subscriptions, notificationPayload, env);
        }
      }
    } catch (error) {
      console.error("Error in scheduled task:", error);
    }
  }
};

// ==================== Push Notification Subscription Functions ====================

// Handle subscription request
async function handleSubscribe(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { subscription, userId } = data;
    
    if (!subscription) {
      return new Response('Missing subscription data', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Use hash of endpoint as unique identifier
    const subscriptionId = await createHash(subscription.endpoint);
    
    // Save subscription to KV storage
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

// Handle unsubscribe request
async function handleUnsubscribe(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { endpoint } = data;
    
    if (!endpoint) {
      return new Response('Missing endpoint', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Use hash of endpoint as unique identifier
    const subscriptionId = await createHash(endpoint);
    
    // Delete subscription from KV storage
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

// Get VAPID public key
async function handleGetPublicKey(env, corsHeaders) {
  try {
    if (env.VAPID_PUBLIC_KEY) {
      return new Response(JSON.stringify({ 
        publicKey: env.VAPID_PUBLIC_KEY 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'VAPID public key not configured' 
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

// Handle sending notifications
async function handleSendNotification(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { notification, userId, markerId } = data;
    
    if (!notification) {
      return new Response('Missing notification data', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    const subscriptions = await getAllSubscriptions(env);
    let targetSubscriptions = subscriptions;
    
    // Filter by userId if provided
    if (userId) {
      targetSubscriptions = {};
      for (const [id, subscriptionData] of Object.entries(subscriptions)) {
        if (subscriptionData.userId === userId) {
          targetSubscriptions[id] = subscriptionData;
        }
      }
    }
    
    // Add marker info if markerId is provided
    if (markerId) {
      const marker = await env.MARKERS.get(markerId);
      if (marker) {
        notification.data = notification.data || {};
        notification.data.markerId = markerId;
        notification.data.markerInfo = JSON.parse(marker);
      }
    }
    
    // Send notification to all target subscriptions
    const results = await sendNotificationsToAll(targetSubscriptions, notification, env);
    
    return new Response(JSON.stringify({ 
      success: true, 
      sent: results.sent,
      failed: results.failed
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

// ==================== Marker Management Functions ====================

// Get all markers
async function handleGetMarkers(request, env, corsHeaders) {
  try {
    const { keys } = await env.MARKERS.list();
    const markers = {};
    
    for (const key of keys) {
      const markerData = await env.MARKERS.get(key.name);
      if (markerData) {
        markers[key.name] = JSON.parse(markerData);
      }
    }
    
    return new Response(JSON.stringify(markers), {
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

// Get specific marker
async function handleGetMarker(markerId, env, corsHeaders) {
  try {
    const marker = await env.MARKERS.get(markerId);
    
    if (marker) {
      return new Response(marker, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Marker not found' }), {
        status: 404,
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

// Add new marker
async function handleAddMarker(request, env, corsHeaders) {
  try {
    const markerData = await request.json();
    
    // Validate marker data
    if (!markerData.lat || !markerData.lng) {
      return new Response(JSON.stringify({ error: 'Missing coordinates' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Generate marker ID if not provided
    const markerId = markerData.id || Date.now().toString();
    
    // Add timestamp and ensure all required fields
    const marker = {
      ...markerData,
      id: markerId,
      timestamp: markerData.timestamp || new Date().toISOString(),
      time: markerData.time || new Date().toISOString()
    };
    
    // Save marker to KV storage
    await env.MARKERS.put(markerId, JSON.stringify(marker));
    
    // Send notification if requested
    if (markerData.notify) {
      const subscriptions = await getAllSubscriptions(env);
      const notificationPayload = {
        title: `新地图标记: ${marker.title || marker.description || '未命名位置'}`,
        body: marker.description || '新的地图标记已添加',
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        data: {
          url: `/marker-details.html?id=${markerId}`,
          markerId: markerId,
          markerInfo: marker
        }
      };
      
      await sendNotificationsToAll(subscriptions, notificationPayload, env);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      marker: marker
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

// Update marker
async function handleUpdateMarker(markerId, request, env, corsHeaders) {
  try {
    const existingMarkerData = await env.MARKERS.get(markerId);
    
    if (!existingMarkerData) {
      return new Response(JSON.stringify({ error: 'Marker not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const existingMarker = JSON.parse(existingMarkerData);
    const updateData = await request.json();
    
    // Merge existing data with update data
    const updatedMarker = {
      ...existingMarker,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated marker to KV storage
    await env.MARKERS.put(markerId, JSON.stringify(updatedMarker));
    
    return new Response(JSON.stringify({ 
      success: true, 
      marker: updatedMarker
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

// Delete marker
async function handleDeleteMarker(markerId, env, corsHeaders) {
  try {
    const existingMarker = await env.MARKERS.get(markerId);
    
    if (!existingMarker) {
      return new Response(JSON.stringify({ error: 'Marker not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Delete marker from KV storage
    await env.MARKERS.delete(markerId);
    
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

// ==================== User Management Functions ====================

// Set user as admin
async function handleSetAdmin(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { userId } = data;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Save to admin users KV storage
    await env.ADMIN_USERS.put(userId, 'true');
    
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

// Ban user
async function handleBanUser(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { userId, reason, bannedBy } = data;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Create ban data
    const banData = {
      reason: reason || 'Violation of community rules',
      time: new Date().toISOString(),
      bannedBy: bannedBy || 'admin'
    };
    
    // Save to banned users KV storage
    await env.BANNED_USERS.put(userId, JSON.stringify(banData));
    
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

// Unban user
async function handleUnbanUser(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { userId } = data;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Remove from banned users KV storage
    await env.BANNED_USERS.delete(userId);
    
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

// Check authentication status
async function handleAuthCheck(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        authenticated: false,
        error: 'Missing userId'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Check if user is banned
    const bannedData = await env.BANNED_USERS.get(userId);
    const isAdmin = await env.ADMIN_USERS.get(userId) === 'true';
    
    return new Response(JSON.stringify({
      authenticated: true,
      userId: userId,
      isAdmin: isAdmin,
      isBanned: !!bannedData,
      banInfo: bannedData ? JSON.parse(bannedData) : null
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

// ==================== Helper Functions ====================

// Get all subscriptions
async function getAllSubscriptions(env) {
  const { keys } = await env.SUBSCRIPTIONS.list();
  const subscriptions = {};
  
  for (const key of keys) {
    const subscription = await env.SUBSCRIPTIONS.get(key.name);
    if (subscription) {
      subscriptions[key.name] = JSON.parse(subscription);
    }
  }
  
  return subscriptions;
}

// Get all markers
async function getAllMarkers(env) {
  const { keys } = await env.MARKERS.list();
  const markers = {};
  
  for (const key of keys) {
    const marker = await env.MARKERS.get(key.name);
    if (marker) {
      markers[key.name] = JSON.parse(marker);
    }
  }
  
  return markers;
}

// Send notifications to all subscriptions
async function sendNotificationsToAll(subscriptions, notificationPayload, env) {
  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };
  
  for (const [id, subscriptionData] of Object.entries(subscriptions)) {
    try {
      await sendPushNotification(
        subscriptionData.subscription,
        JSON.stringify(notificationPayload),
        env
      );
      results.sent++;
    } catch (error) {
      console.error(`Failed to send notification to ${id}:`, error);
      results.failed++;
      results.errors.push({
        id,
        error: error.message
      });
      
      // If the subscription is invalid (expired, etc.), remove it
      if (error.statusCode === 404 || error.statusCode === 410) {
        try {
          await env.SUBSCRIPTIONS.delete(id);
          console.log(`Removed invalid subscription ${id}`);
        } catch (deleteError) {
          console.error(`Failed to remove invalid subscription ${id}:`, deleteError);
        }
      }
    }
  }
  
  return results;
}

// Convert base64 string to Uint8Array for Web Push
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

// Send Web Push notification
async function sendPushNotification(subscription, payload, env) {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) {
    throw new Error('VAPID keys are not configured');
  }
  
  const vapidHeaders = await generateVAPIDHeaders(subscription.endpoint, env);
  
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': payload.length.toString(),
      ...vapidHeaders
    },
    body: payload
  });
  
  if (!response.ok) {
    throw {
      statusCode: response.status,
      message: `Push service responded with ${response.status} ${response.statusText}`
    };
  }
  
  return true;
}

// Generate JWT for Web Push
async function generateJWT(privateKey, claims) {
  // Convert the URL-safe base64 private key to a binary array
  const privateKeyArray = urlBase64ToUint8Array(privateKey);
  
  // Create the JWT header
  const header = {
    alg: 'ES256',
    typ: 'JWT'
  };
  
  // Encode header as base64
  const encodeBase64 = (obj) => btoa(JSON.stringify(obj))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const encodedHeader = encodeBase64(header);
  const encodedClaims = encodeBase64(claims);
  
  // Create the JWT signature input
  const signatureInput = `${encodedHeader}.${encodedClaims}`;
  
  // Sign using Web Crypto API
  const key = await crypto.subtle.importKey(
    'raw',
    privateKeyArray,
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  // Convert the signature to base64
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  // Return the complete JWT
  return `${signatureInput}.${encodedSignature}`;
}

// Generate VAPID headers for Web Push
async function generateVAPIDHeaders(endpoint, env) {
  const vapidPublicKey = env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
  
  const audience = new URL(endpoint).origin;
  const subject = 'mailto:example@example.com'; // Replace with your email
  
  const claims = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject
  };
  
  const jwt = await generateJWT(vapidPrivateKey, claims);
  
  return {
    'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`
  };
}

// Create a hash of a string (for subscription IDs)
async function createHash(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
} 