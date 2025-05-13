/**
 * 全面彻底修复API模式脚本
 * 此脚本会覆盖和更新所有与API调用相关的设置
 * 确保在GitHub Pages环境下强制使用真实API而非模拟响应
 */

(function() {
    console.log('[全面修复] 启动全面API修复程序...');
    
    // 1. 强制设置环境标志
    window.IS_GITHUB_PAGES = false;
    console.log('[全面修复] 强制设置 IS_GITHUB_PAGES = false');
    
    // 2. 确保有正确的Cloudflare配置
    // 尝试导入cloudflare-config.js中的配置
    if (window.cloudflareConfig) {
        console.log('[全面修复] 检测到cloudflare-config.js配置');
    } else {
        console.log('[全面修复] 未检测到cloudflare-config.js，创建默认配置');
        // 如果没有检测到配置，使用默认配置
        window.cloudflareConfig = {
            apiBaseUrl: 'https://ptvalert.qingyangzhou85.workers.dev',
            useRealApi: true,
            debug: false,
            vapidPublicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
        };
    }
    
    // 确保useRealApi设置为true
    window.cloudflareConfig.useRealApi = true;
    
    // 兼容旧版配置结构
    if (!window.cloudflareConfig.apiUrl && window.cloudflareConfig.apiBaseUrl) {
        window.cloudflareConfig.apiUrl = window.cloudflareConfig.apiBaseUrl;
    }
    
    // 设置API端点
    if (!window.cloudflareConfig.dataEndpoint) {
        window.cloudflareConfig.dataEndpoint = '/api/reports';
    }
    if (!window.cloudflareConfig.syncEndpoint) {
        window.cloudflareConfig.syncEndpoint = '/api/sync-from-firebase';
    }
    if (!window.cloudflareConfig.notificationEndpoint) {
        window.cloudflareConfig.notificationEndpoint = '/api/send-notification';
    }
    
    console.log('[全面修复] cloudflareConfig已设置:', {
        apiUrl: window.cloudflareConfig.apiUrl || window.cloudflareConfig.apiBaseUrl,
        useRealApi: window.cloudflareConfig.useRealApi,
        apiKey: window.cloudflareConfig.apiKey ? '已设置' : '未设置'
    });
    
    // 3. 恢复原始fetch函数（如果它被替换）
    if (window.originalFetch && typeof window.originalFetch === 'function') {
        console.log('[全面修复] 恢复原始fetch函数');
        window.fetch = window.originalFetch;
    }
    
    // 4. 创建一个防止后续脚本修改这些值的保护
    const setupPropertyProtection = function() {
        console.log('[全面修复] 设置属性保护');
        
        // 保护IS_GITHUB_PAGES
        let _isGithubPages = false;
        try {
            Object.defineProperty(window, 'IS_GITHUB_PAGES', {
                get: function() { return _isGithubPages; },
                set: function(value) {
                    console.log('[全面修复] 阻止修改IS_GITHUB_PAGES为:', value);
                    _isGithubPages = false;
                    return false;
                },
                configurable: false
            });
        } catch(e) {
            console.log('[全面修复] 无法保护IS_GITHUB_PAGES:', e);
        }
        
        // 保护cloudflareConfig.useRealApi
        try {
            let _useRealApi = true;
            Object.defineProperty(window.cloudflareConfig, 'useRealApi', {
                get: function() { return _useRealApi; },
                set: function(value) {
                    console.log('[全面修复] 阻止修改useRealApi为:', value);
                    _useRealApi = true;
                    return true;
                },
                configurable: false
            });
        } catch(e) {
            console.log('[全面修复] 无法保护cloudflareConfig.useRealApi:', e);
        }
    };
    
    // 立即设置属性保护
    setupPropertyProtection();
    
    // 5. 添加监控和错误处理
    const originalFetch = window.fetch;
    window.fetch = function() {
        const url = arguments[0];
        const options = arguments[1] || {};
        const urlStr = typeof url === 'string' ? url : url.toString();
        const apiBaseUrl = window.cloudflareConfig.apiUrl || window.cloudflareConfig.apiBaseUrl;
        
        // 检测是否是API请求
        if (urlStr.includes(apiBaseUrl)) {
            console.log('[全面修复] 正在发送API请求:', urlStr);
            
            // 确保请求包含Authorization头
            if (window.cloudflareConfig.apiKey) {
                if (!options.headers) options.headers = {};
                
                if (options.headers instanceof Headers) {
                    if (!options.headers.has('Authorization')) {
                        options.headers.append('Authorization', `Bearer ${window.cloudflareConfig.apiKey}`);
                    }
                } else {
                    if (!options.headers['Authorization']) {
                        options.headers['Authorization'] = `Bearer ${window.cloudflareConfig.apiKey}`;
                    }
                }
                
                console.log('[全面修复] 已添加Authorization头');
            }
            
            // 为响应添加更多的错误处理和日志
            return originalFetch.apply(this, arguments)
                .then(response => {
                    if (!response.ok) {
                        console.error(`[全面修复] API请求失败: ${response.status} ${response.statusText}`);
                        
                        // 在非成功响应上添加帮助方法
                        response._apiErrorHandled = true;
                        const originalJson = response.json;
                        response.json = function() {
                            return originalJson.call(this)
                                .then(data => {
                                    console.error('[全面修复] API错误响应体:', data);
                                    return data;
                                })
                                .catch(e => {
                                    return { error: response.statusText, message: `无法解析错误响应: ${e.message}` };
                                });
                        };
                        
                        // 尝试获取错误页面的内容
                        console.log('[全面修复] 尝试获取错误页面内容');
                        response.text().then(text => {
                            console.log('[全面修复] 错误响应内容:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
                        }).catch(e => {
                            console.error('[全面修复] 无法获取错误响应内容:', e);
                        });
                    } else {
                        console.log(`[全面修复] API请求成功: ${response.status}`);
                    }
                    return response;
                })
                .catch(error => {
                    console.error('[全面修复] API请求网络错误:', error);
                    
                    // 创建自定义错误响应
                    const customResponse = {
                        ok: false,
                        status: 0,
                        statusText: error.message || '网络错误',
                        headers: new Headers({
                            'Content-Type': 'application/json'
                        }),
                        _isCustomErrorResponse: true,
                        json: function() {
                            return Promise.resolve({
                                success: false,
                                error: error.message || '网络错误',
                                message: '无法连接到API服务器',
                                details: {
                                    url: urlStr,
                                    originalError: error.stack || error.toString()
                                }
                            });
                        },
                        text: function() {
                            return Promise.resolve(JSON.stringify({
                                success: false,
                                error: error.message || '网络错误'
                            }));
                        }
                    };
                    
                    return customResponse;
                });
        }
        
        // 对于非API请求，使用原始fetch
        return originalFetch.apply(this, arguments);
    };
    
    // 6. 监听DOMContentLoaded事件，在页面加载完成后再次应用修复
    window.addEventListener('DOMContentLoaded', function() {
        console.log('[全面修复] 页面加载完成，再次应用修复');
        
        // 再次确保设置
        window.IS_GITHUB_PAGES = false;
        window.cloudflareConfig.useRealApi = true;
        
        // 测试API连接
        const testApiConnection = function() {
            console.log('[全面修复] 测试API连接');
            const apiBaseUrl = window.cloudflareConfig.apiUrl || window.cloudflareConfig.apiBaseUrl;
            
            fetch(`${apiBaseUrl}/ping`)
                .then(response => response.json())
                .then(data => {
                    console.log('[全面修复] API连接测试成功:', data);
                    
                    // 使页面显示API状态
                    const statusElement = document.getElementById('apiStatus');
                    if (statusElement) {
                        statusElement.textContent = '已连接';
                        statusElement.className = 'connected';
                    }
                })
                .catch(error => {
                    console.error('[全面修复] API连接测试失败:', error);
                    
                    // 使页面显示API状态
                    const statusElement = document.getElementById('apiStatus');
                    if (statusElement) {
                        statusElement.textContent = '连接失败';
                        statusElement.className = 'disconnected';
                    }
                });
        };
        
        // 延迟1秒后测试连接
        setTimeout(testApiConnection, 1000);
    });
    
    console.log('[全面修复] 全面API修复程序已完成初始化');
})(); 