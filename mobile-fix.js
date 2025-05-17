/**
 * 移动端加载问题诊断和修复工具
 * 将此脚本放在<head>开头位置加载
 */

(function() {
    console.log('[移动修复] 诊断开始...');
    
    // 防止加载超时
    var pageLoadTimeout = setTimeout(function() {
        showErrorMessage('页面加载超时，正在尝试修复...');
        fixCommonIssues();
    }, 5000);
    
    // 页面加载完成时清除超时
    window.addEventListener('load', function() {
        clearTimeout(pageLoadTimeout);
        console.log('[移动修复] 页面已成功加载');
        logDeviceInfo();
    });
    
    // 捕获全局错误
    window.addEventListener('error', function(event) {
        console.error('[移动修复] 捕获到错误:', event.message);
        // 记录错误但不阻止正常流程
        logError(event);
    });
    
    // 卸载所有Service Worker
    function unregisterServiceWorkers() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations()
                .then(function(registrations) {
                    for (let registration of registrations) {
                        registration.unregister();
                        console.log('[移动修复] Service Worker已卸载:', registration.scope);
                    }
                    // 刷新页面
                    setTimeout(function() {
                        window.location.reload();
                    }, 1000);
                })
                .catch(function(error) {
                    console.error('[移动修复] 卸载Service Worker失败:', error);
                });
        }
    }
    
    // 修复路径问题
    function fixPathIssues() {
        // 检测是否在GitHub Pages环境
        var isGithubPages = window.location.hostname.includes('github.io');
        var basePath = './';
        
        if (isGithubPages) {
            var pathSegments = window.location.pathname.split('/');
            if (pathSegments.length >= 2 && pathSegments[1]) {
                var repoName = pathSegments[1];
                basePath = '/' + repoName + '/';
                console.log('[移动修复] 检测到GitHub Pages环境，基础路径:', basePath);
                
                // 修复所有相对路径
                fixAllResourcePaths(basePath);
            }
        }
    }
    
    // 修复所有资源路径
    function fixAllResourcePaths(basePath) {
        try {
            // 修复脚本路径
            document.querySelectorAll('script[src]').forEach(function(script) {
                fixElementPath(script, 'src', basePath);
            });
            
            // 修复样式表路径
            document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link) {
                fixElementPath(link, 'href', basePath);
            });
            
            // 修复图标路径
            document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]').forEach(function(link) {
                fixElementPath(link, 'href', basePath);
            });
            
            console.log('[移动修复] 资源路径修复完成');
        } catch (error) {
            console.error('[移动修复] 修复资源路径时出错:', error);
        }
    }
    
    // 修复元素路径
    function fixElementPath(element, attribute, basePath) {
        var path = element.getAttribute(attribute);
        if (!path) return;
        
        // 忽略已经是绝对URL的路径
        if (path.startsWith('http://') || path.startsWith('https://')) return;
        
        // 修正相对路径
        if (path.startsWith('./')) {
            element.setAttribute(attribute, basePath + path.substring(2));
            console.log('[移动修复] 修复路径:', path, '->', basePath + path.substring(2));
        } else if (!path.startsWith('/')) {
            element.setAttribute(attribute, basePath + path);
            console.log('[移动修复] 修复路径:', path, '->', basePath + path);
        }
    }
    
    // 显示错误消息
    function showErrorMessage(message) {
        var errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '30%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.background = 'rgba(0,0,0,0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '15px 20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.zIndex = '10000';
        errorDiv.style.maxWidth = '80%';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.fontSize = '14px';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // 3秒后自动移除
        setTimeout(function() {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    // 记录设备信息
    function logDeviceInfo() {
        console.log('[移动修复] 设备信息:');
        console.log('- 用户代理:', navigator.userAgent);
        console.log('- 屏幕尺寸:', window.screen.width, 'x', window.screen.height);
        console.log('- 设备像素比:', window.devicePixelRatio);
        console.log('- 视窗尺寸:', window.innerWidth, 'x', window.innerHeight);
        console.log('- 在线状态:', navigator.onLine);
        
        // 显示浏览器版本
        var browserInfo = getBrowserInfo();
        console.log('- 浏览器:', browserInfo.name, browserInfo.version);
    }
    
    // 获取浏览器信息
    function getBrowserInfo() {
        var ua = navigator.userAgent;
        var name = "未知";
        var version = "未知";
        
        if (ua.indexOf("Safari") != -1 && ua.indexOf("Chrome") == -1) {
            name = "Safari";
            version = ua.match(/Version\/([\d.]+)/)[1];
        } else if (ua.indexOf("Chrome") != -1) {
            name = "Chrome";
            version = ua.match(/Chrome\/([\d.]+)/)[1];
        } else if (ua.indexOf("Firefox") != -1) {
            name = "Firefox";
            version = ua.match(/Firefox\/([\d.]+)/)[1];
        }
        
        return { name: name, version: version };
    }
    
    // 记录错误信息
    function logError(event) {
        // 在这里可以添加错误上报逻辑
        console.error('[移动修复] 错误详情:');
        console.error('- 消息:', event.message);
        console.error('- 文件:', event.filename);
        console.error('- 行号:', event.lineno);
        console.error('- 列号:', event.colno);
    }
    
    // 修复常见问题
    function fixCommonIssues() {
        console.log('[移动修复] 开始修复常见问题...');
        
        // 1. 修复路径问题
        fixPathIssues();
        
        // 2. 卸载Service Worker
        unregisterServiceWorkers();
    }
    
    // 执行立即诊断
    setTimeout(function() {
        console.log('[移动修复] 立即诊断执行中...');
        
        // 检查移动端特有问题
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            console.log('[移动修复] 检测到移动设备，进行专项检查');
            
            // iOS Safari 特有问题检查
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)) {
                console.log('[移动修复] 检测到 iOS Safari，进行iOS专项检查');
                
                // 拦截可能的白屏错误
                if (document.body && document.body.children.length === 0) {
                    console.log('[移动修复] 可能存在白屏问题，尝试修复');
                    fixCommonIssues();
                }
            }
        }
    }, 1000);
    
    console.log('[移动修复] 诊断脚本已加载');
})(); 