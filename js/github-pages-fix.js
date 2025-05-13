/**
 * GitHub Pages 专用修复脚本
 * 用于解决GitHub Pages环境下的路径和服务工作线程问题
 */

(function() {
    console.log('GitHub Pages 修复脚本已加载');
    
    // 检测是否在GitHub Pages环境中
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (!isGitHubPages) {
        console.log('非GitHub Pages环境，不执行修复');
        return;
    }
    
    console.log('检测到GitHub Pages环境，应用修复...');
    
    // 获取正确的基础路径 - 考虑项目名称
    function getBasePath() {
        // 从URL中提取仓库名称
        const pathSegments = window.location.pathname.split('/');
        console.log('URL路径段:', pathSegments);
        
        if (pathSegments.length >= 2 && pathSegments[1]) {
            // 这种情况是项目页面 (username.github.io/repo-name)
            console.log('检测到仓库名:', pathSegments[1]);
            return '/' + pathSegments[1] + '/';
        }
        
        // 这种情况是用户页面 (username.github.io)
        console.log('未检测到仓库名，使用根路径');
        return '/';
    }
    
    const basePath = getBasePath();
    console.log('GitHub Pages 基础路径:', basePath);
    
    // 全局存储基础路径供其他脚本使用
    window.GITHUB_PAGES_BASE_PATH = basePath;
    
    // 修复API路径
    if (typeof window.API_BASE_URL !== 'undefined') {
        console.log('原始API_BASE_URL:', window.API_BASE_URL);
        
        // 修复错误的API_BASE_URL
        if (window.API_BASE_URL.includes('your-subdomain.workers.dev') || 
            window.API_BASE_URL.includes('ptvalert.pages.dev')) {
            // 使用当前GitHub Pages域名
            window.API_BASE_URL = 'https://' + window.location.hostname;
            console.log('已修复API_BASE_URL:', window.API_BASE_URL);
        }
    } else {
        // 如果API_BASE_URL未定义，创建一个
        window.API_BASE_URL = 'https://' + window.location.hostname;
        console.log('已创建API_BASE_URL:', window.API_BASE_URL);
    }
    
    // 修复Push Config变量
    if (typeof window.PUSH_CONFIG !== 'undefined') {
        console.log('修复PUSH_CONFIG.SERVER_URL');
        window.PUSH_CONFIG.SERVER_URL = window.API_BASE_URL;
        
        // 修正Service Worker路径
        if (window.PUSH_CONFIG.SERVICE_WORKER_PATH) {
            // 确保路径正确
            window.PUSH_CONFIG.SERVICE_WORKER_PATH = '/service-worker.js';
        }
    }
    
    // 确保service-worker.js文件可用
    function createServiceWorkerBlob() {
        const swContent = `
        // 临时Service Worker内容 - 由GitHub Pages修复脚本生成
        // 这是一个兜底方案，用于在找不到原始Service Worker时提供基本功能
        
        self.addEventListener('install', event => {
            console.log('[临时Service Worker] 安装');
            self.skipWaiting();
        });
        
        self.addEventListener('activate', event => {
            console.log('[临时Service Worker] 激活');
            self.clients.claim();
        });
        
        self.addEventListener('fetch', event => {
            // 简单的fetch处理
            event.respondWith(fetch(event.request));
        });
        
        console.log('[临时Service Worker] 已加载 - 由GitHub Pages修复脚本提供');
        `;
        
        const blob = new Blob([swContent], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }
    
    // 修复Service Worker注册
    if ('serviceWorker' in navigator) {
        // 保存原始注册方法
        const originalRegister = navigator.serviceWorker.register;
        
        // 重写注册方法
        navigator.serviceWorker.register = function(scriptURL, options) {
            console.log('拦截Service Worker注册，原始URL:', scriptURL);
            
            // 使用绝对URL路径
            const fullURL = 'https://' + window.location.hostname + '/service-worker.js';
            console.log('修改为绝对URL:', fullURL);
            
            // 修复作用域
            let fixedOptions = { ...options };
            if (!fixedOptions.scope || fixedOptions.scope === '/' || fixedOptions.scope === './') {
                fixedOptions.scope = '/';
                console.log('修复作用域为根路径:', fixedOptions.scope);
            }
            
            // 调用原始注册方法
            return originalRegister.call(this, fullURL, fixedOptions)
                .catch(error => {
                    console.error('Service Worker注册失败:', error);
                    
                    // 如果失败，尝试使用相对路径
                    console.log('尝试使用相对路径');
                    return originalRegister.call(this, './service-worker.js', { scope: './' })
                        .catch(secondError => {
                            console.error('第二次尝试注册Service Worker失败:', secondError);
                            
                            // 尝试使用Blob URL作为最后的修复方案
                            console.log('尝试使用动态生成的Service Worker');
                            const blobURL = createServiceWorkerBlob();
                            return originalRegister.call(this, blobURL, { scope: './' })
                                .catch(finalError => {
                                    console.error('所有尝试都失败:', finalError);
                                    alert('Service Worker注册失败。请尝试清除浏览器缓存后重试。');
                                    return Promise.reject(finalError);
                                });
                        });
                });
        };
        
        console.log('已修复Service Worker注册方法');
    }
    
    // 修复缓存匹配
    if ('caches' in window) {
        const originalMatch = caches.match;
        
        caches.match = function(request, options) {
            let fixedRequest = request;
            
            if (typeof request === 'string') {
                // 修复请求URL的路径
                if (request.startsWith('./')) {
                    fixedRequest = basePath + request.substring(2);
                } else if (request.startsWith('/') && !request.startsWith('//')) {
                    fixedRequest = basePath + request.substring(1);
                }
                console.log('缓存匹配请求修复:', request, '->', fixedRequest);
            }
            
            return originalMatch.call(this, fixedRequest, options);
        };
        
        console.log('已修复缓存匹配方法');
    }
    
    // 添加GitHub Pages环境标记
    window.IS_GITHUB_PAGES = true;
    
    console.log('GitHub Pages 修复完成');
    
    // 创建一个banner提示用户
    function showGitHubPagesNotice() {
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.bottom = '10px';
        banner.style.left = '10px';
        banner.style.backgroundColor = 'rgba(60, 60, 60, 0.8)';
        banner.style.color = 'white';
        banner.style.padding = '8px 12px';
        banner.style.borderRadius = '4px';
        banner.style.fontSize = '12px';
        banner.style.zIndex = '9999';
        banner.style.maxWidth = '300px';
        banner.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        banner.innerText = '当前使用GitHub Pages预览版，部分功能可能受限';
        
        // 添加关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.innerText = '×';
        closeBtn.style.marginLeft = '10px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '14px';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.onclick = function() {
            banner.remove();
        };
        
        banner.appendChild(closeBtn);
        
        // 延迟添加到页面，确保DOM已经加载
        setTimeout(() => {
            document.body.appendChild(banner);
        }, 2000);
    }
    
    // 页面加载后显示通知
    if (document.readyState === 'complete') {
        showGitHubPagesNotice();
    } else {
        window.addEventListener('load', showGitHubPagesNotice);
    }
})(); 