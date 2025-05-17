/**
 * Map Fix Script (v2.0.0)
 * 兼容层 - 将调用重定向到map-integration.js
 * 解决Google Maps加载和交互问题
 */

(function() {
    console.log('[Map Fix] 兼容层已加载 v2.0.0 - 重定向到map-integration.js');
    
    // 记录页面状态
    console.log('[Map Fix] 页面加载状态:', document.readyState);
    
    // 检查MAP_INTEGRATION是否存在
    document.addEventListener('DOMContentLoaded', function() {
        // 如果没有加载map-integration.js，则加载它
        if (!window.MapIntegration) {
            console.log('[Map Fix] 未检测到MapIntegration，加载集成脚本...');
            
            const script = document.createElement('script');
            script.src = './js/map-integration.js?v=1.0.0_nocache';
            script.onload = function() {
                console.log('[Map Fix] 地图集成脚本已加载');
            };
            script.onerror = function() {
                console.error('[Map Fix] 地图集成脚本加载失败');
            };
            document.head.appendChild(script);
        } else {
            console.log('[Map Fix] 检测到MapIntegration已加载');
        }
    });
    
    // 兼容旧版API
    window.MapFix = {
        checkMapStatus: function() {
            console.log('[Map Fix] 兼容层: checkMapStatus() 被调用');
            if (window.MapIntegration) {
                return window.MapIntegration.initialize();
            }
        },
        loadMarkersFromStorage: function() {
            console.log('[Map Fix] 兼容层: loadMarkersFromStorage() 被调用');
            if (window.MapIntegration) {
                return window.MapIntegration.loadMarkersFromStorage();
            }
        },
        createBackupMap: function() {
            console.log('[Map Fix] 兼容层: createBackupMap() 被调用');
            if (window.MapIntegration) {
                return window.MapIntegration.initialize();
            }
        },
        preloadMarkerData: function() {
            console.log('[Map Fix] 兼容层: preloadMarkerData() 被调用');
            // 这个函数不需要实现，新的集成脚本会处理
        },
        forceLoadGoogleMapsAPI: function() {
            console.log('[Map Fix] 兼容层: forceLoadGoogleMapsAPI() 被调用');
            if (window.MapIntegration) {
                return window.MapIntegration.loadAPI();
            }
        }
    };
})(); 