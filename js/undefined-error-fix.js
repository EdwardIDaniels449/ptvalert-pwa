/**
 * Undefined错误修复脚本
 * 专门用于捕获和处理undefined错误，防止应用闪退
 */

(function() {
    'use strict';
    
    console.log('[Undefined Fix] 初始化undefined错误修复脚本');
    
    // 防御性定义常用全局变量，确保它们存在
    window.google = window.google || {};
    window.google.maps = window.google.maps || {};
    window.markers = window.markers || [];
    window.allMarkers = window.allMarkers || [];
    window.markerExpirationTime = window.markerExpirationTime || 3 * 60 * 60 * 1000; // 3小时
    
    // 确保MELBOURNE_CENTER存在
    if (!window.MELBOURNE_CENTER) {
        window.MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
        console.log('[Undefined Fix] 创建默认MELBOURNE_CENTER');
    }
    
    // 修复常见的未定义变量错误
    window.addEventListener('load', function() {
        // 安全地执行所有修复
        try {
            // 等待DOM完全加载后检查和修复
            setTimeout(checkAndFixUndefinedErrors, 1000);
        } catch (e) {
            console.error('[Undefined Fix] 初始化错误:', e);
        }
    });
    
    // 主修复函数
    function checkAndFixUndefinedErrors() {
        console.log('[Undefined Fix] 检查和修复undefined错误');
        
        // 修复地图对象
        fixMapObject();
        
        // 修复标记相关对象
        fixMarkerObjects();
        
        // 修复常见全局变量
        fixGlobalVariables();
        
        // 防止未定义的方法调用
        protectUndefinedMethods();
        
        // 监听错误并进行具体修复
        monitorSpecificErrors();
    }
    
    // 修复地图对象
    function fixMapObject() {
        // 检查map对象是否存在
        if (!window.map) {
            console.log('[Undefined Fix] 创建后备地图对象');
            window.map = {
                getCenter: function() {
                    return {
                        lat: function() { return window.MELBOURNE_CENTER.lat; },
                        lng: function() { return window.MELBOURNE_CENTER.lng; }
                    };
                },
                setCenter: function() { return this; },
                addListener: function() { return { remove: function() {} }; },
                getBounds: function() { 
                    return { 
                        contains: function() { return true; },
                        extend: function() { return this; }
                    };
                },
                setOptions: function() { return this; }
            };
        }
        
        // 检查Google Maps对象
        if (!window.google || !window.google.maps) {
            console.log('[Undefined Fix] 创建Google Maps后备对象');
            window.google = window.google || {};
            window.google.maps = window.google.maps || {
                Map: function() { return window.map; },
                Marker: function() { 
                    return {
                        setMap: function() {},
                        getPosition: function() {
                            return {
                                lat: function() { return window.MELBOURNE_CENTER.lat; },
                                lng: function() { return window.MELBOURNE_CENTER.lng; }
                            };
                        }
                    };
                },
                InfoWindow: function() { return { open: function() {} }; },
                LatLng: function(lat, lng) { 
                    return {
                        lat: function() { return lat; }, 
                        lng: function() { return lng; }
                    };
                },
                event: {
                    addListener: function() { return { remove: function() {} }; },
                    addListenerOnce: function() { return { remove: function() {} }; }
                },
                Animation: { DROP: 1, BOUNCE: 2 },
                SymbolPath: { CIRCLE: 0 },
                MapTypeId: { ROADMAP: 'roadmap' }
            };
        }
    }
    
    // 修复标记相关对象
    function fixMarkerObjects() {
        // 确保标记数组存在
        window.markers = window.markers || [];
        window.allMarkers = window.allMarkers || [];
        
        // 添加安全版本的addReportMarker方法
        if (!window.addSafeMarker) {
            window.addSafeMarker = function(position, title, options) {
                try {
                    console.log('[Undefined Fix] 使用安全标记方法');
                    // 简单的标记创建逻辑
                    return new window.google.maps.Marker({
                        position: position,
                        map: window.map,
                        title: title || ''
                    });
                } catch (e) {
                    console.error('[Undefined Fix] 创建标记失败:', e);
                    return null;
                }
            };
        }
        
        // 如果addReportMarker未定义，提供后备实现
        if (typeof window.addReportMarker !== 'function') {
            window.addReportMarker = function(location, description) {
                console.log('[Undefined Fix] 使用后备addReportMarker');
                return window.addSafeMarker(location, description);
            };
        }
    }
    
    // 修复全局变量
    function fixGlobalVariables() {
        // 常见全局变量的默认值
        const defaults = {
            'selectedLocation': window.MELBOURNE_CENTER,
            'currentLang': 'zh',
            'isMobile': /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        };
        
        // 应用默认值
        Object.keys(defaults).forEach(function(key) {
            if (typeof window[key] === 'undefined') {
                window[key] = defaults[key];
                console.log(`[Undefined Fix] 设置默认值 ${key}:`, defaults[key]);
            }
        });
    }
    
    // 保护未定义方法调用
    function protectUndefinedMethods() {
        // 保护常见的地图方法
        const mapMethods = [
            'setMap', 'getPosition', 'setPosition', 'addListener', 
            'open', 'close', 'getCenter', 'setCenter'
        ];
        
        // 遍历所有Google Maps命名空间，为可能未定义的方法添加保护
        if (window.google && window.google.maps) {
            const mapsObjects = [
                window.google.maps,
                window.google.maps.Marker && window.google.maps.Marker.prototype,
                window.google.maps.InfoWindow && window.google.maps.InfoWindow.prototype,
                window.google.maps.Map && window.google.maps.Map.prototype
            ];
            
            mapsObjects.forEach(function(obj) {
                if (!obj) return;
                
                mapMethods.forEach(function(method) {
                    if (obj[method] === undefined) {
                        obj[method] = function() {
                            console.warn(`[Undefined Fix] 调用了未定义的方法 ${method}`);
                            return null;
                        };
                        console.log(`[Undefined Fix] 为 ${method} 方法添加了保护`);
                    }
                });
            });
        }
    }
    
    // 监听和修复特定错误
    function monitorSpecificErrors() {
        // 观察控制台错误，查找特定模式
        const originalConsoleError = console.error;
        console.error = function() {
            // 调用原始方法
            originalConsoleError.apply(console, arguments);
            
            // 检查是否存在特定错误
            try {
                const errorMsg = arguments[0];
                if (typeof errorMsg === 'string') {
                    // 检查常见错误模式
                    if (errorMsg.includes('undefined') || errorMsg.includes('null')) {
                        console.log('[Undefined Fix] 检测到undefined/null错误，尝试修复');
                        // 刷新页面中的变量定义
                        checkAndFixUndefinedErrors();
                    } else if (errorMsg.includes('setMap')) {
                        console.log('[Undefined Fix] 检测到setMap错误，修复标记');
                        fixMarkerObjects();
                    }
                }
            } catch (e) {
                // 沉默处理监控错误
            }
        };
    }
    
    // 初始化
    checkAndFixUndefinedErrors();
    console.log('[Undefined Fix] Undefined错误修复脚本加载完成');
})(); 