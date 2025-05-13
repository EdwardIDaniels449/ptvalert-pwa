/**
 * URL修复工具 - 用于解决推送通知中的URL问题
 * 当检测到错误的域名时，动态修复API_BASE_URL
 */

(function() {
    console.log('URL修复工具已加载，正在检查配置...');
    
    // 尝试清除Service Worker和缓存
    async function clearServiceWorkerAndCache() {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                
                if (registrations.length > 0) {
                    console.log(`发现 ${registrations.length} 个Service Worker，正在卸载...`);
                    
                    for (let registration of registrations) {
                        await registration.unregister();
                        console.log(`已卸载Service Worker: ${registration.scope}`);
                    }
                    
                    console.log('所有Service Worker已卸载');
                } else {
                    console.log('没有发现Service Worker');
                }
            } else {
                console.log('此浏览器不支持Service Worker');
            }
            
            // 尝试清除缓存
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                
                if (cacheNames.length > 0) {
                    console.log(`发现 ${cacheNames.length} 个缓存，正在清除...`);
                    
                    for (let cacheName of cacheNames) {
                        await caches.delete(cacheName);
                        console.log(`已清除缓存: ${cacheName}`);
                    }
                    
                    console.log('所有缓存已清除');
                } else {
                    console.log('没有发现缓存');
                }
            } else {
                console.log('此浏览器不支持Cache API');
            }
            
            return true;
        } catch (error) {
            console.error('清除Service Worker和缓存失败:', error);
            return false;
        }
    }
    
    // 检查API域名是否可访问
    async function checkApiServer() {
        try {
            // 尝试ping API服务器
            console.log('正在检查API服务器连接...');
            
            // 使用HEAD请求检查服务器是否可达
            // 使用随机参数防止缓存
            const pingUrl = `https://ptvalert.pages.dev/favicon.ico?nocache=${Date.now()}`;
            console.log(`Ping URL: ${pingUrl}`);
            
            try {
                const response = await fetch(pingUrl, {
                    method: 'HEAD',
                    mode: 'cors',
                    cache: 'no-cache'
                });
                
                if (response.ok || response.status === 204) {
                    console.log('API服务器可达:', response.status);
                    return true;
                } else {
                    console.warn(`API服务器返回状态码: ${response.status}`);
                    return false;
                }
            } catch (error) {
                console.error('API服务器连接失败:', error);
                
                // 显示错误通知
                setTimeout(() => {
                    alert(`连接到API服务器失败: ${error.message}\n\n请检查你的网络连接，或者API服务器可能暂时不可用。`);
                }, 1000);
                
                return false;
            }
        } catch (e) {
            console.error('检查API服务器失败:', e);
            return false;
        }
    }
    
    // 修复API_BASE_URL
    function fixApiBaseUrl() {
        try {
            // 检查全局变量API_BASE_URL是否存在
            if (typeof API_BASE_URL !== 'undefined') {
                // 如果使用了错误的域名，则修复它
                if (API_BASE_URL.includes('your-subdomain.workers.dev')) {
                    console.warn('发现错误的API_BASE_URL:', API_BASE_URL);
                    // 保存原始URL以便报告
                    const originalUrl = API_BASE_URL;
                    // 设置为正确的URL
                    API_BASE_URL = 'https://ptvalert.pages.dev';
                    console.warn('已修复为:', API_BASE_URL);
                    
                    // 显示修复消息
                    setTimeout(() => {
                        alert(`已修复错误的API URL:\n从: ${originalUrl}\n到: ${API_BASE_URL}\n\n请刷新页面以确保所有功能正常工作。`);
                    }, 1000);
                    
                    return true;
                } else {
                    console.log('API_BASE_URL配置正确:', API_BASE_URL);
                    return false;
                }
            } else {
                console.log('未找到API_BASE_URL变量');
                return false;
            }
        } catch (e) {
            console.error('检查或修复API_BASE_URL失败:', e);
            return false;
        }
    }
    
    // 修复GitHub Pages上的Service Worker路径
    function fixServiceWorkerPath() {
        try {
            // 检查是否在GitHub Pages上
            const isGitHubPages = window.location.hostname.includes('github.io');
            
            if (isGitHubPages) {
                console.log('检测到GitHub Pages环境，添加Service Worker路径修复');
                
                // 添加补丁脚本
                const script = document.createElement('script');
                script.textContent = `
                    // 修复GitHub Pages上的Service Worker注册
                    if ('serviceWorker' in navigator) {
                        // 覆盖原始的serviceWorker.register方法
                        const originalRegister = navigator.serviceWorker.register;
                        navigator.serviceWorker.register = function(scriptURL, options) {
                            console.warn('拦截Service Worker注册，原始路径:', scriptURL);
                            
                            // 修改为相对路径
                            let fixedScriptURL = scriptURL;
                            if (scriptURL.startsWith('/')) {
                                fixedScriptURL = '.' + scriptURL;
                                console.warn('修复为相对路径:', fixedScriptURL);
                            }
                            
                            // 修改作用域为相对路径
                            let fixedOptions = options || {};
                            if (fixedOptions.scope && fixedOptions.scope === '/') {
                                fixedOptions.scope = './';
                                console.warn('修复作用域为相对路径:', fixedOptions.scope);
                            }
                            
                            // 使用修复后的参数调用原始方法
                            return originalRegister.call(this, fixedScriptURL, fixedOptions);
                        };
                    }
                `;
                document.head.appendChild(script);
                return true;
            }
            
            return false;
        } catch (e) {
            console.error('修复Service Worker路径失败:', e);
            return false;
        }
    }
    
    // 监听控制台错误
    function setupErrorListener() {
        try {
            const oldConsoleError = console.error;
            console.error = function() {
                const args = Array.from(arguments);
                const errorText = args.join(' ');
                
                // 检查是否有错误URL
                if (errorText.includes('your-subdomain.workers.dev')) {
                    console.warn('在错误消息中检测到错误域名！尝试修复...');
                    fixApiBaseUrl();
                }
                
                // 检查是否有404错误
                if (errorText.includes('404') && errorText.includes('service-worker.js')) {
                    console.warn('检测到Service Worker 404错误，尝试修复...');
                    fixServiceWorkerPath();
                }
                
                // 检查DNS解析错误
                if (errorText.includes('ERR_NAME_NOT_RESOLVED') && errorText.includes('ptvalert.pages.dev')) {
                    console.warn('检测到API域名DNS解析错误!');
                    checkApiServer();
                }
                
                // 调用原始的console.error
                oldConsoleError.apply(console, args);
            };
            console.log('已设置错误监听器');
        } catch (e) {
            console.error('设置错误监听器失败:', e);
        }
    }
    
    // 初始化
    async function initialize() {
        // 立即执行GitHub Pages路径修复
        fixServiceWorkerPath();
        
        // 等待页面完全加载
        if (document.readyState === 'complete') {
            console.log('页面已完全加载，开始URL修复');
            await clearServiceWorkerAndCache();
            fixApiBaseUrl();
            await checkApiServer();
            setupErrorListener();
        } else {
            console.log('等待页面加载完成...');
            window.addEventListener('load', async function() {
                console.log('页面已加载，开始URL修复');
                await clearServiceWorkerAndCache();
                fixApiBaseUrl();
                await checkApiServer();
                setupErrorListener();
            });
        }
    }
    
    // 启动初始化
    initialize();
})(); 