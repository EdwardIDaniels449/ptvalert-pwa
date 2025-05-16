/**
 * 纯Google Maps修复脚本 v2
 * 专注于解决setMap错误，不干扰原始地图加载
 */

(function() {
    'use strict';
    
    console.log('[纯Google Maps修复 v2] 初始化...');
    
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
        console.log('[纯Google Maps修复 v2] DOM加载完成');
        initMapFix();
    });
    
    // 如果DOM已加载，立即执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('[纯Google Maps修复 v2] DOM已加载，立即初始化');
        initMapFix();
    }
    
    // 初始化修复
    function initMapFix() {
        // 监听地图就绪事件
        document.addEventListener('map_ready', onMapReady);
        
        // 修复标记添加函数
        safelyPatchAddMarkerFunction();
        
        // 确保Google Maps API正确加载
        ensureGoogleMapsLoaded();
        
        // 定期检查地图状态
        setupMapStatusChecks();
    }
    
    // 地图就绪事件处理函数
    function onMapReady() {
        console.log('[纯Google Maps修复 v2] 地图就绪事件触发');
        mapReady = true;
        
        // 处理任何待处理的标记
        setTimeout(processPendingMarkers, 1000);
    }
    
    // 安全地修补添加标记函数
    function safelyPatchAddMarkerFunction() {
        if (!window.UIController) {
            console.warn('[纯Google Maps修复 v2] UIController不存在，等待创建');
            setTimeout(safelyPatchAddMarkerFunction, 1000);
            return;
        }
        
        console.log('[纯Google Maps修复 v2] 修补添加标记函数');
        
        // 保存原始函数，如果还没保存的话
        if (!originalFunctions.addReportMarker && window.UIController.addReportMarker) {
            originalFunctions.addReportMarker = window.UIController.addReportMarker;
        }
        
        // 替换函数
        window.UIController.addReportMarker = function(location, description, reportId, image) {
            // 确保地图就绪
            if (!isMapReady()) {
                console.warn('[纯Google Maps修复 v2] 地图未就绪，将标记加入待处理队列');
                
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
                    console.warn('[纯Google Maps修复 v2] 未找到原始的addReportMarker函数');
                    return createBasicMarker(location, description);
                }
            } catch (e) {
                console.error('[纯Google Maps修复 v2] 添加标记时出错:', e);
                return createBasicMarker(location, description);
            }
        };
    }
    
    // 创建基本标记
    function createBasicMarker(location, description) {
        if (!window.google || !window.google.maps || !window.map) {
            console.warn('[纯Google Maps修复 v2] 无法创建基本标记：API或地图不可用');
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
            console.error('[纯Google Maps修复 v2] 创建基本标记失败:', e);
            return null;
        }
    }
    
    // 确保地图已加载
    function ensureGoogleMapsLoaded() {
        // 检查Google Maps是否已加载
        if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
            console.log('[纯Google Maps修复 v2] Google Maps API已加载');
            checkMapObject();
            return;
        }
        
        console.log('[纯Google Maps修复 v2] 等待Google Maps API加载');
        
        // 尝试监听全局回调
        if (typeof window.googleMapsLoadedCallback === 'function') {
            var originalCallback = window.googleMapsLoadedCallback;
            
            window.googleMapsLoadedCallback = function() {
                // 调用原始回调
                originalCallback.apply(this, arguments);
                
                // 我们的附加处理
                console.log('[纯Google Maps修复 v2] Google Maps API加载回调触发');
                setTimeout(checkMapObject, 1000);
            };
        }
        
        // 检查API脚本是否存在
        var hasMapScript = !!document.querySelector('script[src*="maps.googleapis.com"]');
        
        if (!hasMapScript) {
            console.warn('[纯Google Maps修复 v2] 没有发现Google Maps脚本，尝试加载');
            loadGoogleMapsScript();
        }
    }
    
    // 手动加载Google Maps脚本
    function loadGoogleMapsScript() {
        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=pureMapFixCallback&libraries=places&v=weekly';
        script.async = true;
        script.defer = true;
        
        // 创建回调
        window.pureMapFixCallback = function() {
            console.log('[纯Google Maps修复 v2] 手动加载的Google Maps API就绪');
            setTimeout(checkMapObject, 1000);
        };
        
        // 添加错误处理
        script.onerror = function() {
            console.error('[纯Google Maps修复 v2] Google Maps脚本加载失败');
        };
        
        document.head.appendChild(script);
    }
    
    // 检查地图对象
    function checkMapObject() {
        // 检查全局地图对象
        if (!window.map) {
            console.warn('[纯Google Maps修复 v2] 全局地图对象不存在');
            
            // 检查地图容器
            var mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error('[纯Google Maps修复 v2] 地图容器不存在');
                return;
            }
            
            // 如果API已加载但地图不存在，尝试创建地图
            if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
                console.log('[纯Google Maps修复 v2] 尝试创建新的地图对象');
                
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
                    console.error('[纯Google Maps修复 v2] 创建地图对象失败:', e);
                }
            }
        } else {
            console.log('[纯Google Maps修复 v2] 全局地图对象已存在');
            
            // 检查地图对象是否有效
            if (isValidMapObject(window.map)) {
                mapReady = true;
                
                // 触发地图就绪事件
                var event = new CustomEvent('map_ready');
                document.dispatchEvent(event);
            } else {
                console.warn('[纯Google Maps修复 v2] 地图对象无效');
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
    
    // 处理待处理的标记
    function processPendingMarkers() {
        if (!window.pendingMarkers || !window.pendingMarkers.length) {
            return;
        }
        
        if (!isMapReady()) {
            console.warn('[纯Google Maps修复 v2] 地图未就绪，无法处理待处理标记');
            return;
        }
        
        console.log(`[纯Google Maps修复 v2] 处理 ${window.pendingMarkers.length} 个待处理标记`);
        
        // 创建副本并清空原数组
        var markers = window.pendingMarkers.slice();
        window.pendingMarkers = [];
        
        // 处理标记
        markers.forEach(function(marker) {
            try {
                if (originalFunctions.addReportMarker) {
                    originalFunctions.addReportMarker(
                        marker.location,
                        marker.description,
                        marker.reportId,
                        marker.image
                    );
                } else {
                    createBasicMarker(marker.location, marker.description);
                }
            } catch (e) {
                console.error('[纯Google Maps修复 v2] 处理待处理标记时出错:', e);
                createBasicMarker(marker.location, marker.description);
            }
        });
    }
    
    // 检查地图是否就绪
    function isMapReady() {
        return mapReady && window.map && isValidMapObject(window.map);
    }
    
    // 检查地图对象是否有效
    function isValidMapObject(mapObj) {
        if (!mapObj) return false;
        
        // 检查是否是有效的Google Maps实例
        if (typeof google !== 'undefined' && google.maps && google.maps.Map && 
            (mapObj instanceof google.maps.Map)) {
            return true;
        }
        
        // 检查是否有必要的方法
        var hasMethods = typeof mapObj.getCenter === 'function' && 
                          typeof mapObj.setCenter === 'function' && 
                          typeof mapObj.getBounds === 'function';
        
        return hasMethods;
    }
})(); 