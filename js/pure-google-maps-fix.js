/**
 * 纯Google Maps修复脚本 v2.1
 * 专注于解决setMap错误，不干扰原始地图加载
 * 使用统一的API加载机制
 */

(function() {
    'use strict';
    
    console.log('[纯Google Maps修复 v2.1] 初始化...');
    
    // 使用对象存储引用，避免常量重新赋值问题
    var originalFunctions = {
        addReportMarker: null
    };
    
    // 地图初始化就绪标志
    var mapReady = false;
    
    // 保存原始函数的初始化操作
    if (window.UIController && window.UIController.addReportMarker) {
        originalFunctions.addReportMarker = window.UIController.addReportMarker;
    }
    
    // 监听DOM加载完成
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[纯Google Maps修复 v2.1] DOM加载完成');
        initMapFix();
    });
    
    // 如果DOM已加载，立即执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('[纯Google Maps修复 v2.1] DOM已加载，立即初始化');
        initMapFix();
    }
    
    // 初始化修复
    function initMapFix() {
        // 监听地图就绪事件
        document.addEventListener('map_ready', onMapReady);
        document.addEventListener('map_initialized', onMapReady);
        
        // 修复标记添加函数
        safelyPatchAddMarkerFunction();
        
        // 确保Google Maps API正确加载
        ensureGoogleMapsLoaded();
        
        // 定期检查地图状态
        setupMapStatusChecks();
    }
    
    // 地图就绪事件处理函数
    function onMapReady() {
        console.log('[纯Google Maps修复 v2.1] 地图就绪事件触发');
        mapReady = true;
        
        // 处理任何待处理的标记
        setTimeout(processPendingMarkers, 1000);
    }
    
    // 安全地修补添加标记函数
    function safelyPatchAddMarkerFunction() {
        if (!window.UIController) {
            console.warn('[纯Google Maps修复 v2.1] UIController不存在，等待创建');
            setTimeout(safelyPatchAddMarkerFunction, 1000);
            return;
        }
        
        console.log('[纯Google Maps修复 v2.1] 修补添加标记函数');
        
        // 保存原始函数，如果还没保存的话
        if (!originalFunctions.addReportMarker && window.UIController.addReportMarker) {
            originalFunctions.addReportMarker = window.UIController.addReportMarker;
        }
        
        // 替换函数
        window.UIController.addReportMarker = function(location, description, reportId, image) {
            // 确保地图就绪
            if (!isMapReady()) {
                console.warn('[纯Google Maps修复 v2.1] 地图未就绪，将标记加入待处理队列');
                
                // 添加到待处理队列
                window.pendingMarkers = window.pendingMarkers || [];
                window.pendingMarkers.push({
                    location: location,
                    description: description,
                    reportId: reportId,
                    image: image
                });
                
                return null;
            }
            
            // 调用原始函数
            try {
                if (originalFunctions.addReportMarker) {
                    return originalFunctions.addReportMarker(location, description, reportId, image);
                } else {
                    console.warn('[纯Google Maps修复 v2.1] 未找到原始的addReportMarker函数');
                    return createBasicMarker(location, description);
                }
            } catch (e) {
                console.error('[纯Google Maps修复 v2.1] 添加标记时出错:', e);
                return createBasicMarker(location, description);
            }
        };
    }
    
    // 创建基本标记
    function createBasicMarker(location, description) {
        if (!window.google || !window.google.maps || !window.map) {
            console.warn('[纯Google Maps修复 v2.1] 无法创建基本标记：API或地图不可用');
            return null;
        }
        
        try {
            // 创建标记
            var marker = new google.maps.Marker({
                position: location,
                title: description
            });
            
            // 先设置地图
            marker.setMap(window.map);
            
            // 添加到全局标记数组
            if (!window.markers) window.markers = [];
            window.markers.push(marker);
            
            return marker;
        } catch (e) {
            console.error('[纯Google Maps修复 v2.1] 创建基本标记失败:', e);
            return null;
        }
    }
    
    // 确保地图已加载 - 使用统一加载机制
    function ensureGoogleMapsLoaded() {
        // 检查全局标志
        if (window.GOOGLE_MAPS_LOADED) {
            console.log('[纯Google Maps修复 v2.1] Google Maps API已加载');
            checkMapObject();
            return;
        }
        
        console.log('[纯Google Maps修复 v2.1] 等待Google Maps API加载');
        
        // 如果API未加载且没有加载中，使用统一的加载方法
        if (!window.GOOGLE_MAPS_LOADING) {
            console.log('[纯Google Maps修复 v2.1] 请求加载Google Maps API');
            
            // 添加回调
            window.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS || [];
            window.GOOGLE_MAPS_CALLBACKS.push(function() {
                console.log('[纯Google Maps修复 v2.1] 通过统一机制加载的API回调触发');
                setTimeout(checkMapObject, 1000);
            });
            
            // 如果存在map-integration.js提供的加载函数，使用它
            if (window.MapIntegration && typeof window.MapIntegration.loadAPI === 'function') {
                console.log('[纯Google Maps修复 v2.1] 使用MapIntegration加载API');
                window.MapIntegration.loadAPI();
            } else {
                // 请求其他脚本加载API
                document.dispatchEvent(new CustomEvent('request_google_maps_api'));
            }
        } else {
            console.log('[纯Google Maps修复 v2.1] Google Maps API正在加载中，添加回调');
            
            // 添加我们的回调到全局队列
            window.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS || [];
            window.GOOGLE_MAPS_CALLBACKS.push(function() {
                console.log('[纯Google Maps修复 v2.1] API加载完成回调触发');
                setTimeout(checkMapObject, 1000);
            });
        }
        
        // 监听API加载完成事件
        document.addEventListener('google_maps_loaded', function() {
            console.log('[纯Google Maps修复 v2.1] 收到Google Maps加载完成事件');
            setTimeout(checkMapObject, 1000);
        });
    }
    
    // 检查地图对象
    function checkMapObject() {
        // 检查全局地图对象
        if (!window.map) {
            console.warn('[纯Google Maps修复 v2.1] 全局地图对象不存在');
            
            // 检查地图容器
            var mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error('[纯Google Maps修复 v2.1] 地图容器不存在');
                return;
            }
            
            // 如果API已加载但地图不存在，尝试创建地图
            if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
                console.log('[纯Google Maps修复 v2.1] 尝试创建新的地图对象');
                
                try {
                    window.map = new google.maps.Map(mapElement, {
                        center: window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631},
                        zoom: 13
                    });
                    
                    window.mapsInitialized = true;
                    mapReady = true;
                    
                    // 触发地图就绪事件
                    var event = new CustomEvent('map_ready');
                    document.dispatchEvent(event);
                } catch (e) {
                    console.error('[纯Google Maps修复 v2.1] 创建地图对象失败:', e);
                }
            }
        } else {
            console.log('[纯Google Maps修复 v2.1] 全局地图对象已存在');
            
            // 检查地图对象是否有效
            if (isValidMapObject(window.map)) {
                mapReady = true;
                
                // 触发地图就绪事件
                var event = new CustomEvent('map_ready');
                document.dispatchEvent(event);
            } else {
                console.warn('[纯Google Maps修复 v2.1] 地图对象无效');
            }
        }
    }
    
    // 设置定期检查
    function setupMapStatusChecks() {
        // 每5秒检查一次地图状态
        setInterval(function() {
            checkMapObject();
            
            // 如果地图就绪，尝试处理待处理的标记
            if (mapReady && window.pendingMarkers && window.pendingMarkers.length) {
                processPendingMarkers();
            }
        }, 5000);
    }
    
    // 处理待处理标记
    function processPendingMarkers() {
        if (!window.pendingMarkers || window.pendingMarkers.length === 0) {
            return;
        }
        
        if (!isMapReady()) {
            console.warn('[纯Google Maps修复 v2.1] 地图未就绪，无法处理待处理标记');
            return;
        }
        
        console.log(`[纯Google Maps修复 v2.1] 处理 ${window.pendingMarkers.length} 个待处理标记`);
        
        // 复制数组并清空原数组
        var markers = [...window.pendingMarkers];
        window.pendingMarkers = [];
        
        // 处理标记
        markers.forEach(function(marker) {
            try {
                if (window.UIController && originalFunctions.addReportMarker) {
                    originalFunctions.addReportMarker(marker.location, marker.description, marker.reportId, marker.image);
                } else {
                    createBasicMarker(marker.location, marker.description);
                }
            } catch (e) {
                console.error('[纯Google Maps修复 v2.1] 处理待处理标记失败:', e);
            }
        });
    }
    
    // 判断地图是否就绪
    function isMapReady() {
        return mapReady && window.map && typeof google !== 'undefined' && google.maps;
    }
    
    // 验证地图对象是否有效
    function isValidMapObject(mapObj) {
        return mapObj && typeof mapObj === 'object' && typeof mapObj.setCenter === 'function';
    }
})(); 