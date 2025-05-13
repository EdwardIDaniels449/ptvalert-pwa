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

    // 在GitHub Pages环境下拦截所有API请求
    if (isGitHubPages) {
        console.log('[全局修复] 检测到GitHub Pages环境，应用API请求拦截');

        // 覆盖全局fetch函数
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            // 仅处理相对路径或指向当前域名的API请求
            const urlStr = url.toString();
            if (urlStr.includes('/api/') || 
                (options.method === 'POST' && urlStr.includes('subscribe')) ||
                urlStr.includes('send-notification')) {
                
                console.log('[全局修复] 拦截API请求:', url, options);
                
                // 创建模拟响应
                return new Promise((resolve) => {
                    // 模拟网络延迟
                    setTimeout(() => {
                        // 构建响应对象
                        const mockResponse = {
                            ok: true,
                            status: 200,
                            statusText: 'OK (Mocked)',
                            headers: new Headers({
                                'Content-Type': 'application/json'
                            }),
                            json: function() {
                                return Promise.resolve({
                                    success: true,
                                    message: '这是GitHub Pages环境的模拟响应',
                                    data: { mockData: true, timestamp: Date.now() }
                                });
                            },
                            text: function() {
                                return Promise.resolve(JSON.stringify({
                                    success: true,
                                    message: '这是GitHub Pages环境的模拟响应',
                                    data: { mockData: true, timestamp: Date.now() }
                                }));
                            }
                        };
                        
                        resolve(mockResponse);
                    }, 200); // 200ms延迟模拟网络请求
                });
            }
            
            // 对于非API请求，使用原始fetch
            return originalFetch.apply(this, arguments);
        };

        // 提供其他可能需要的全局函数
        window.showToast = window.showToast || function(message) {
            console.log('[模拟Toast]', message);
        };
        
        window.showError = window.showError || function(message) {
            console.error('[模拟错误提示]', message);
        };
    }

    console.log('[全局修复] 全局变量和函数初始化完成');
})(); 