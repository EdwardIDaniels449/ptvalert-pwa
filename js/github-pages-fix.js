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
        if (pathSegments.length >= 2 && pathSegments[1]) {
            // 这种情况是项目页面 (username.github.io/repo-name)
            return '/' + pathSegments[1] + '/';
        }
        // 这种情况是用户页面 (username.github.io)
        return '/';
    }
    
    const basePath = getBasePath();
    console.log('GitHub Pages 基础路径:', basePath);
    
    // 修复API路径
    if (typeof API_BASE_URL !== 'undefined') {
        console.log('原始API_BASE_URL:', API_BASE_URL);
        
        // 如果API路径指向本地，需要修复
        if (API_BASE_URL.startsWith('/') || API_BASE_URL === 'https://ptvalert.pages.dev') {
            // 针对GitHub Pages环境，使用Cloudflare Workers或其他外部API
            API_BASE_URL = 'https://ptvalert.pages.dev';
            console.log('已修复API_BASE_URL:', API_BASE_URL);
        }
    } else {
        console.log('未找到API_BASE_URL变量');
    }
    
    // 修复Service Worker注册
    if ('serviceWorker' in navigator) {
        // 保存原始注册方法
        const originalRegister = navigator.serviceWorker.register;
        
        // 重写注册方法
        navigator.serviceWorker.register = function(scriptURL, options) {
            console.log('拦截Service Worker注册，原始URL:', scriptURL);
            
            // 修复Service Worker脚本URL
            let fixedScriptURL = scriptURL;
            
            // 如果是相对路径，加上基础路径
            if (scriptURL.startsWith('./')) {
                fixedScriptURL = basePath + scriptURL.substring(2);
            } 
            // 如果是绝对路径但不是完整URL
            else if (scriptURL.startsWith('/') && !scriptURL.startsWith('//')) {
                fixedScriptURL = basePath + scriptURL.substring(1);
            }
            
            console.log('修复后的Service Worker URL:', fixedScriptURL);
            
            // 修复作用域
            let fixedOptions = { ...options };
            if (!fixedOptions.scope || fixedOptions.scope === '/' || fixedOptions.scope === './') {
                fixedOptions.scope = basePath;
                console.log('修复作用域为:', fixedOptions.scope);
            }
            
            // 调用原始注册方法
            return originalRegister.call(this, fixedScriptURL, fixedOptions)
                .catch(error => {
                    console.error('Service Worker注册失败:', error);
                    // 如果失败，尝试使用完整的绝对URL
                    const fullURL = new URL(scriptURL, window.location.origin).href;
                    console.log('尝试使用完整URL:', fullURL);
                    return originalRegister.call(this, fullURL, fixedOptions);
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
    window.GITHUB_PAGES_BASE_PATH = basePath;
    
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