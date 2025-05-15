/**
 * Google Maps API回调修复
 * 确保即使地图API加载失败，应用也能继续运行
 */

// 创建全局标记存储
window.markers = [];
window.pendingMarkers = window.pendingMarkers || [];
window.isSelectingLocation = false;
window.selectedLocation = null;
window.mapsInitialized = false;

// 初始化地图
window.initMap = function() {
    console.log('初始化地图');
    
    try {
        // 检测是否为移动设备
        const isMobile = window.isMobile || false;
        
        // 移动设备优化选项
        const mapOptions = {
            center: window.MELBOURNE_CENTER,
            zoom: 13,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            fullscreenControl: false,
            streetViewControl: false,
            zoomControl: !isMobile, // 移动设备禁用缩放控件
            mapTypeControl: false,  // 禁用地图类型控件
            gestureHandling: isMobile ? 'greedy' : 'auto', // 移动设备使用更简单的手势处理
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ],
            // 性能优化选项
            maxZoom: 18,
            minZoom: 10,
            clickableIcons: false, // 禁用默认POI点击
            disableDefaultUI: isMobile, // 移动设备禁用默认UI
            // 启用硬件加速
            backgroundColor: '#f5f5f5',
            tilt: 0 // 禁用倾斜以提高性能
        };
        
        // 性能优化: 延迟创建地图实例
        setTimeout(() => {
            try {
                // 创建地图实例
                window.map = new google.maps.Map(document.getElementById('map'), mapOptions);
                
                // 性能优化: 限制事件监听器
                if (isMobile) {
                    // 移动设备仅添加必要的事件监听
                    window.map.addListener('click', function(event) {
                        if (window.isSelectingLocation) {
                            const latLng = event.latLng;
                            if (window.UIController && typeof window.UIController.selectMapLocation === 'function') {
                                window.UIController.selectMapLocation(latLng);
                            }
                        }
                    });
                } else {
                    // 桌面设备可以添加更多监听器
                    window.map.addListener('click', function(event) {
                        if (window.isSelectingLocation) {
                            const latLng = event.latLng;
                            if (window.UIController && typeof window.UIController.selectMapLocation === 'function') {
                                window.UIController.selectMapLocation(latLng);
                            }
                        }
                    });
                }
                
                console.log('地图初始化完成');
                
                // 设置地图初始化标志
                window.mapsInitialized = true;
                
                // 触发地图就绪事件
                const mapReadyEvent = new CustomEvent('map_ready');
                document.dispatchEvent(mapReadyEvent);
                
                // 优化: 延迟加载标记
                setTimeout(() => {
                    // 处理待处理的标记
                    if (window.pendingMarkers && window.pendingMarkers.length) {
                        console.log('添加待处理的标记:', window.pendingMarkers.length);
                        const maxMarkersToAdd = isMobile ? 5 : 20; // 移动设备限制同时添加的标记数
                        
                        // 批量添加标记，避免一次性添加过多导致卡顿
                        const addBatchMarkers = (startIndex) => {
                            const endIndex = Math.min(startIndex + maxMarkersToAdd, window.pendingMarkers.length);
                            
                            for (let i = startIndex; i < endIndex; i++) {
                                const marker = window.pendingMarkers[i];
                                if (window.UIController && typeof window.UIController.addReportMarker === 'function') {
                                    window.UIController.addReportMarker(marker.location, marker.description);
                                }
                            }
                            
                            // 如果还有更多标记需要添加，延迟添加
                            if (endIndex < window.pendingMarkers.length) {
                                setTimeout(() => {
                                    addBatchMarkers(endIndex);
                                }, 300);
                            } else {
                                // 清空待处理标记
                                window.pendingMarkers = [];
                            }
                        };
                        
                        // 开始批量添加标记
                        addBatchMarkers(0);
                    }
                }, isMobile ? 1000 : 500); // 移动设备延迟更长时间
            } catch (mapError) {
                console.error('创建地图实例时出错:', mapError);
                if (typeof window.handleMapInitError === 'function') {
                    window.handleMapInitError();
                }
            }
        }, window.isMobile ? 200 : 50); // 移动设备延迟更长时间
    } catch (error) {
        console.error('初始化地图时出错:', error);
        if (typeof window.handleMapInitError === 'function') {
            window.handleMapInitError();
        }
    }
};

