/**
 * API监控工具 - 精简版
 * 仅保留日志记录功能，没有UI界面
 */

(function() {
    console.log('[API监控] 初始化API监控工具...');
    
    // 设置API监控
    function setupApiMonitoring() {
        if (!window._apiRequests) {
            window._apiRequests = [];
            window._apiRequestCount = 0;
        }
        
        const cloudflareConfig = window.cloudflareConfig || {};
        const apiUrl = cloudflareConfig.apiUrl || cloudflareConfig.apiBaseUrl || '';
        
        if (apiUrl && !window._monitoringApi) {
            window._monitoringApi = true;
            
            // 保存原始fetch
            const originalFetch = window.fetch;
            
            // 覆盖fetch以监控API请求
            window.fetch = function(url, options = {}) {
                const urlStr = typeof url === 'string' ? url : url.toString();
                
                // 如果是API请求，记录它
                if (urlStr.includes(apiUrl)) {
                    const requestId = ++window._apiRequestCount;
                    const method = options.method || 'GET';
                    
                    console.log(`[API监控] 请求 #${requestId} ${method} ${urlStr}`);
                    
                    // 调用原始fetch并监控结果
                    return originalFetch.apply(this, arguments)
                        .then(response => {
                            console.log(`[API监控] 请求 #${requestId} 完成: ${response.status} ${response.statusText}`);
                            return response;
                        })
                        .catch(error => {
                            console.error(`[API监控] 请求 #${requestId} 失败:`, error);
                            throw error;
                        });
                }
                
                // 非API请求，正常使用fetch
                return originalFetch.apply(this, arguments);
            };
            
            console.log('[API监控] API监控已启用');
        }
    }
    
    // 在DOMContentLoaded事件后设置监控
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', setupApiMonitoring);
    } else {
        setupApiMonitoring();
    }
})(); 