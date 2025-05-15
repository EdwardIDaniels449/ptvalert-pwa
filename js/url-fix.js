/**
 * URL修复工具 - 用于解决推送通知中的URL问题
 * 当检测到错误的域名时，动态修复API_BASE_URL
 */

(function() {
    console.log('URL修复工具已加载，正在检查配置...');
    
    // 设置适当的API服务器URL
    function getCorrectApiUrl() {
        // 使用当前主机名
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
            // 检查是否在GitHub Pages环境中
            const isGitHubPages = window.location.hostname.includes('github.io');
            
            // 如果在GitHub Pages环境中，跳过API服务器检查
            if (isGitHubPages) {
                console.log('检测到GitHub Pages环境，跳过API服务器检查');
                return true;
            }
            
            // 获取正确的API URL
            const correctApiUrl = getCorrectApiUrl();
            
            // 使用HEAD请求检查服务器是否可达
            // 使用随机参数防止缓存
            const pingUrl = `${correctApiUrl}/ping?nocache=${Date.now()}`;
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
                
                // 尝试使用当前域名作为API服务器
                if (typeof window.API_BASE_URL !== 'undefined') {
                    const originalUrl = window.API_BASE_URL;
                    window.API_BASE_URL = correctApiUrl;
                    console.log(`API服务器连接失败, 已切换到当前域名: ${window.API_BASE_URL}`);
                }
                
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
        // 检查是否在GitHub Pages环境中
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        // 立即执行GitHub Pages路径修复
        fixServiceWorkerPath();
        
        // 等待页面完全加载
        if (document.readyState === 'complete') {
            console.log('页面已完全加载，开始URL修复');
            await clearServiceWorkerAndCache();
            fixApiBaseUrl();
            
            // 只在非GitHub Pages环境下检查API服务器
            if (!isGitHubPages) {
                await checkApiServer();
            } else {
                console.log('检测到GitHub Pages环境，跳过API服务器检查');
            }
            
            setupErrorListener();
        } else {
            console.log('等待页面加载完成...');
            window.addEventListener('load', async function() {
                console.log('页面已加载，开始URL修复');
                await clearServiceWorkerAndCache();
                fixApiBaseUrl();
                
                // 只在非GitHub Pages环境下检查API服务器
                if (!isGitHubPages) {
                    await checkApiServer();
                } else {
                    console.log('检测到GitHub Pages环境，跳过API服务器检查');
                }
                
                setupErrorListener();
            });
        }
    }
    
    // 启动初始化
    initialize();
})(); 