/**
 * 移动端内存清理工具
 * 定期清理内存，解决移动设备上的内存泄漏问题
 */

(function() {
    'use strict';
    
    // 移动设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 如果不是移动设备，退出
    if (!isMobile) {
        console.log('[Memory Cleaner] 检测到桌面设备，跳过内存清理');
        return;
    }
    
    console.log('[Memory Cleaner] 初始化移动端内存清理工具');
    
    // 配置
    const CLEAN_INTERVAL = 40000;      // 清理间隔（毫秒）
    const ERROR_OBJECTS_CLEANUP = true; // 清理错误对象
    const CLEAR_LOCAL_STORAGE = false;  // 清理本地存储（仅在极端情况下启用）
    
    // 已知的可能泄漏内存的全局对象
    const POTENTIAL_LEAK_OBJECTS = [
        '_pendingSaveTimeout',
        '_markersUpdateTimeout',
        'openedInfoWindow',
        '_undefinedFixConsolePatched',
        '_urlFixErrorPatched',
        '_mobileErrorFixApplied',
        '_mobileErrorFixFinalApplied',
        '_specificFixesApplied',
        '_fixesApplied'
    ];
    
    // 启动内存清理
    function setupMemoryCleaning() {
        // 定期清理
        const cleanInterval = setInterval(function() {
            cleanupMemory();
        }, CLEAN_INTERVAL);
        
        // 页面不可见时进行更深层次的清理
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                console.log('[Memory Cleaner] 页面隐藏，执行深度清理');
                cleanupMemory(true);
            }
        });
        
        // 内存压力响应
        if ('memory' in performance) {
            try {
                // 尝试定期检查内存使用情况
                setInterval(function() {
                    if (performance.memory && performance.memory.usedJSHeapSize > 80 * 1024 * 1024) {
                        // 如果内存使用超过80MB，触发紧急清理
                        console.log('[Memory Cleaner] 检测到内存压力，执行紧急清理');
                        cleanupMemory(true);
                    }
                }, 10000);
            } catch (e) {
                console.log('[Memory Cleaner] 内存监控设置失败', e);
            }
        }
    }
    
    // 内存清理函数
    function cleanupMemory(deepClean) {
        console.log('[Memory Cleaner] 执行' + (deepClean ? '深度' : '常规') + '内存清理');
        
        // 清除不再需要的事件监听器
        cleanEventListeners();
        
        // 关闭并清除信息窗口
        closeInfoWindows();
        
        // 清理潜在的内存泄漏对象
        cleanLeakObjects();
        
        // 清理错误对象和控制台
        if (ERROR_OBJECTS_CLEANUP) {
            cleanErrorObjects();
        }
        
        // 在深度清理模式下，执行更激进的清理
        if (deepClean) {
            // 修剪标记数量
            trimMarkers();
            
            // 清除图片缓存
            clearImageCache();
            
            // 在极端情况下清理localStorage
            if (CLEAR_LOCAL_STORAGE) {
                trimLocalStorage();
            }
            
            // 尝试直接触发GC
            if (window.gc) {
                try {
                    window.gc();
                } catch (e) {}
            }
        }
    }
    
    // 清除事件监听器
    function cleanEventListeners() {
        try {
            // 找出可能被过多监听的元素
            const heavyElements = [
                document.body,
                document.getElementById('map'),
                document.getElementById('addReportBtn'),
                document.getElementById('submitReport')
            ];
            
            // 复制和重新创建这些元素可以有效清除所有事件监听器
            // 但这在生产中风险较高，所以我们采用更保守的方法
            
            // 尝试手动清理已知的事件监听器
            if (window._cleanupHandlers && Array.isArray(window._cleanupHandlers)) {
                window._cleanupHandlers.forEach(function(handler) {
                    try {
                        if (typeof handler === 'function') {
                            handler();
                        }
                    } catch (e) {}
                });
            }
        } catch (e) {
            console.log('[Memory Cleaner] 清理事件监听器失败', e);
        }
    }
    
    // 关闭信息窗口
    function closeInfoWindows() {
        try {
            // 关闭任何打开的信息窗口
            if (window.openedInfoWindow) {
                window.openedInfoWindow.close();
                window.openedInfoWindow = null;
            }
            
            // 清除任何可能存在的信息窗口关联
            if (window.markers && Array.isArray(window.markers)) {
                window.markers.forEach(function(marker) {
                    if (marker && marker.infoWindow) {
                        try {
                            marker.infoWindow.close();
                            marker.infoWindow = null;
                        } catch (e) {}
                    }
                });
            }
        } catch (e) {
            console.log('[Memory Cleaner] 关闭信息窗口失败', e);
        }
    }
    
    // 清理潜在的内存泄漏对象
    function cleanLeakObjects() {
        try {
            // 清理已知的潜在泄漏对象
            POTENTIAL_LEAK_OBJECTS.forEach(function(objName) {
                try {
                    if (window[objName]) {
                        // 如果是定时器，清除它
                        if (
                            objName.includes('Timeout') || 
                            objName.includes('Interval') || 
                            objName.includes('Animation')
                        ) {
                            clearTimeout(window[objName]);
                            clearInterval(window[objName]);
                            cancelAnimationFrame(window[objName]);
                        }
                        
                        // 将对象设为null
                        window[objName] = null;
                    }
                } catch (e) {}
            });
            
            // 清理循环引用
            if (window.markers && Array.isArray(window.markers)) {
                window.markers.forEach(function(marker, index) {
                    if (marker) {
                        // 移除循环引用
                        if (marker.map === window.map) {
                            // 地图引用很重要，不要移除
                        } else if (marker.map && marker.map !== window.map) {
                            marker.map = null;
                        }
                        
                        // 清除标记上的额外数据
                        if (marker.reportData && marker.reportData.image) {
                            marker.reportData.image = '';
                        }
                    }
                });
            }
        } catch (e) {
            console.log('[Memory Cleaner] 清理泄漏对象失败', e);
        }
    }
    
    // 清理错误对象和控制台
    function cleanErrorObjects() {
        try {
            // 清除控制台
            if (console && console.clear) {
                console.clear();
            }
            
            // 重置错误拦截计数
            if (window._errorInterceptCount) {
                window._errorInterceptCount = 0;
            }
            
            // 清除已捕获的错误
            if (window._capturedErrors && Array.isArray(window._capturedErrors)) {
                window._capturedErrors = [];
            }
        } catch (e) {}
    }
    
    // 清理裁减标记数量
    function trimMarkers() {
        try {
            if (window.markers && Array.isArray(window.markers) && window.markers.length > 20) {
                console.log(`[Memory Cleaner] 裁减标记数量: ${window.markers.length} -> 20`);
                
                // 移除多余的标记
                const markersToRemove = window.markers.slice(0, window.markers.length - 20);
                markersToRemove.forEach(function(marker) {
                    if (marker && typeof marker.setMap === 'function') {
                        marker.setMap(null);
                    }
                });
                
                // 更新标记数组
                window.markers = window.markers.slice(-20);
                
                // 如果有保存函数，则保存更改
                if (window.MobileLightMarkers && window.MobileLightMarkers.saveMarkers) {
                    window.MobileLightMarkers.saveMarkers();
                } else if (window.saveMarkersToStorage) {
                    window.saveMarkersToStorage();
                }
            }
        } catch (e) {
            console.log('[Memory Cleaner] 裁减标记失败', e);
        }
    }
    
    // 清除图片缓存
    function clearImageCache() {
        try {
            // 清除BASE64图片缓存
            if (window._imageCache) {
                window._imageCache = {};
            }
            
            // 从localStorage中移除图片数据
            if (localStorage.getItem('imageCache')) {
                localStorage.removeItem('imageCache');
            }
            
            // 减少marker中的图片数据
            if (window.markers && Array.isArray(window.markers)) {
                window.markers.forEach(function(marker) {
                    if (marker && marker.reportData && marker.reportData.image) {
                        // 移除图片数据以节省内存
                        marker.reportData.image = '';
                    }
                });
            }
        } catch (e) {
            console.log('[Memory Cleaner] 清除图片缓存失败', e);
        }
    }
    
    // 清理裁减localStorage
    function trimLocalStorage() {
        try {
            // 保存必要的数据
            const savedMarkers = localStorage.getItem('savedMarkers');
            
            // 清除localStorage
            localStorage.clear();
            
            // 恢复必要的数据
            if (savedMarkers) {
                try {
                    // 只保留最新的20个标记
                    const markerData = JSON.parse(savedMarkers);
                    if (Array.isArray(markerData) && markerData.length > 20) {
                        const trimmedData = markerData.slice(-20);
                        localStorage.setItem('savedMarkers', JSON.stringify(trimmedData));
                    } else {
                        localStorage.setItem('savedMarkers', savedMarkers);
                    }
                } catch (e) {
                    // 如果解析失败，恢复原始数据
                    localStorage.setItem('savedMarkers', savedMarkers);
                }
            }
            
            // 保存语言首选项
            const lang = window.currentLang || 'zh';
            localStorage.setItem('preferredLanguage', lang);
            
            console.log('[Memory Cleaner] localStorage已清理并恢复关键数据');
        } catch (e) {
            console.log('[Memory Cleaner] 清理localStorage失败', e);
        }
    }
    
    // 添加特殊错误处理
    function setupErrorCatcher() {
        try {
            // 监听特定的未知错误，防止它导致应用崩溃
            window.addEventListener('error', function(event) {
                // 如果是未知错误，则阻止传播
                if (event && event.message && 
                    (event.message.includes('未知错误') || event.message.includes('unknown error'))) {
                    
                    console.log('[Memory Cleaner] 捕获并抑制未知错误');
                    
                    // 阻止事件传播
                    event.stopPropagation();
                    event.preventDefault();
                    
                    // 执行内存清理
                    cleanupMemory(true);
                    
                    return false;
                }
            }, true);
            
            // 监听未处理的Promise拒绝
            window.addEventListener('unhandledrejection', function(event) {
                console.log('[Memory Cleaner] 捕获未处理的Promise拒绝');
                
                // 执行内存清理
                cleanupMemory(false);
                
                // 阻止事件传播
                event.preventDefault();
                return false;
            });
        } catch (e) {
            console.log('[Memory Cleaner] 设置错误捕获器失败', e);
        }
    }
    
    // 初始化
    setupMemoryCleaning();
    setupErrorCatcher();
    
    // 立即执行一次初始清理
    setTimeout(function() {
        cleanupMemory(false);
    }, 5000);
    
    console.log('[Memory Cleaner] 移动端内存清理工具已初始化完成');
})(); 