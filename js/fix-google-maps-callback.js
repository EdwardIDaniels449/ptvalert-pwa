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

// 避免重复初始化
window.googleMapsInitialized = false;

// 初始化地图
window.initMap = function() {
    console.log('初始化地图');
    
    try {
        // 检测是否为移动设备
        const isMobile = window.isMobile || false;
        
        // 移动设备优化选项
        const mapOptions = {
            center: window.MELBOURNE_CENTER,
            zoom: isMobile ? 14 : 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            fullscreenControl: false,
            streetViewControl: !isMobile,
            zoomControl: !isMobile, // 移动设备禁用缩放控件
            mapTypeControl: !isMobile,  // 禁用地图类型控件
            gestureHandling: 'greedy', // 移动设备使用更简单的手势处理
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                },
                {
                    featureType: "transit",
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
                }, isMobile ? 1000 : 500);
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
    // 避免重复初始化
    if (window.googleMapsInitialized) {
        console.log('[Google Maps] 已经初始化过，跳过重复初始化');
        return;
    }

    console.log('[Google Maps] API 加载完成，开始初始化地图');
    
    try {
        // 检查是否为移动设备
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 地图配置 - 根据设备不同使用不同配置
        var mapOptions = {
            center: { lat: window.MELBOURNE_CENTER.lat, lng: window.MELBOURNE_CENTER.lng },
            zoom: isMobile ? 14 : 15,
            mapTypeControl: !isMobile,
            streetViewControl: !isMobile,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            minZoom: 10,
            maxZoom: 18
        };
        
        if (isMobile) {
            // 移动设备额外优化
            mapOptions.disableDefaultUI = true;
            mapOptions.zoomControl = true;
            
            // 降低移动设备上的视觉复杂度
            var mobileFriendlyStyle = [
                {
                    featureType: "poi",
                    stylers: [{ visibility: "off" }]
                },
                {
                    featureType: "transit",
                    stylers: [{ visibility: "off" }]
                }
            ];
            
            mapOptions.styles = mobileFriendlyStyle;
        }
        
        // 创建地图实例
        window.map = new google.maps.Map(document.getElementById('map'), mapOptions);
        
        // 延迟初始化非关键功能
        setTimeout(function() {
            // 初始化完成后，触发地图就绪事件
            if (typeof window.onMapReady === 'function') {
                console.log('[Google Maps] 触发地图就绪事件');
                window.onMapReady(window.map);
            }
            
            // 触发自定义事件，通知其他脚本地图已就绪
            var mapReadyEvent = new CustomEvent('map_ready', { detail: { map: window.map } });
            document.dispatchEvent(mapReadyEvent);
        }, isMobile ? 500 : 100);
        
        // 标记初始化完成
        window.googleMapsInitialized = true;
        
        console.log('[Google Maps] 地图初始化成功');
    } catch (error) {
        console.error('[Google Maps] 初始化失败:', error);
        
        // 显示错误提示
        showMapError();
    }
};

// 地图加载超时检测
window.googleMapsTimeout = setTimeout(function() {
    if (!window.googleMapsInitialized) {
        console.warn('[Google Maps] 加载超时，尝试替代方案');
        handleMapInitError();
    }
}, 10000);

// 处理地图初始化错误
function handleMapInitError() {
    // 显示错误提示
    showMapError();
    
    // 尝试创建简单地图替代
    createFallbackMap();
}

// 显示地图错误提示
function showMapError() {
    var mapElement = document.getElementById('map');
    
    if (mapElement) {
        // 创建一个简单的错误提示
        mapElement.style.backgroundImage = 'linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%)';
        
        var errorMessage = document.createElement('div');
        errorMessage.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:white;padding:12px 20px;border-radius:8px;text-align:center;font-size:14px;max-width:80%;';
        errorMessage.textContent = '地图加载受限，但您仍可添加报告';
        
        mapElement.appendChild(errorMessage);
        
        // 3秒后自动隐藏提示
        setTimeout(function() {
            errorMessage.style.opacity = '0';
            errorMessage.style.transition = 'opacity 0.5s ease';
            
            setTimeout(function() {
                if (errorMessage.parentNode) {
                    errorMessage.parentNode.removeChild(errorMessage);
                }
            }, 500);
        }, 5000);
    }
}

