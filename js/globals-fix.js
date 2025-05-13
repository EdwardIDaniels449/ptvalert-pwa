/**
 * 全局变量修复脚本
 * 解决各种未定义变量和GitHub Pages环境下的API问题
 */

(function() {
    console.log('[全局修复] 初始化全局变量和函数...');

    // 全局变量初始化
    window.currentLang = window.currentLang || 'zh-CN';
    window.currentUserId = window.currentUserId || ('user_' + Math.random().toString(36).substr(2, 8));
    window.mapMarkers = window.mapMarkers || [];

    // 简易国际化函数
    window.i18n = window.i18n || function(key) {
        // 定义基本的翻译字典
        const translations = {
            'zh-CN': {
                'app.title': 'PtvAlert',
                'app.description': '墨尔本交通信息共享平台',
                'notification.permission': '通知权限',
                'notification.allow': '允许通知',
                'notification.deny': '拒绝通知',
                'map.marker': '地图标记',
                'map.loading': '加载地图中...',
                'error.api': 'API请求失败'
                // 添加更多翻译...
            },
            'en': {
                'app.title': 'PtvAlert',
                'app.description': 'Melbourne Transport Info Sharing Platform',
                'notification.permission': 'Notification Permission',
                'notification.allow': 'Allow Notifications',
                'notification.deny': 'Deny Notifications',
                'map.marker': 'Map Marker',
                'map.loading': 'Loading Map...',
                'error.api': 'API Request Failed'
                // 添加更多翻译...
            }
        };

        // 获取当前语言的翻译
        const langDict = translations[window.currentLang] || translations['zh-CN'];
        
        // 返回翻译文本或键值本身
        return langDict[key] || key;
    };

    // 检测GitHub Pages环境
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // 在GitHub Pages环境下设置全局标志 - 但检查是否已被force-real-api.js设置
    if (isGitHubPages && window.IS_GITHUB_PAGES !== false) {
        window.IS_GITHUB_PAGES = true;
        
        // 获取仓库名称，设置基本路径
        const pathSegments = window.location.pathname.split('/');
        if (pathSegments.length >= 2 && pathSegments[1]) {
            window.GITHUB_PAGES_BASE_PATH = '/' + pathSegments[1] + '/';
        } else {
            window.GITHUB_PAGES_BASE_PATH = '/';
        }
        
        console.log('[全局修复] GitHub Pages环境: 基本路径 =', window.GITHUB_PAGES_BASE_PATH);
    }

    // 在GitHub Pages环境下拦截所有API请求 - 除非明确设置强制使用真实API
    const cloudflareConfig = window.cloudflareConfig || {};
    const forceRealApi = cloudflareConfig.useRealApi === true;

    if (isGitHubPages && !forceRealApi && !window.originalFetch) {
        console.log('[全局修复] 检测到GitHub Pages环境，应用API请求拦截');

        // 默认API响应
        const defaultApiResponse = {
            success: true,
            message: '这是GitHub Pages环境的模拟响应',
            data: { mockData: true, timestamp: Date.now() }
        };
        
        // 特定API端点的模拟响应
        const mockResponses = {
            'subscribe': {
                success: true,
                message: '模拟推送订阅成功',
                data: {
                    subscription: {
                        endpoint: 'https://mock-push-service.github.io/endpoint',
                        keys: {
                            p256dh: 'mock-p256dh-key',
                            auth: 'mock-auth-key'
                        }
                    }
                }
            },
            'send-notification': {
                success: true,
                message: '模拟通知发送成功',
                data: {
                    delivered: true,
                    id: 'mock-notification-' + Date.now()
                }
            },
            'user': {
                success: true,
                message: '用户信息获取成功',
                data: {
                    id: window.currentUserId,
                    isAdmin: false,
                    reportCount: Math.floor(Math.random() * 10)
                }
            }
        };

        // 覆盖全局fetch函数
        window.originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            // 检查是否有cloudflareConfig
            const cloudflareConfig = window.cloudflareConfig || {};
            const useRealApi = cloudflareConfig.useRealApi === true;
            
            // 如果设置了useRealApi且不在GitHub Pages环境，或者不是API请求，则使用原始fetch
            if (useRealApi) {
                console.log('[全局修复] 检测到useRealApi=true，使用原始fetch');
                return window.originalFetch.apply(this, arguments);
            }
            
            // 仅处理相对路径或指向当前域名的API请求
            const urlStr = url.toString();
            
            if (urlStr.includes('/api/') || 
                urlStr.includes('subscribe') || 
                urlStr.includes('notification') ||
                urlStr.includes('user') ||
                (options && options.method === 'POST')) {
                
                console.log('[全局修复] 拦截API请求:', urlStr, options);
                
                // 确定使用哪个模拟响应
                let responseData = defaultApiResponse;
                
                // 尝试匹配端点
                for (const endpoint in mockResponses) {
                    if (urlStr.includes(endpoint)) {
                        responseData = mockResponses[endpoint];
                        break;
                    }
                }
                
                // 创建模拟响应
                return new Promise((resolve) => {
                    // 模拟网络延迟 (随机200-600ms)
                    setTimeout(() => {
                        // 构建响应对象
                        const mockResponse = {
                            ok: true,
                            status: 200,
                            statusText: 'OK (GitHub Pages Mock)',
                            headers: new Headers({
                                'Content-Type': 'application/json',
                                'X-Mock-Response': 'true'
                            }),
                            json: function() {
                                return Promise.resolve(responseData);
                            },
                            text: function() {
                                return Promise.resolve(JSON.stringify(responseData));
                            }
                        };
                        
                        resolve(mockResponse);
                    }, 200 + Math.random() * 400);
                });
            }
            
            // 对于非API请求，使用原始fetch
            return window.originalFetch.apply(this, arguments);
        };

        // 提供其他可能需要的全局函数
        window.showToast = window.showToast || function(message) {
            console.log('[模拟Toast]', message);
            // 创建一个简单的浮动提示
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:white;padding:10px 20px;border-radius:4px;font-size:14px;z-index:10000;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        };
        
        window.showError = window.showError || function(message) {
            console.error('[模拟错误提示]', message);
            window.showToast('错误: ' + message);
        };
    } else {
        console.log('[全局修复] 不启用API请求拦截，将使用真实API');
    }

    console.log('[全局修复] 全局变量和函数初始化完成');
})(); 