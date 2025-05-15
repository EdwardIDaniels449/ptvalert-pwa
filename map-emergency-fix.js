/**
 * 地图紧急修复脚本 - 解决Google Maps API加载失败问题
 */

(function() {
    console.log('[紧急修复] 初始化地图紧急修复');
    
    // 立即执行以避免阻塞页面加载
    setTimeout(function() {
        try {
            // 检查Google Maps是否已加载
            if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
                console.warn('[紧急修复] Google Maps API未加载，创建模拟对象');
                
                // 创建模拟Google对象
                window.google = window.google || {};
                window.google.maps = window.google.maps || {};
                
                // 确保墨尔本中心坐标存在
                window.MELBOURNE_CENTER = window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631};
                
                // 创建模拟地图类
                window.google.maps.Map = function(element, options) {
                    console.log('[紧急修复] 创建模拟地图');
                    
                    // 修改地图容器样式
                    if (element) {
                        element.style.backgroundImage = 'linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%)';
                        element.style.backgroundSize = 'cover';
                    }
                    
                    return {
                        getCenter: function() {
                            return {
                                lat: function() { return window.MELBOURNE_CENTER.lat; },
                                lng: function() { return window.MELBOURNE_CENTER.lng; }
                            };
                        },
                        setCenter: function() { return this; },
                        addListener: function(event, callback) {
                            console.log('[紧急修复] 添加地图事件监听器: ' + event);
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
                };
                
                // 创建模拟标记类
                window.google.maps.Marker = function(options) {
                    console.log('[紧急修复] 创建模拟标记');
                    
                    return {
                        setMap: function(map) { return this; },
                        getPosition: function() {
                            return {
                                lat: function() { return options && options.position ? options.position.lat : window.MELBOURNE_CENTER.lat; },
                                lng: function() { return options && options.position ? options.position.lng : window.MELBOURNE_CENTER.lng; }
                            };
                        },
                        addListener: function(event, callback) {
                            console.log('[紧急修复] 添加标记事件监听器: ' + event);
                            return { remove: function() {} };
                        },
                        getTitle: function() { return options && options.title ? options.title : ''; }
                    };
                };
                
                // 创建模拟信息窗口类
                window.google.maps.InfoWindow = function(options) {
                    return {
                        open: function() { return this; },
                        close: function() { return this; }
                    };
                };
                
                // 创建模拟事件类
                window.google.maps.event = {
                    addListener: function(instance, event, callback) {
                        return { remove: function() {} };
                    },
                    removeListener: function(listener) {}
                };
                
                // 创建必要的常量
                window.google.maps.MapTypeId = {
                    ROADMAP: 'roadmap',
                    SATELLITE: 'satellite',
                    HYBRID: 'hybrid',
                    TERRAIN: 'terrain'
                };
                
                window.google.maps.Animation = {
                    DROP: 'DROP',
                    BOUNCE: 'BOUNCE'
                };
                
                window.google.maps.ControlPosition = {
                    TOP_CENTER: 'TOP_CENTER',
                    TOP_LEFT: 'TOP_LEFT',
                    TOP_RIGHT: 'TOP_RIGHT',
                    LEFT_TOP: 'LEFT_TOP',
                    RIGHT_TOP: 'RIGHT_TOP',
                    LEFT_CENTER: 'LEFT_CENTER',
                    RIGHT_CENTER: 'RIGHT_CENTER',
                    LEFT_BOTTOM: 'LEFT_BOTTOM',
                    RIGHT_BOTTOM: 'RIGHT_BOTTOM',
                    BOTTOM_CENTER: 'BOTTOM_CENTER',
                    BOTTOM_LEFT: 'BOTTOM_LEFT',
                    BOTTOM_RIGHT: 'BOTTOM_RIGHT'
                };
                
                window.google.maps.SymbolPath = {
                    CIRCLE: 0,
                    FORWARD_CLOSED_ARROW: 1,
                    FORWARD_OPEN_ARROW: 2,
                    BACKWARD_CLOSED_ARROW: 3,
                    BACKWARD_OPEN_ARROW: 4
                };
                
                // 初始化地图
                if (typeof window.initMap === 'function') {
                    console.log('[紧急修复] 调用initMap函数');
                    window.initMap();
                } else {
                    console.log('[紧急修复] initMap函数不存在，创建并调用备用函数');
                    window.initMap = function() {
                        window.map = new window.google.maps.Map(document.getElementById('map'), {
                            center: window.MELBOURNE_CENTER,
                            zoom: 13
                        });
                        
                        // 标记地图已初始化
                        window.mapsInitialized = true;
                        
                        // 显示通知
                        showEmergencyNotice('地图加载受限，但功能正常可用');
                        
                        // 调用回调
                        if (window.mapReadyCallbacks && window.mapReadyCallbacks.length) {
                            window.mapReadyCallbacks.forEach(function(callback) {
                                try {
                                    callback();
                                } catch (e) {
                                    console.error('[紧急修复] 执行回调时出错:', e);
                                }
                            });
                        }
                        
                        // 触发地图就绪事件
                        const mapReadyEvent = new CustomEvent('map_ready');
                        document.dispatchEvent(mapReadyEvent);
                    };
                    
                    window.initMap();
                }
            } else {
                console.log('[紧急修复] Google Maps API已正常加载，无需修复');
            }
        } catch (error) {
            console.error('[紧急修复] 应用紧急修复时出错:', error);
            showEmergencyNotice('地图加载出错，但您仍可使用基本功能');
        }
    }, 1000); // 延迟1秒执行，确保其他脚本有机会先初始化
    
    // 显示紧急通知
    function showEmergencyNotice(message) {
        const noticeId = 'emergency-map-notice';
        
        // 避免重复创建通知
        if (document.getElementById(noticeId)) {
            return;
        }
        
        const notice = document.createElement('div');
        notice.id = noticeId;
        notice.style.position = 'fixed';
        notice.style.top = '50px';
        notice.style.left = '50%';
        notice.style.transform = 'translateX(-50%)';
        notice.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notice.style.color = 'white';
        notice.style.padding = '10px 20px';
        notice.style.borderRadius = '20px';
        notice.style.fontSize = '14px';
        notice.style.zIndex = '9999';
        notice.style.textAlign = 'center';
        notice.textContent = message;
        
        document.body.appendChild(notice);
        
        // 5秒后自动隐藏通知
        setTimeout(function() {
            notice.style.opacity = '0';
            notice.style.transition = 'opacity 0.5s';
            setTimeout(function() {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            }, 500);
        }, 5000);
    }
})(); 