// 创建备用地图
function createFallbackMap() {
    window.map = {
        getCenter: function() {
            return {
                lat: function() { return window.MELBOURNE_CENTER.lat; },
                lng: function() { return window.MELBOURNE_CENTER.lng; }
            };
        },
        setCenter: function() { return this; },
        addListener: function() { return { remove: function() {} }; },
        panTo: function() { return this; },
        setZoom: function() { return this; },
        getBounds: function() {
            return {
                contains: function() { return true; }
            };
        }
    };
    
    console.log('[Google Maps] 已创建备用地图对象');
}

console.log('[Google Maps] 回调处理脚本已加载');

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
        try {
            // 检查地图是否已初始化
            if (!window.mapsInitialized) {
                console.log('[回调修复] 尝试加载应急地图模块');
                
                // 直接使用内联备用方案
                createInlineEmergencyFallback();
            }
        } catch (error) {
            console.error('[回调修复] 确保基本初始化时出错:', error);
            createInlineEmergencyFallback();
        }
    }
    
    // 创建内联的应急备用方案
    function createInlineEmergencyFallback() {
        console.log('[回调修复] 创建内联应急备用方案');
        
        try {
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
                addListener: function(event, callback) { 
                    console.log('[回调修复] 添加地图事件监听器: ' + event);
                    return { remove: function() {} }; 
                },
                getZoom: function() { return 13; },
                setZoom: function() { return this; },
                getBounds: function() {
                    return {
                        getNorthEast: function() { 
                            return { 
                                lat: function() { return window.MELBOURNE_CENTER.lat + 0.1; }, 
                                lng: function() { return window.MELBOURNE_CENTER.lng + 0.1; } 
                            }; 
                        },
                        getSouthWest: function() { 
                            return { 
                                lat: function() { return window.MELBOURNE_CENTER.lat - 0.1; }, 
                                lng: function() { return window.MELBOURNE_CENTER.lng - 0.1; } 
                            }; 
                        }
                    };
                },
                setOptions: function() { return this; }
            };
            
            // 定义必要的地图API类和常量
            if (!window.google.maps.Marker) {
                window.google.maps.Marker = function(options) {
                    return {
                        setMap: function() { return this; },
                        getPosition: function() {
                            return {
                                lat: function() { return options && options.position ? options.position.lat : window.MELBOURNE_CENTER.lat; },
                                lng: function() { return options && options.position ? options.position.lng : window.MELBOURNE_CENTER.lng; }
                            };
                        },
                        addListener: function() { return { remove: function() {} }; },
                        getTitle: function() { return options && options.title ? options.title : ''; }
                    };
                };
            }
            
            if (!window.google.maps.InfoWindow) {
                window.google.maps.InfoWindow = function() {
                    return {
                        open: function() { return this; },
                        close: function() { return this; }
                    };
                };
            }
            
            if (!window.google.maps.event) {
                window.google.maps.event = {
                    addListener: function() { return { remove: function() {} }; },
                    removeListener: function() {}
                };
            }
            
            if (!window.google.maps.MapTypeId) {
                window.google.maps.MapTypeId = {
                    ROADMAP: 'roadmap',
                    SATELLITE: 'satellite',
                    HYBRID: 'hybrid',
                    TERRAIN: 'terrain'
                };
            }
            
            if (!window.google.maps.Animation) {
                window.google.maps.Animation = {
                    DROP: 'DROP',
                    BOUNCE: 'BOUNCE'
                };
            }
            
            if (!window.google.maps.ControlPosition) {
                window.google.maps.ControlPosition = {
                    TOP_CENTER: 'top-center',
                    RIGHT_BOTTOM: 'right-bottom'
                };
            }
            
            if (!window.google.maps.SymbolPath) {
                window.google.maps.SymbolPath = {
                    CIRCLE: 0
                };
            }
            
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
                    if (noticeDiv.parentNode) {
                        noticeDiv.parentNode.removeChild(noticeDiv);
                    }
                }, 1000);
            }, 10000);
            
            // 如果有回调数组，执行它们
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
            
            // 触发地图就绪事件
            const mapReadyEvent = new CustomEvent('map_ready');
            document.dispatchEvent(mapReadyEvent);
            
            console.log('[回调修复] 内联应急备用方案设置完成');
        } catch (error) {
            console.error('[回调修复] 创建内联应急备用方案时出错:', error);
            // 最后的备用方案
            window.map = window.map || {};
            window.mapsInitialized = true;
        }
    }
    
    console.log('[回调修复] Google Maps回调修复模块加载完成');
})(); 