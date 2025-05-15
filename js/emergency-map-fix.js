/**
 * 紧急地图修复
 * 这个脚本创建了地图API的模拟对象，当Google Maps API无法加载时提供备用功能
 */

(function() {
    console.log('[地图修复] 开始加载紧急地图修复模块');
    
    // 定义常量
    const LOG_PREFIX = '[地图修复] ';
    const MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
    
    // 检测地图加载状态的超时时间
    const MAP_LOAD_TIMEOUT = 5000; // 5秒
    
    // 在特定的时间后检查Google Maps是否已成功加载
    setTimeout(function() {
        // 检查Google Maps API是否已正确加载
        if (typeof google === 'undefined' || typeof google.maps === 'undefined' || !window.map) {
            console.warn(LOG_PREFIX + 'Google Maps API未能在预期时间内加载，创建应急替代方案');
            createMapsEmergencyFallback();
        } else {
            console.log(LOG_PREFIX + 'Google Maps已成功加载，无需应用修复');
        }
    }, MAP_LOAD_TIMEOUT);
    
    // 创建地图API的紧急替代方法
    function createMapsEmergencyFallback() {
        console.log(LOG_PREFIX + '创建地图API模拟对象');
        
        // 1. 为UI添加离线模式提示
        showOfflineMapNotice();
        
        // 2. 修改地图容器样式
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.backgroundImage = 'url("images/map-placeholder.png")';
            mapElement.style.backgroundSize = 'cover';
            mapElement.style.backgroundPosition = 'center';
            mapElement.style.opacity = '0.4';
        }
        
        // 3. 创建模拟的Google Maps对象
        window.google = window.google || {};
        window.google.maps = window.google.maps || {};
        
        // 创建模拟的 Map 类
        class MockMap {
            constructor(container, options) {
                this.container = container;
                this.options = options || {};
                this.center = options.center || MELBOURNE_CENTER;
                this.zoom = options.zoom || 13;
                this.markers = [];
                this.listeners = {};
                console.log(LOG_PREFIX + '创建模拟地图，中心点:', this.center);
            }
            
            // 模拟地图方法
            setCenter(latLng) {
                this.center = latLng;
                return this;
            }
            
            getCenter() {
                return {
                    lat: () => this.center.lat,
                    lng: () => this.center.lng
                };
            }
            
            setZoom(zoom) {
                this.zoom = zoom;
                return this;
            }
            
            getZoom() {
                return this.zoom;
            }
            
            // 模拟事件监听
            addListener(event, callback) {
                if (!this.listeners[event]) {
                    this.listeners[event] = [];
                }
                this.listeners[event].push(callback);
                
                // 返回一个带有 remove 方法的对象
                return {
                    remove: () => {
                        const index = this.listeners[event].indexOf(callback);
                        if (index !== -1) {
                            this.listeners[event].splice(index, 1);
                        }
                    }
                };
            }
            
            // 触发事件
            triggerEvent(event, data) {
                if (this.listeners[event]) {
                    this.listeners[event].forEach(callback => {
                        callback(data);
                    });
                }
            }
            
            // Mock panTo
            panTo(latLng) {
                this.setCenter(latLng);
                return this;
            }
            
            // Mock fitBounds
            fitBounds() {
                return this;
            }
            
            getBounds() {
                // 模拟返回一个边界框
                const ne = { lat: this.center.lat + 0.1, lng: this.center.lng + 0.1 };
                const sw = { lat: this.center.lat - 0.1, lng: this.center.lng - 0.1 };
                
                return {
                    getNorthEast: () => ({ lat: () => ne.lat, lng: () => ne.lng }),
                    getSouthWest: () => ({ lat: () => sw.lat, lng: () => sw.lng }),
                    contains: () => true
                };
            }
        }
        
        // 模拟 Marker 类
        class MockMarker {
            constructor(options) {
                this.position = options.position;
                this.map = options.map;
                this.title = options.title || '';
                this.icon = options.icon;
                this.listeners = {};
                
                if (this.map && this.map.markers) {
                    this.map.markers.push(this);
                }
                
                console.log(LOG_PREFIX + '创建模拟标记:', this.title, this.position);
            }
            
            setMap(map) {
                if (this.map && this.map.markers) {
                    const index = this.map.markers.indexOf(this);
                    if (index !== -1) {
                        this.map.markers.splice(index, 1);
                    }
                }
                
                this.map = map;
                
                if (map && map.markers) {
                    map.markers.push(this);
                }
                
                return this;
            }
            
            getPosition() {
                return {
                    lat: () => this.position.lat,
                    lng: () => this.position.lng
                };
            }
            
            setPosition(position) {
                this.position = position;
                return this;
            }
            
            addListener(event, callback) {
                if (!this.listeners[event]) {
                    this.listeners[event] = [];
                }
                this.listeners[event].push(callback);
                
                return {
                    remove: () => {
                        const index = this.listeners[event].indexOf(callback);
                        if (index !== -1) {
                            this.listeners[event].splice(index, 1);
                        }
                    }
                };
            }
            
            triggerEvent(event, data) {
                if (this.listeners[event]) {
                    this.listeners[event].forEach(callback => {
                        callback(data || {});
                    });
                }
            }
            
            getTitle() {
                return this.title;
            }
            
            setTitle(title) {
                this.title = title;
                return this;
            }
            
            setVisible(visible) {
                this.visible = visible;
                return this;
            }
        }
        
        // 模拟 InfoWindow 类
        class MockInfoWindow {
            constructor(options) {
                this.content = options && options.content || '';
                this.position = options && options.position || null;
                this.marker = null;
                this.map = null;
            }
            
            open(map, marker) {
                this.map = map;
                this.marker = marker;
                
                // 如果打开此信息窗口，模拟触发点击事件
                if (marker && marker.triggerEvent) {
                    marker.triggerEvent('click');
                }
                
                console.log(LOG_PREFIX + '打开信息窗口:', this.content);
                return this;
            }
            
            close() {
                this.map = null;
                this.marker = null;
                return this;
            }
            
            setContent(content) {
                this.content = content;
                return this;
            }
        }
        
        // 创建模拟的经纬度类
        class MockLatLng {
            constructor(lat, lng) {
                this.lat_ = lat;
                this.lng_ = lng;
            }
            
            lat() {
                return this.lat_;
            }
            
            lng() {
                return this.lng_;
            }
            
            toString() {
                return `(${this.lat_}, ${this.lng_})`;
            }
        }
        
        // 创建一个模拟的地图对象
        const mockMapInstance = new MockMap(document.getElementById('map'), {
            center: MELBOURNE_CENTER,
            zoom: 13
        });
        
        // 设置全局变量
        window.map = mockMapInstance;
        window.google.maps.Map = MockMap;
        window.google.maps.Marker = MockMarker;
        window.google.maps.InfoWindow = MockInfoWindow;
        window.google.maps.LatLng = MockLatLng;
        window.google.maps.LatLngBounds = function() {
            return {
                extend: () => this,
                getCenter: () => MELBOURNE_CENTER
            };
        };
        window.google.maps.event = {
            addListener: (instance, event, callback) => {
                if (instance && instance.addListener) {
                    return instance.addListener(event, callback);
                }
                return { remove: () => {} };
            },
            removeListener: (listener) => {
                if (listener && listener.remove) {
                    listener.remove();
                }
            }
        };
        window.google.maps.MapTypeId = {
            ROADMAP: 'roadmap',
            SATELLITE: 'satellite',
            HYBRID: 'hybrid',
            TERRAIN: 'terrain'
        };
        window.google.maps.Animation = {
            DROP: 'drop',
            BOUNCE: 'bounce'
        };
        window.google.maps.Circle = function() {
            return {
                setMap: () => {}
            };
        };
        window.google.maps.Geocoder = function() {
            return {
                geocode: (request, callback) => {
                    // 模拟地理编码结果
                    setTimeout(() => {
                        callback([{
                            geometry: {
                                location: new MockLatLng(MELBOURNE_CENTER.lat, MELBOURNE_CENTER.lng)
                            }
                        }], 'OK');
                    }, 500);
                }
            };
        };
        window.google.maps.GeocoderStatus = {
            OK: 'OK',
            ERROR: 'ERROR'
        };
        window.google.maps.places = window.google.maps.places || {};
        window.google.maps.places.PlacesService = function() {
            return {
                nearbySearch: (request, callback) => {
                    // 空结果
                    setTimeout(() => callback([], 'ZERO_RESULTS'), 500);
                }
            };
        };
        window.google.maps.SymbolPath = {
            CIRCLE: 0
        };
        
        // 初始化其他关键组件
        initializeOtherComponents();
        
        console.log(LOG_PREFIX + '地图API模拟对象创建完成，应用现在应该可以正常运行');
        
        // 通知应用地图已"加载"
        notifyMapReady();
    }
    
    // 显示离线地图通知
    function showOfflineMapNotice() {
        const noticeContainer = document.createElement('div');
        noticeContainer.id = 'offlineMapNotice';
        noticeContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0,0,0,0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            text-align: center;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        `;
        noticeContainer.textContent = '地图尚未加载，应用处于离线模式';
        
        document.body.appendChild(noticeContainer);
        
        // 5秒后隐藏通知
        setTimeout(() => {
            noticeContainer.style.opacity = '0';
            noticeContainer.style.transition = 'opacity 0.5s ease';
            
            // 完全移除元素
            setTimeout(() => {
                noticeContainer.remove();
            }, 500);
        }, 5000);
    }
    
    // 初始化其他关键组件
    function initializeOtherComponents() {
        // 确保 MELBOURNE_CENTER 全局变量存在
        if (typeof window.MELBOURNE_CENTER === 'undefined') {
            window.MELBOURNE_CENTER = MELBOURNE_CENTER;
            console.log(LOG_PREFIX + '设置 MELBOURNE_CENTER 全局变量');
        }
        
        // 确保 addReportMarker 函数存在
        if (typeof window.addReportMarker !== 'function') {
            window.addReportMarker = function(location, description, id, imageUrl) {
                console.log(LOG_PREFIX + '添加报告标记:', location, description);
                
                // 创建一个模拟标记
                const marker = new window.google.maps.Marker({
                    position: location,
                    map: window.map,
                    title: description
                });
                
                // 为标记添加点击事件
                marker.addListener('click', function() {
                    console.log(LOG_PREFIX + '点击标记:', description);
                    
                    // 如果存在showReportDetails函数，则调用它
                    if (typeof window.showReportDetails === 'function') {
                        window.showReportDetails({
                            id: id || 'marker-' + Date.now(),
                            location: location,
                            description: description,
                            time: new Date().toISOString(),
                            image: imageUrl || '',
                            emoji: '🐶'
                        });
                    }
                });
                
                // 将标记添加到全局标记数组
                if (!window.markers) window.markers = [];
                window.markers.push(marker);
                
                return marker;
            };
            
            console.log(LOG_PREFIX + '创建 addReportMarker 函数');
        }
        
        // 确保 saveMarkersToStorage 函数存在
        if (typeof window.saveMarkersToStorage !== 'function') {
            window.saveMarkersToStorage = function() {
                if (!window.markers || window.markers.length === 0) {
                    return;
                }
                
                try {
                    const markerData = window.markers.map(function(marker) {
                        return {
                            lat: marker.position.lat || marker.position.lat(),
                            lng: marker.position.lng || marker.position.lng(),
                            description: marker.title || marker.getTitle() || ''
                        };
                    });
                    
                    localStorage.setItem('savedMarkers', JSON.stringify(markerData));
                    console.log(LOG_PREFIX + '标记已保存到localStorage');
                } catch (error) {
                    console.error(LOG_PREFIX + '保存标记到localStorage失败:', error);
                }
            };
            
            console.log(LOG_PREFIX + '创建 saveMarkersToStorage 函数');
        }
        
        // 模拟地图初始化完成
        window.mapsInitialized = true;
    }
    
    // 通知应用地图已"加载"
    function notifyMapReady() {
        // 调用注册的回调函数
        if (window.mapReadyCallbacks && window.mapReadyCallbacks.length) {
            console.log(LOG_PREFIX + '执行地图就绪回调函数');
            window.mapReadyCallbacks.forEach(function(callback) {
                try {
                    callback();
                } catch (error) {
                    console.error(LOG_PREFIX + '执行回调函数时出错:', error);
                }
            });
        }
        
        // 触发自定义事件
        const mapReadyEvent = new Event('map_ready');
        document.dispatchEvent(mapReadyEvent);
        
        console.log(LOG_PREFIX + '应用已通知地图加载完成');
    }
    
    // 如果页面已加载，立即执行检查
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(function() {
            if (typeof google === 'undefined' || typeof google.maps === 'undefined' || !window.map) {
                console.warn(LOG_PREFIX + '页面已加载但Google Maps仍未加载，立即创建应急替代方案');
                createMapsEmergencyFallback();
            }
        }, 1000);
    }
    
    console.log(LOG_PREFIX + '紧急地图修复模块加载完成');
})(); 