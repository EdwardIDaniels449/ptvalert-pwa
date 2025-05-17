/**
 * URL修复工具 - 用于解决推送通知中的URL问题
 * 当检测到错误的域名时，动态修复API_BASE_URL
 */

(function() {
    console.log('URL修复工具已加载，正在检查配置...');
    
    // 设置适当的API服务器URL
    function getCorrectApiUrl() {
        // 检查是否为本地开发环境
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.');
        
        if (isLocalhost) {
            // 本地开发环境使用 http
            return 'http://' + window.location.host;
        }
        
        // 其他环境使用 https
        return 'https://' + window.location.hostname;
    }
    
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
    
    // 检查API服务器是否可用
    async function checkApiServer() {
        try {
            // 检查是否在本地环境或GitHub Pages环境中
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.');
            const isGitHubPages = window.location.hostname.includes('github.io');
            
            // 如果在本地环境或GitHub Pages环境中，跳过API服务器检查
            if (isLocalhost || isGitHubPages) {
                console.log('检测到本地或GitHub Pages环境，使用静态模式并跳过API服务器检查');
                
                // 设置为静态模式，不需要连接API服务器
                window.API_MODE = 'static';
                
                return true;
            }
            
            // 获取正确的API URL
            const correctApiUrl = getCorrectApiUrl();
            console.log('尝试API服务器连接:', correctApiUrl);
            
            try {
                // 使用超时解决长时间等待问题
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('API请求超时')), 5000);
                });
                
                // 使用随机参数防止缓存
                const pingUrl = `${correctApiUrl}/ping?nocache=${Date.now()}`;
                const fetchPromise = fetch(pingUrl, {
                    method: 'HEAD',
                    mode: 'cors',
                    cache: 'no-cache'
                });
                
                // 使用Promise.race来实现超时功能
                const response = await Promise.race([fetchPromise, timeoutPromise]);
                
                if (response.ok || response.status === 204) {
                    console.log('API服务器可达:', response.status);
                    window.API_MODE = 'online';
                    return true;
                } else {
                    console.warn(`API服务器返回状态码: ${response.status}`);
                    window.API_MODE = 'static'; // 切换到静态模式
                    return false;
                }
            } catch (error) {
                console.error('API服务器连接失败:', error);
                
                // 设置为静态模式
                window.API_MODE = 'static';
                
                // 尝试使用当前域名作为API服务器
                if (typeof window.API_BASE_URL !== 'undefined') {
                    const originalUrl = window.API_BASE_URL;
                    window.API_BASE_URL = correctApiUrl;
                    console.log(`API服务器连接失败, 已切换到静态模式，将使用本地存储数据`);
                }
                
                return false;
            }
        } catch (e) {
            console.error('检查API服务器失败:', e);
            window.API_MODE = 'static'; // 切换到静态模式
            return false;
        }
    }
    
    // 修复API_BASE_URL
    function fixApiBaseUrl() {
        try {
            // 检查全局变量API_BASE_URL是否存在
            if (typeof window.API_BASE_URL !== 'undefined') {
                // 获取正确的API URL
                const correctApiUrl = getCorrectApiUrl();
                
                // 如果使用了错误的域名，则修复它
                if (window.API_BASE_URL.includes('your-subdomain.workers.dev') || 
                    window.API_BASE_URL.includes('ptvalert.pages.dev')) {
                    console.warn('发现错误的API_BASE_URL:', window.API_BASE_URL);
                    // 保存原始URL以便报告
                    const originalUrl = window.API_BASE_URL;
                    // 设置为正确的URL
                    window.API_BASE_URL = correctApiUrl;
                    console.warn('已修复为:', window.API_BASE_URL);
                    
                    // 更新推送配置
                    if (typeof window.PUSH_CONFIG !== 'undefined') {
                        window.PUSH_CONFIG.SERVER_URL = window.API_BASE_URL;
                        console.log('已同步更新PUSH_CONFIG.SERVER_URL');
                    }
                    
                    return true;
                } else {
                    console.log('API_BASE_URL配置正确:', window.API_BASE_URL);
                    return false;
                }
            } else {
                // 如果API_BASE_URL不存在，创建一个
                const correctApiUrl = getCorrectApiUrl();
                window.API_BASE_URL = correctApiUrl;
                console.log('已创建API_BASE_URL:', window.API_BASE_URL);
                return true;
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
                
                // 从URL提取仓库名
                const getRepoName = function() {
                    const pathSegments = window.location.pathname.split('/');
                    if (pathSegments.length >= 2 && pathSegments[1]) {
                        return pathSegments[1];
                    }
                    return ''; // 如果无法确定仓库名，返回空字符串
                };
                
                const repoName = getRepoName();
                console.log('GitHub Pages仓库名:', repoName || '(未检测到)');
                
                // 添加补丁脚本
                const script = document.createElement('script');
                script.textContent = `
                    // 修复GitHub Pages上的Service Worker注册
                    if ('serviceWorker' in navigator) {
                        // 当前路径
                        const currentLoc = window.location.href;
                        console.log('当前页面URL:', currentLoc);
                        
                        // 覆盖原始的serviceWorker.register方法
                        const originalRegister = navigator.serviceWorker.register;
                        navigator.serviceWorker.register = function(scriptURL, options) {
                            console.log('拦截Service Worker注册请求，原始路径:', scriptURL);
                            
                            // 尝试直接使用当前目录的service-worker.js
                            let fixedScriptURL = './service-worker.js';
                            let fixedOptions = options || {};
                            fixedOptions.scope = './';
                            
                            console.log('将使用简单相对路径:', fixedScriptURL, '作用域:', fixedOptions.scope);
                            
                            // 创建带回退的注册函数
                            const registerWithFallback = async function() {
                                try {
                                    console.log('尝试注册Service Worker:', fixedScriptURL);
                                    return await originalRegister.call(navigator.serviceWorker, fixedScriptURL, fixedOptions);
                                } catch (mainError) {
                                    console.error('主Service Worker注册失败，尝试备用方案:', mainError);
                                    
                                    try {
                                        // 尝试备用Service Worker
                                        console.log('尝试注册备用Service Worker');
                                        const fallbackReg = await originalRegister.call(
                                            navigator.serviceWorker, 
                                            './fallback-service-worker.js', 
                                            {scope: './'}
                                        );
                                        console.log('备用Service Worker注册成功');
                                        return fallbackReg;
                                    } catch (fallbackError) {
                                        console.error('备用Service Worker注册失败，尝试内联方案:', fallbackError);
                                        
                                        // 创建内联的最小Service Worker
                                        try {
                                            const minimalSW = \`
                                                // 最小Service Worker
                                                self.addEventListener('install', () => self.skipWaiting());
                                                self.addEventListener('activate', event => event.waitUntil(clients.claim()));
                                                self.addEventListener('fetch', event => event.respondWith(fetch(event.request)));
                                                console.log('内联最小Service Worker已激活');
                                            \`;
                                            
                                            const blob = new Blob([minimalSW], {type: 'application/javascript'});
                                            const blobURL = URL.createObjectURL(blob);
                                            
                                            const inlineReg = await originalRegister.call(
                                                navigator.serviceWorker, 
                                                blobURL, 
                                                {scope: './'}
                                            );
                                            console.log('内联Service Worker注册成功');
                                            return inlineReg;
                                        } catch (inlineError) {
                                            console.error('所有Service Worker注册方法均失败:', inlineError);
                                            throw inlineError;
                                        }
                                    }
                                }
                            };
                            
                            // 返回带回退的注册Promise
                            return registerWithFallback();
                        };
                        
                        console.log('已替换Service Worker注册函数');
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
            // 检查是否已修补，避免重复修补
            if (window._urlFixErrorPatched) {
                return;
            }
            window._urlFixErrorPatched = true;
            
            // 保存原始console.error引用
            const oldConsoleError = console.error;
            
            // 替换console.error，但确保安全处理
            console.error = function() {
                try {
                    const args = Array.from(arguments);
                    let errorText = '';
                    
                    // 安全地构建错误文本
                    try {
                        errorText = args.map(arg => 
                            typeof arg === 'string' ? arg : 
                            (arg && typeof arg.toString === 'function' ? arg.toString() : String(arg))
                        ).join(' ');
                    } catch (textError) {
                        errorText = '[无法转换错误消息]';
                    }
                    
                    // 检查是否包含"未知错误"，如果是则不处理
                    if (errorText.includes('未知错误') || errorText.includes('unknown error')) {
                        // 不处理这些错误，仅记录
                        console.log('[URL Fix] 跳过已知错误模式:', errorText.substring(0, 50) + '...');
                        return;
                    }
                    
                    // 检查是否有错误URL
                    if (errorText.includes('your-subdomain.workers.dev')) {
                        console.log('[URL Fix] 在错误中检测到错误域名，修复中...');
                        fixApiBaseUrl();
                        return; // 不继续传播错误
                    }
                    
                    // 检查是否有404错误
                    if (errorText.includes('404') && errorText.includes('service-worker.js')) {
                        console.log('[URL Fix] 检测到Service Worker 404错误，修复中...');
                        fixServiceWorkerPath();
                        return; // 不继续传播错误
                    }
                    
                    // 检查DNS解析错误
                    if (errorText.includes('ERR_NAME_NOT_RESOLVED') && errorText.includes('ptvalert.pages.dev')) {
                        console.log('[URL Fix] 检测到API域名DNS解析错误!');
                        checkApiServer();
                        return; // 不继续传播错误
                    }
                    
                    // 对于其他错误，调用原始的console.error
                    oldConsoleError.apply(console, args);
                } catch (handlerError) {
                    // 确保错误处理器本身不会出错
                    try {
                        oldConsoleError.call(console, '[URL Fix] 错误处理中出错:', handlerError);
                    } catch (finalError) {
                        // 最后一道防线
                    }
                }
            };
            console.log('已设置安全的URL错误监听器');
        } catch (e) {
            // 不使用console.error，以避免潜在的循环
            console.log('[URL Fix] 设置错误监听器失败:', e);
        }
    }
    
    // 检查Google Maps API密钥
    function checkAndUpdateMapsApiKey() {
        // 首先检查是否已有我们的域名密钥管理器设置的API密钥
        if (window.MAPS_API_KEY_FOR_DOMAIN) {
            console.log('已检测到通过域名密钥管理器设置的API密钥');
            return;
        }
        
        // 检查GitHub Pages环境
        if (window.location.hostname.includes('github.io')) {
            console.log('检测到GitHub Pages环境，使用专用API密钥');
            // 为GitHub Pages设置专用API密钥
            window.GOOGLE_MAPS_API_KEY = 'AIzaSyBSOYTUZ1MIc_TisEGTubKH6815WLIXbFM';
            
            // 触发API加载事件，使用新的API密钥
            setTimeout(function() {
                if (typeof document.dispatchEvent === 'function') {
                    console.log('通过url-fix触发API加载请求');
                    document.dispatchEvent(new CustomEvent('request_google_maps_api'));
                }
            }, 1000);
        }
    }
    
    // 初始化
    async function initialize() {
        try {
            console.log('初始化URL修复...');
            
            // 修复API基础URL
            fixApiBaseUrl();
            
            // 检查并修复API密钥
            checkAndUpdateMapsApiKey();
            
            // 如果是GitHub Pages，修复Service Worker路径
            if (window.location.hostname.includes('github.io')) {
                fixServiceWorkerPath();
            }
            
            // 建立错误监听器
            setupErrorListener();
        } catch (e) {
            console.error('初始化URL修复失败:', e);
        }
    }
    
    // 启动初始化
    initialize();
})(); 