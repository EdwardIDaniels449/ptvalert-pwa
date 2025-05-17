/**
 * 离线状态处理脚本
 * 在网络不可用时提供友好提示
 */

(function() {
    console.log('[离线处理] 初始化...');
    
    var isOffline = !navigator.onLine;
    var offlineNotice = null;
    
    // 在页面加载时检查离线状态
    window.addEventListener('load', function() {
        checkOfflineStatus();
    });
    
    // 监听网络状态变化
    window.addEventListener('online', function() {
        console.log('[离线处理] 网络已连接');
        isOffline = false;
        removeOfflineNotice();
    });
    
    window.addEventListener('offline', function() {
        console.log('[离线处理] 网络已断开');
        isOffline = true;
        showOfflineNotice();
    });
    
    // 检查当前离线状态
    function checkOfflineStatus() {
        if (!navigator.onLine) {
            console.log('[离线处理] 检测到离线状态');
            showOfflineNotice();
        } else {
            console.log('[离线处理] 检测到在线状态');
        }
    }
    
    // 显示离线通知
    function showOfflineNotice() {
        // 如果已经有通知，不再显示
        if (offlineNotice) return;
        
        // 创建离线通知元素
        offlineNotice = document.createElement('div');
        offlineNotice.id = 'offline-notice';
        offlineNotice.style.cssText = [
            'position: fixed',
            'bottom: 20px',
            'left: 50%',
            'transform: translateX(-50%)',
            'background-color: rgba(0, 0, 0, 0.8)',
            'color: white',
            'padding: 10px 15px',
            'border-radius: 8px',
            'font-size: 14px',
            'z-index: 10000',
            'text-align: center',
            'display: flex',
            'align-items: center',
            'max-width: 90%',
            'box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3)'
        ].join(';');
        
        // 添加图标和文字
        offlineNotice.innerHTML = [
            '<span style="margin-right:8px;font-size:18px;">📶</span>',
            '<span>您当前处于离线状态，部分功能可能不可用</span>'
        ].join('');
        
        // 添加到文档
        document.body.appendChild(offlineNotice);
        
        // 添加动画效果
        setTimeout(function() {
            if (offlineNotice) {
                offlineNotice.style.transition = 'opacity 0.3s, transform 0.3s';
                offlineNotice.style.opacity = '1';
                offlineNotice.style.transform = 'translateX(-50%) translateY(0)';
            }
        }, 10);
    }
    
    // 移除离线通知
    function removeOfflineNotice() {
        if (!offlineNotice) return;
        
        // 添加淡出动画
        offlineNotice.style.opacity = '0';
        offlineNotice.style.transform = 'translateX(-50%) translateY(20px)';
        
        // 动画结束后移除元素
        setTimeout(function() {
            if (offlineNotice && offlineNotice.parentNode) {
                offlineNotice.parentNode.removeChild(offlineNotice);
                offlineNotice = null;
            }
        }, 300);
    }
    
    // 自动重试加载失败的图像
    function setupImageErrorHandling() {
        // 在文档加载完成后执行
        window.addEventListener('load', function() {
            // 找到所有图像
            var images = document.querySelectorAll('img');
            
            // 为每个图像添加错误处理
            images.forEach(function(img) {
                img.addEventListener('error', function() {
                    // 图像加载失败，可能是离线状态
                    console.log('[离线处理] 图像加载失败:', img.src);
                    
                    // 记录原始图像路径
                    var originalSrc = img.src;
                    
                    // 如果联网，尝试重新加载
                    if (navigator.onLine) {
                        // 清除src并重新设置，强制重新加载
                        setTimeout(function() {
                            img.src = '';
                            setTimeout(function() {
                                img.src = originalSrc;
                            }, 100);
                        }, 1000);
                    }
                });
            });
        });
    }
    
    // 设置JS错误处理
    function setupJsErrorHandling() {
        window.addEventListener('error', function(event) {
            console.error('[离线处理] JS错误:', event.message);
            
            // 检查是否是资源加载错误
            if (event.target && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
                console.log('[离线处理] 资源加载失败:', event.target.src || event.target.href);
                
                // 如果离线，显示通知
                if (!navigator.onLine && !isOffline) {
                    isOffline = true;
                    showOfflineNotice();
                }
            }
        }, true); // 使用捕获模式
    }
    
    // 初始化
    function init() {
        // 设置图像错误处理
        setupImageErrorHandling();
        
        // 设置JS错误处理
        setupJsErrorHandling();
        
        // 检查初始离线状态
        setTimeout(checkOfflineStatus, 1000);
    }
    
    // 执行初始化
    init();
    
    console.log('[离线处理] 初始化完成');
})(); 