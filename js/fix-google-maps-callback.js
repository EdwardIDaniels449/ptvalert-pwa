/**
 * Google Maps API回调修复
 * 确保即使地图API加载失败，应用也能继续运行
 */

(function() {
    console.log('[回调修复] 加载Google Maps回调修复模块');
    
    // 保存原始的回调函数
    const originalCallback = window.googleMapsLoadedCallback;
    
    // 设置超时时间
    const CALLBACK_TIMEOUT = 8000; // 8秒
    
    // 替换回调函数
    window.googleMapsLoadedCallback = function() {
        console.log('[回调修复] Google Maps回调函数已触发');
        
        try {
            // 尝试调用原始回调函数
            if (typeof originalCallback === 'function') {
                originalCallback();
            }
        } catch (error) {
            console.error('[回调修复] 原始回调函数执行失败:', error);
            
            // 确保至少运行基本的初始化
            ensureBasicInitialization();
        }
    };
    
    // 设置超时处理器
    setTimeout(function() {
        // 检查Google Maps API是否已加载
        if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
            console.warn('[回调修复] Google Maps API未在超时时间内加载，触发备用初始化');
            
            // 如果回调未被调用，强制执行基本初始化
            ensureBasicInitialization();
        }
    }, CALLBACK_TIMEOUT);
    
    // 确保基本初始化完成
    function ensureBasicInitialization() {
        // 检查地图是否已初始化
        if (!window.mapsInitialized) {
            console.log('[回调修复] 尝试加载应急地图模块');
            
            // 加载应急地图模块
            loadEmergencyMapFix();
        }
    }
    
    // 加载应急地图修复模块
    function loadEmergencyMapFix() {
        try {
            // 先检查是否已经加载
            if (document.querySelector('script[src*="emergency-map-fix.js"]')) {
                console.log('[回调修复] 应急地图修复模块已加载');
                return;
            }
            
            // 创建脚本元素
            const script = document.createElement('script');
            script.src = './js/emergency-map-fix.js';
            script.async = true;
            
            // 添加加载失败处理
            script.onerror = function() {
                console.error('[回调修复] 加载应急地图修复模块失败');
                // 尝试使用内联备用方案
                createInlineEmergencyFallback();
            };
            
            // 添加到文档
            document.body.appendChild(script);
            console.log('[回调修复] 已添加应急地图修复模块脚本');
        } catch (error) {
            console.error('[回调修复] 加载应急地图修复模块出错:', error);
            // 尝试使用内联备用方案
            createInlineEmergencyFallback();
        }
    }
    
    // 创建内联的应急备用方案
    function createInlineEmergencyFallback() {
        console.log('[回调修复] 创建内联应急备用方案');
        
        // 创建基本的备用方案
        window.google = window.google || {};
        window.google.maps = window.google.maps || {};
        
        // 定义墨尔本中心坐标
        const MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
        window.MELBOURNE_CENTER = MELBOURNE_CENTER;
        
        // 创建一个最小化的地图对象
        window.map = {
            getCenter: function() {
                return {
                    lat: function() { return MELBOURNE_CENTER.lat; },
                    lng: function() { return MELBOURNE_CENTER.lng; }
                };
            },
            setCenter: function() { return this; },
            addListener: function() { return { remove: function() {} }; },
            getZoom: function() { return 13; },
            setZoom: function() { return this; }
        };
        
        // 标记初始化完成
        window.mapsInitialized = true;
        
        // 显示离线模式提示
        const noticeDiv = document.createElement('div');
        noticeDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background-color:rgba(0,0,0,0.7);color:white;text-align:center;padding:10px;z-index:9999;';
        noticeDiv.textContent = '地图加载失败，应用运行在受限模式';
        document.body.appendChild(noticeDiv);
        
        // 10秒后隐藏提示
        setTimeout(function() {
            noticeDiv.style.opacity = '0';
            noticeDiv.style.transition = 'opacity 1s ease';
            setTimeout(function() {
                noticeDiv.remove();
            }, 1000);
        }, 10000);
        
        // 调用回调函数
        if (window.mapReadyCallbacks && window.mapReadyCallbacks.length) {
            console.log('[回调修复] 执行地图就绪回调函数');
            window.mapReadyCallbacks.forEach(function(callback) {
                try {
                    callback();
                } catch (error) {
                    console.error('[回调修复] 执行回调函数时出错:', error);
                }
            });
        }
        
        console.log('[回调修复] 内联应急备用方案设置完成');
    }
    
    console.log('[回调修复] Google Maps回调修复模块加载完成');
})(); 