// Google Maps API加载完成的回调函数
window.googleMapsLoadedCallback = function() {
    console.log('Google Maps API已加载完成，准备初始化地图');
    
    // 初始化地图
    if (typeof window.initMap === 'function') {
        window.initMap();
    } else {
        console.error('initMap 函数未定义，无法初始化地图');
        if (typeof window.handleMapInitError === 'function') {
            window.handleMapInitError();
        }
    }
    
    // 如果有注册的回调函数，调用它们
    if (window.mapReadyCallbacks && window.mapReadyCallbacks.length) {
        console.log('执行地图就绪回调函数');
        window.mapReadyCallbacks.forEach(function(callback) {
            callback();
        });
    }
    
    // 处理待处理的标记
    if (window.pendingMarkers && window.pendingMarkers.length) {
        console.log('添加待处理的标记:', window.pendingMarkers.length);
        window.pendingMarkers.forEach(function(markerData) {
            if (window.UIController && typeof window.UIController.addReportMarker === 'function') {
                window.UIController.addReportMarker(
                    markerData.location,
                    markerData.description
                );
            }
        });
        // 清空待处理标记
        window.pendingMarkers = [];
    }
};

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
            
            // 直接使用内联备用方案
            createInlineEmergencyFallback();
        }
    }
    
    // 创建内联的应急备用方案
    function createInlineEmergencyFallback() {
        console.log('[回调修复] 创建内联应急备用方案');
        
        // 创建基本的备用方案
        window.google = window.google || {};
        window.google.maps = window.google.maps || {};
        
        // 定义墨尔本中心坐标（如果尚未定义）
        if (!window.MELBOURNE_CENTER) {
            window.MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
        }
        
        // 创建一个最小化的地图对象
        window.map = {
            getCenter: function() {
                return {
                    lat: function() { return window.MELBOURNE_CENTER.lat; },
                    lng: function() { return window.MELBOURNE_CENTER.lng; }
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
    
    // 定义 handleMapInitError 函数，避免引用错误
    window.handleMapInitError = function() {
        // 如果已经有离线模式处理，不再显示额外的错误
        if (window.mapsInitialized || document.getElementById('offlineMapNotice')) {
            return;
        }
        
        // 创建一个简单的地图替代元素
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.backgroundImage = 'linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%)';
            mapElement.style.backgroundSize = 'cover';
        }
        
        // 创建一个模拟的地图对象
        window.map = window.map || {
            getCenter: function() {
                return {
                    lat: function() { return window.MELBOURNE_CENTER.lat; },
                    lng: function() { return window.MELBOURNE_CENTER.lng; }
                };
            },
            setCenter: function() { return this; },
            addListener: function() { return { remove: function() {} }; }
        };
        
        // 提示用户
        const notice = document.createElement('div');
        notice.id = 'offlineMapNotice';
        notice.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:white;padding:10px 20px;border-radius:20px;z-index:1000;font-size:14px;text-align:center;';
        notice.textContent = '地图加载受限，但您仍可添加报告';
        document.body.appendChild(notice);
        
        // 5秒后移除通知
        setTimeout(function() {
            if (notice.parentNode) {
                notice.style.opacity = '0';
                notice.style.transition = 'opacity 0.5s';
                setTimeout(function() {
                    if (notice.parentNode) {
                        notice.parentNode.removeChild(notice);
                    }
                }, 500);
            }
        }, 5000);
        
        // 标记地图已初始化（避免重复显示错误）
        window.mapsInitialized = true;
    };
    
    console.log('[回调修复] Google Maps回调修复模块加载完成');
})(); 