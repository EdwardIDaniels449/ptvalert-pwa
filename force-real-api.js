/**
 * 强制使用真实API补丁
 * 覆盖GitHub Pages环境检测和模拟响应机制
 */

(function() {
    console.log('[强制真实API] 初始化强制使用真实API补丁...');
    
    // 定义Cloudflare配置（确保使用真实API）
    if (window.cloudflareConfig) {
        // 确保useRealApi设置为true
        window.cloudflareConfig.useRealApi = true;
        console.log('[强制真实API] 已将cloudflareConfig.useRealApi设置为true');
        
        // 打印当前配置
        console.log('[强制真实API] 当前Cloudflare配置:', {
            apiUrl: window.cloudflareConfig.apiUrl,
            useRealApi: window.cloudflareConfig.useRealApi,
            apiKey: window.cloudflareConfig.apiKey ? '已设置' : '未设置'
        });
    } else {
        console.warn('[强制真实API] cloudflareConfig尚未定义，将在其定义后修改');
        
        // 使用Object.defineProperty监视cloudflareConfig的创建
        let _cloudflareConfig = {};
        Object.defineProperty(window, 'cloudflareConfig', {
            configurable: true,
            get: function() {
                return _cloudflareConfig;
            },
            set: function(newConfig) {
                // 确保useRealApi总是true
                newConfig.useRealApi = true;
                _cloudflareConfig = newConfig;
                console.log('[强制真实API] cloudflareConfig被设置，已强制useRealApi=true');
            }
        });
    }
    
    // 修复IS_GITHUB_PAGES标志
    window.IS_GITHUB_PAGES = false;
    
    // 如果fetch已被覆盖，恢复原始fetch
    if (window.originalFetch && typeof window.originalFetch === 'function') {
        console.log('[强制真实API] 恢复原始fetch函数');
        window.fetch = window.originalFetch;
    } else {
        // 保存当前fetch，以备不时之需
        window._currentFetch = window.fetch;
        
        // 创建一个钩子函数
        window.fetch = function() {
            // 在发起请求前记录
            const url = arguments[0];
            const options = arguments[1] || {};
            
            console.log('[强制真实API] 发起真实请求:', typeof url === 'string' ? url : url.url);
            
            // 向CloudflareAPI请求添加Authorization头
            if (window.cloudflareConfig && window.cloudflareConfig.apiKey) {
                const urlStr = typeof url === 'string' ? url : url.toString();
                if (urlStr.includes(window.cloudflareConfig.apiUrl)) {
                    if (!options.headers) {
                        options.headers = {};
                    }
                    
                    // 确保Headers对象正确处理
                    if (options.headers instanceof Headers) {
                        if (!options.headers.has('Authorization')) {
                            options.headers.append('Authorization', `Bearer ${window.cloudflareConfig.apiKey}`);
                        }
                    } else {
                        if (!options.headers['Authorization']) {
                            options.headers['Authorization'] = `Bearer ${window.cloudflareConfig.apiKey}`;
                        }
                    }
                    
                    arguments[1] = options;
                    console.log('[强制真实API] 已添加Authorization头');
                }
            }
            
            // 调用原始fetch
            return window._currentFetch.apply(this, arguments)
                .then(response => {
                    // 记录响应状态
                    console.log(`[强制真实API] 收到响应: ${response.status} ${response.statusText}`);
                    return response;
                })
                .catch(error => {
                    console.error('[强制真实API] 请求失败:', error);
                    throw error;
                });
        };
    }
    
    console.log('[强制真实API] 补丁已应用，将使用真实API而非模拟数据');
})(); 