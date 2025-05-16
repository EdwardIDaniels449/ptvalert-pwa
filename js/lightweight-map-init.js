/**
 * 轻量级地图初始化脚本
 * 针对移动设备优化的地图加载方案
 */

(function() {
    'use strict';
    
    console.log('[轻量地图] 初始化轻量级地图加载器');
    
    // 移动设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 如果不是移动设备，不执行轻量级加载
    if (!isMobile) {
        console.log('[轻量地图] 检测到桌面设备，跳过轻量级加载');
        return;
    }
    
    // 初始中心点
    const DEFAULT_CENTER = window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631};
    
    // 加载超时时间（毫秒）
    const LOAD_TIMEOUT = 10000;
    
    // 设备内存检测 - 尝试检测可用内存
    const isLowMemoryDevice = checkIfLowMemoryDevice();
    
    // 初始化
    window.addEventListener('load', function() {
        // 给Google Maps API加载设置超时
        setupMapLoadTimeout();
        
        // 如果是低内存设备，使用静态地图
        if (isLowMemoryDevice) {
            console.log('[轻量地图] 检测到低内存设备，使用静态地图');
            setupStaticMap();
            return;
        }
        
        // 监听Google Maps加载事件
        if (window.googleMapsLoadedCallback) {
            const originalCallback = window.googleMapsLoadedCallback;
            window.googleMapsLoadedCallback = function() {
                try {
                    console.log('[轻量地图] Google Maps API 已加载，使用优化初始化');
                    initOptimizedMap();
                    // 调用原始回调
                    if (typeof originalCallback === 'function') {
                        originalCallback();
                    }
                } catch (e) {
                    console.error('[轻量地图] 地图初始化错误:', e);
                    fallbackToStaticMap();
                }
            };
        } else {
            // 如果没有定义回调，创建一个
            window.googleMapsLoadedCallback = function() {
                console.log('[轻量地图] Google Maps API 已加载，使用优化初始化');
                initOptimizedMap();
            };
        }
    });
    
    // 检查是否为低内存设备
    function checkIfLowMemoryDevice() {
        // 尝试使用navigator.deviceMemory (仅Chrome支持)
        if (navigator.deviceMemory && navigator.deviceMemory < 2) {
            return true;
        }
        
        // 尝试使用性能API
        if (window.performance && window.performance.memory) {
            const memoryInfo = window.performance.memory;
            if (memoryInfo.jsHeapSizeLimit < 500000000) { // 小于500MB
                return true;
            }
        }
        
        // 粗略检测iOS低端设备
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            // 尝试根据屏幕分辨率推断
            const pixelRatio = window.devicePixelRatio || 1;
            const screenSize = (window.screen.width * pixelRatio) * (window.screen.height * pixelRatio);
            if (screenSize < 1000000) { // 小于1百万像素
                return true;
            }
        }
        
        // 安卓设备检测
        const isAndroid = /Android/.test(navigator.userAgent);
        if (isAndroid) {
            // 尝试从User Agent推断设备等级
            const uaLower = navigator.userAgent.toLowerCase();
            // 一些关键词可能表示低端设备
            if (uaLower.includes('sm-') || uaLower.includes('redmi') || uaLower.includes('mediatek')) {
                return true;
            }
        }
        
        // 默认返回false
        return false;
    }
    
    // 为地图加载设置超时
    function setupMapLoadTimeout() {
        window.mapLoadTimeout = setTimeout(function() {
            // 如果超过10秒还没有加载完成，使用静态地图
            if (!window.google || !window.google.maps || !window.map) {
                console.warn('[轻量地图] Google Maps加载超时，使用静态地图');
                fallbackToStaticMap();
            }
        }, LOAD_TIMEOUT);
    }
    
    // 使用静态地图作为后备
    function fallbackToStaticMap() {
        clearTimeout(window.mapLoadTimeout);
        setupStaticMap();
    }
    
    // 设置静态地图
    function setupStaticMap() {
        // 查找地图容器
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        
        // 清除现有内容
        mapContainer.innerHTML = '';
        
        // 创建静态地图
        const center = `${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}`;
        const width = mapContainer.clientWidth || 600;
        const height = mapContainer.clientHeight || 400;
        const zoom = 14;
        
        // 使用Google Maps静态图片API
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${width}x${height}&scale=2&key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U`;
        
        // 创建图片元素
        const staticMap = document.createElement('img');
        staticMap.src = staticMapUrl;
        staticMap.alt = '地图';
        staticMap.style.width = '100%';
        staticMap.style.height = '100%';
        staticMap.style.objectFit = 'cover';
        
        // 添加点击处理
        staticMap.addEventListener('click', function(e) {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 创建模拟的点击位置
            const lat = DEFAULT_CENTER.lat + (((height / 2) - y) / height) * 0.01 * zoom;
            const lng = DEFAULT_CENTER.lng + ((x - (width / 2)) / width) * 0.01 * zoom;
            
            // 如果存在全局selectedLocation变量，更新它
            if ('selectedLocation' in window) {
                window.selectedLocation = {lat: lat, lng: lng};
                
                // 创建一个简单的标记显示
                createSimpleMarker(x, y);
                
                // 触发选择点位事件
                const event = new CustomEvent('location_selected', {
                    detail: {lat: lat, lng: lng}
                });
                window.dispatchEvent(event);
            }
        });
        
        // 添加到地图容器
        mapContainer.appendChild(staticMap);
        
        // 添加地图控制说明
        const mapControls = document.createElement('div');
        mapControls.style.cssText = 'position:absolute;bottom:10px;left:10px;right:10px;background:rgba(255,255,255,0.8);color:#333;padding:8px;border-radius:8px;font-size:14px;text-align:center;';
        mapControls.textContent = '点击地图选择位置';
        mapContainer.appendChild(mapControls);
        
        // 创建模拟地图和标记数组
        createSimulatedMapObjects();
    }
    
    // 创建简单的标记显示
    function createSimpleMarker(x, y) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        
        // 移除旧标记
        const oldMarker = document.getElementById('simple-marker');
        if (oldMarker) {
            oldMarker.parentNode.removeChild(oldMarker);
        }
        
        // 创建新标记
        const marker = document.createElement('div');
        marker.id = 'simple-marker';
        marker.style.cssText = `position:absolute;left:${x-15}px;top:${y-30}px;color:red;font-size:30px;`;
        marker.innerHTML = '📍';
        mapContainer.appendChild(marker);
    }
    
    // 创建模拟的地图对象
    function createSimulatedMapObjects() {
        // 模拟地图对象
        window.map = {
            getCenter: function() {
                return {
                    lat: function() { return DEFAULT_CENTER.lat; },
                    lng: function() { return DEFAULT_CENTER.lng; }
                };
            },
            setCenter: function() { return this; },
            addListener: function() { return { remove: function() {} }; },
            getBounds: function() {
                return {
                    contains: function() { return true; },
                    extend: function() {}
                };
            }
        };
        
        // 模拟标记数组
        window.markers = window.markers || [];
        
        // 模拟 Google Maps 对象
        if (!window.google) {
            window.google = {
                maps: {
                    Map: function() { return window.map; },
                    Marker: function() { 
                        return {
                            setMap: function() {},
                            getPosition: function() { 
                                return {
                                    lat: function() { return DEFAULT_CENTER.lat; },
                                    lng: function() { return DEFAULT_CENTER.lng; }
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
                    LatLngBounds: function() {
                        return {
                            extend: function() { return this; },
                            contains: function() { return true; }
                        };
                    },
                    event: { 
                        addListener: function() { return { remove: function() {} }; } 
                    },
                    Animation: { DROP: 1, BOUNCE: 2 },
                    SymbolPath: { CIRCLE: 0 }
                }
            };
        }
        
        // 触发地图加载完成事件
        const event = new CustomEvent('map_ready_fallback');
        window.dispatchEvent(event);
    }
    
    // 使用低内存模式初始化交互式地图
    function initOptimizedMap() {
        try {
            // 清除超时
            clearTimeout(window.mapLoadTimeout);
            
            // 如果地图已经初始化，不再重复
            if (window.map && typeof window.map.setOptions === 'function') {
                console.log('[轻量地图] 使用已初始化的地图');
                optimizeExistingMap();
                return;
            }
            
            // 查找地图容器
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;
            
            console.log('[轻量地图] 正在初始化优化后的移动版地图');
            
            // 创建最小化的地图选项
            const mapOptions = {
                center: DEFAULT_CENTER,
                zoom: 14,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true, // 移除默认UI
                gestureHandling: 'cooperative', // 改善移动端手势处理
                maxZoom: 18,
                minZoom: 10,
                clickableIcons: false, // 禁用POI点击
                styles: [
                    // 最小化地图样式，减少复杂度
                    { 
                        featureType: 'poi',
                        stylers: [{ visibility: 'off' }] 
                    },
                    {
                        featureType: 'transit',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            };
            
            // 创建地图
            window.map = new google.maps.Map(mapContainer, mapOptions);
            
            // 确保标记数组存在
            window.markers = window.markers || [];
            
            // 添加地图加载事件处理
            google.maps.event.addListenerOnce(window.map, 'idle', function() {
                console.log('[轻量地图] 地图加载完成，应用优化');
                
                // 触发地图加载完成事件
                const event = new CustomEvent('map_ready');
                window.dispatchEvent(event);
            });
            
            // 处理错误情况
            google.maps.event.addListener(window.map, 'error', function() {
                console.error('[轻量地图] 地图加载出错，使用静态地图');
                fallbackToStaticMap();
            });
        } catch (e) {
            console.error('[轻量地图] 地图初始化失败:', e);
            fallbackToStaticMap();
        }
    }
    
    // 优化已存在的地图
    function optimizeExistingMap() {
        if (!window.map || typeof window.map.setOptions !== 'function') return;
        
        try {
            // 应用优化选项
            window.map.setOptions({
                disableDefaultUI: true, // 移除默认UI
                gestureHandling: 'cooperative', // 改善移动端手势处理
                maxZoom: 18,
                minZoom: 10,
                clickableIcons: false, // 禁用POI点击
                styles: [
                    // 最小化地图样式，减少复杂度
                    { 
                        featureType: 'poi',
                        stylers: [{ visibility: 'off' }] 
                    },
                    {
                        featureType: 'transit',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });
            
            console.log('[轻量地图] 已优化现有地图');
        } catch (e) {
            console.warn('[轻量地图] 优化地图失败:', e);
        }
    }
    
    console.log('[轻量地图] 轻量级地图初始化脚本加载完成');
})(); 