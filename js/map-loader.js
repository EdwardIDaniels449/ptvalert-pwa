/**
 * 地图加载辅助脚本
 * 确保Google Maps API正确加载和初始化
 */

(function() {
    // 墨尔本中心坐标 - 全局声明以避免引用错误
    window.MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
    
    // 检查Google Maps是否已加载的变量
    let checkCount = 0;
    const maxChecks = 6; // 减少最大尝试次数，避免移动设备上多次重试导致内存问题
    
    // 设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // 地图初始设置 - 将在google.maps可用后定义
    let MAP_CONFIG = null;

    function defineMapConfig() {
        // 检查 google 对象是否存在，如果不存在则不尝试定义
        if (typeof google === 'undefined') {
            console.log('[地图加载器] google 对象不可用，暂不定义 MAP_CONFIG');
            return;
        }
        
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
            MAP_CONFIG = {
                center: window.MELBOURNE_CENTER, // 使用全局变量
                zoom: 13, // 统一桌面端和移动端使用相同的缩放级别
                minZoom: 5,
                maxZoom: 19,
                gestureHandling: isMobile ? 'greedy' : 'auto', // 移动端使用贪婪手势处理
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: false,  // 禁用地图类型控件
                streetViewControl: false, // 禁用街景
                fullscreenControl: false, // 禁用全屏按钮
                zoomControl: true,       // 启用缩放控件
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                // 添加样式以移除POI标签，使移动端和桌面端地图外观一致
                styles: [{
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }],
                clickableIcons: false // 禁用默认POI点击，提高性能并统一体验
            };
            console.log('[地图加载器] MAP_CONFIG 已定义');
        } else {
            console.error('[地图加载器] 尝试定义 MAP_CONFIG 失败，google.maps 不可用。');
        }
    }
    
    // 地图加载超时 - 移动设备使用更短的超时时间
    const MAP_LOAD_TIMEOUT = isMobile ? 10000 : 15000; // 10秒 (移动) / 15秒 (桌面)
    let mapLoadTimer = null;
    
    // 当DOM完全加载后执行
    window.addEventListener('DOMContentLoaded', function() {
        console.log('[地图加载器] DOM已加载，准备初始化地图');

        // 设置地图加载超时
        mapLoadTimer = setTimeout(function() {
            console.warn('[地图加载器] 地图加载超时');
            
            // 清理任何可能的内存泄漏
            cleanupMapResources();
            
            // 创建备用地图
            createFallbackMap();
        }, MAP_LOAD_TIMEOUT);
        
        // 检查地图容器元素
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('[地图加载器] 找不到地图容器元素!');
            // 创建地图容器
            createMapContainer();
            return;
        }

        // 确保地图容器有正确的样式
        ensureMapStyles(mapElement);
        
        // 开始检查Google Maps API
        if (isMobile) {
            // 移动设备: 延迟开始检查，避免首屏渲染期间执行过多JS
            setTimeout(function() {
                checkGoogleMapsAPI();
            }, 500);
                } else {
            // 桌面: 立即开始检查
            checkGoogleMapsAPI();
                }

        // 为移动设备添加meta viewport确保缩放和显示正确
        if (isMobile && !document.querySelector('meta[name="viewport"]')) {
            const metaViewport = document.createElement('meta');
            metaViewport.name = 'viewport';
            metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(metaViewport);
            console.log('[地图加载器] 添加了viewport meta标签');
        }
    });
    
    // 清理地图资源
    function cleanupMapResources() {
        // 移除任何可能正在加载的地图脚本
        const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
        scripts.forEach(function(script) {
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        });
        
        // 清除可能的超时计时器
        if (mapLoadTimer) {
            clearTimeout(mapLoadTimer);
            mapLoadTimer = null;
        }
        
        // 重置检查计数
        checkCount = 0;
    }
    
    // 确保地图容器样式正确
    function ensureMapStyles(mapElement) {
        // 基础样式 - 统一桌面端和移动端
        mapElement.style.width = '100%';
        mapElement.style.height = '100vh';
        mapElement.style.position = isMobile ? 'fixed' : 'absolute';
        mapElement.style.top = '0';
        mapElement.style.left = '0';
        mapElement.style.zIndex = '1';
        mapElement.style.backgroundColor = '#f5f5f5';
        
        // 移动设备特定样式
        if (isMobile) {
            // 优化触摸处理
            mapElement.style.touchAction = 'pan-x pan-y';
            mapElement.style.overflowX = 'hidden';
            mapElement.style.overflowY = 'hidden';
            
            // iOS特定修复
            if (isIOS) {
                mapElement.style.webkitOverflowScrolling = 'touch';
                mapElement.style.height = 'calc(100vh - env(safe-area-inset-bottom))';
            }
            
            // 硬件加速
            mapElement.style.transform = 'translateZ(0)';
            mapElement.style.webkitTransform = 'translateZ(0)';
            mapElement.style.backfaceVisibility = 'hidden';
            mapElement.style.webkitBackfaceVisibility = 'hidden';
        }
        
        console.log('[地图加载器] 已确保地图容器样式正确');
    }
    
    // 创建地图容器
    function createMapContainer() {
        console.log('[地图加载器] 创建地图容器元素');
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map';
        ensureMapStyles(mapDiv);
        
        // 插入到body的最前面
        if (document.body.firstChild) {
            document.body.insertBefore(mapDiv, document.body.firstChild);
        } else {
            document.body.appendChild(mapDiv);
        }
    }
    
    // 检查Google Maps API是否已加载
    function checkGoogleMapsAPI() {
        if (checkCount >= maxChecks) {
            console.error('[地图加载器] 尝试加载Google Maps API失败，已达到最大尝试次数');
            
            // 清理资源
            cleanupMapResources();
            
            // 显示错误信息给用户
            createFallbackMap();
            return;
        }
        
        console.log('[地图加载器] 检查Google Maps API，尝试次数: ' + (checkCount + 1));
        
        if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
            // Google Maps API未加载，尝试加载
            console.log('[地图加载器] Google Maps API未加载，尝试加载');
            
            // 移动设备: 使用更短的递增间隔，避免长时间等待
            const retryInterval = isMobile ? 
                Math.min(1000 * (checkCount + 1), 3000) : // 移动端最多等待3秒
                2000; // 桌面端固定2秒
                
            loadGoogleMapsScript();
            
            // 延迟再次检查
            checkCount++;
            setTimeout(checkGoogleMapsAPI, retryInterval);
        } else {
            console.log('[地图加载器] Google Maps API已加载');
            
            // 定义 MAP_CONFIG，因为它依赖 google.maps
            if (!MAP_CONFIG) {
                defineMapConfig();
            }

            // 清除超时计时器
            if (mapLoadTimer) {
                clearTimeout(mapLoadTimer);
                mapLoadTimer = null;
            }
            
            // 检查地图是否已初始化
            if (typeof window.map === 'undefined' || !window.map) {
                console.log('[地图加载器] 地图未初始化，尝试初始化');
                
                // 确保 handleMapInitError 在全局可用
                if (typeof window.handleMapInitError !== 'function') {
                    // 创建备用的 handleMapInitError 函数
                    window.handleMapInitError = function() {
                        console.log('[地图加载器] 使用备用的 handleMapInitError 函数');
                        createFallbackMap();
                    };
                }
                
                // 调用initMap
                if (typeof window.initMap === 'function') {
                    try {
                        window.initMap();
                        console.log('[地图加载器] 地图已成功初始化');
                    } catch (error) {
                        console.error('[地图加载器] 初始化地图时出错:', error);
                        
                        // 处理初始化错误
                        if (typeof window.handleMapInitError === 'function') {
                            window.handleMapInitError();
                        } else {
                            // 移动设备: 减少重试次数
                            if (isMobile && checkCount >= maxChecks / 2) {
                                console.warn('[地图加载器] 移动设备上多次初始化失败，切换到备用地图');
                                createFallbackMap();
                                return;
                            }
                            
                            // 延迟再次尝试
                            checkCount++;
                            setTimeout(checkGoogleMapsAPI, 1000);
                        }
                    }
                } else {
                    console.error('[地图加载器] initMap函数不存在');
                    // 尝试创建我们自己的地图初始化函数
                    createMapInitFunction();
                }
            } else {
                console.log('[地图加载器] 地图已初始化');
            }
        }
    }
    
    // 加载Google Maps脚本
    function loadGoogleMapsScript() {
        // 检查是否已存在相同的脚本
        const existingScripts = document.getElementsByTagName('script');
        for (let i = 0; i < existingScripts.length; i++) {
            if (existingScripts[i].src.includes('maps.googleapis.com/maps/api/js')) {
                console.log('[地图加载器] Google Maps API脚本已存在，不再重复加载');
                return;
            }
        }
        
        // 创建新的脚本元素
        const script = document.createElement('script');
        
        // 移动设备: 减少加载库数量以提高性能
        if (isMobile) {
            script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=googleMapsLoadedCallback&v=weekly";
        } else {
            script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=googleMapsLoadedCallback&libraries=places&v=weekly";
        }
        
        script.async = true;
        script.defer = true;
        
        // 添加错误处理
        script.onerror = function() {
            console.error('[地图加载器] 加载Google Maps API失败');
            
            // 不论移动还是桌面设备，都先显示错误然后尝试备用方案
            showMapLoadError();
            
            // 延迟一段时间后尝试备用方案
            setTimeout(function() {
                createFallbackMap();
            }, 3000);
        };
        
        // 添加加载超时处理
        const scriptTimeout = setTimeout(function() {
            console.error('[地图加载器] 加载Google Maps API脚本超时');
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            createFallbackMap();
        }, isMobile ? 8000 : 12000); // 移动设备使用更短的脚本加载超时
        
        // 清除超时处理
        script.onload = function() {
            clearTimeout(scriptTimeout);
        };
        
        // 将脚本添加到文档中
        document.body.appendChild(script);
        console.log('[地图加载器] 已添加Google Maps API脚本');
    }
    
    // 创建地图初始化函数
    function createMapInitFunction() {
        console.log('[地图加载器] 创建自定义地图初始化函数');
        
        window.initMap = function() {
            try {
                console.log('[地图加载器] 执行自定义initMap函数');
                
                // 使用统一的地图配置
                const mapOptions = MAP_CONFIG;
                
                // 创建地图实例
                window.map = new google.maps.Map(document.getElementById('map'), mapOptions);
                
                // 对移动设备进行额外配置
                if (isMobile) {
                    // 禁用点选POI (兴趣点)
                    window.map.setOptions({
                        clickableIcons: false,
                        disableDefaultUI: true,
                        zoomControl: true,
                        zoomControlOptions: {
                            position: google.maps.ControlPosition.RIGHT_BOTTOM
                        }
                    });
                    
                    // 添加自定义处理避免长按触发右键菜单
                    const mapDiv = document.getElementById('map');
                    if (mapDiv) {
                        mapDiv.addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                            return false;
                        });
                    }
                }
                
                // 标记地图已初始化
                window.mapsInitialized = true;
                console.log('[地图加载器] 地图成功初始化');
                
                // 清除超时计时器
                if (mapLoadTimer) {
                    clearTimeout(mapLoadTimer);
                    mapLoadTimer = null;
                }
                
                // 分发地图就绪事件
                const mapReadyEvent = new CustomEvent('map_ready');
                document.dispatchEvent(mapReadyEvent);
                
                return window.map;
            } catch (error) {
                console.error('[地图加载器] 自定义initMap函数出错:', error);
                createFallbackMap();
            }
        };
        
        // 尝试调用
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
            window.initMap();
        }
    }
    
    // 创建备用地图方案
    function createFallbackMap() {
        // 确保此函数只执行一次
        if (window.fallbackMapCreated) {
            return;
        }
        window.fallbackMapCreated = true;
        
        console.log('[地图加载器] 创建备用地图方案');
        
        // 修改地图容器样式
        const mapElement = document.getElementById('map');
        if (mapElement) {
            // 使用渐变背景代替地图
            mapElement.style.backgroundImage = 'linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%)';
            mapElement.style.backgroundSize = 'cover';
        }
        
        // 创建模拟地图对象，提供基本功能
        window.google = window.google || {};
        window.google.maps = window.google.maps || {};
        
        // 创建基本的地图对象
        window.map = {
            getCenter: function() {
                return {
                    lat: function() { return window.MELBOURNE_CENTER.lat; },
                    lng: function() { return window.MELBOURNE_CENTER.lng; }
                };
            },
            setCenter: function() { return this; },
            addListener: function(event, callback) {
                // 记录事件监听，但不实际执行
                console.log('[地图加载器][模拟] 添加事件监听:', event);
                return { remove: function() {} };
            },
            getZoom: function() { return 13; },
            setZoom: function() { return this; },
            panTo: function() { return this; },
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
            }
        };
        
        // 创建模拟标记类
        window.google.maps.Marker = function(options) {
            this.options = options || {};
            this.map = options.map || null;
            this.position = options.position || window.MELBOURNE_CENTER;
            this.visible = options.visible !== false;
            this.animation = options.animation || null;
            this.title = options.title || '';
            this.label = options.label || null;
            this.icon = options.icon || null;
            
            // 构造函数调用时，如果有地图，则直接添加到地图上
            if (this.map && typeof this.map === 'object') {
                console.log('[地图加载器][模拟] 创建标记并添加到地图:', this.position);
            }
            
            return {
                setMap: function(map) { 
                    this.map = map; 
                    console.log('[地图加载器][模拟] 设置标记地图:', map ? '添加到地图' : '从地图移除');
                    return this; 
                },
                getMap: function() {
                    return this.map;
                },
                getPosition: function() {
                    return {
                        lat: function() { return options.position.lat; },
                        lng: function() { return options.position.lng; }
                    };
                },
                setVisible: function(visible) { 
                    this.visible = visible; 
                    return this; 
                },
                setAnimation: function(animation) {
                    this.animation = animation;
                    return this;
                },
                addListener: function(event, callback) {
                    console.log('[地图加载器][模拟] 为标记添加事件监听:', event);
                    if (event === 'click' && typeof callback === 'function') {
                        // 立即调用一次回调以测试
                        setTimeout(callback, 1000);
                    }
                    return { remove: function() {} };
                }
            };
        };
        
        // 创建模拟信息窗口类
        window.google.maps.InfoWindow = function() {
            return {
                open: function() { return this; },
                close: function() { return this; }
            };
        };
        
        // 提供MapTypeId常量
        window.google.maps.MapTypeId = {
            ROADMAP: 'roadmap',
            SATELLITE: 'satellite',
            HYBRID: 'hybrid',
            TERRAIN: 'terrain'
        };
        
        // 提供Animation常量
        window.google.maps.Animation = {
            DROP: 'DROP',
            BOUNCE: 'BOUNCE'
        };
        
        // 提供事件API
        window.google.maps.event = window.google.maps.event || {
            addListener: function(instance, eventName, handler) {
                console.log('[地图加载器][模拟] 添加事件监听:', eventName);
                // 存储处理程序，以便可以手动触发
                if (!instance._eventListeners) {
                    instance._eventListeners = {};
                }
                if (!instance._eventListeners[eventName]) {
                    instance._eventListeners[eventName] = [];
                }
                instance._eventListeners[eventName].push(handler);
                
                return { 
                    remove: function() {
                        if (instance._eventListeners && instance._eventListeners[eventName]) {
                            const index = instance._eventListeners[eventName].indexOf(handler);
                            if (index !== -1) {
                                instance._eventListeners[eventName].splice(index, 1);
                            }
                        }
                    } 
                };
            },
            removeListener: function(listener) {
                if (listener && typeof listener.remove === 'function') {
                    listener.remove();
                }
            },
            trigger: function(instance, eventName, eventArgs) {
                if (instance._eventListeners && instance._eventListeners[eventName]) {
                    instance._eventListeners[eventName].forEach(function(handler) {
                        handler(eventArgs);
                    });
                }
            }
        };
        
        // 通知系统地图已"初始化"
        window.mapsInitialized = true;
        
        // 触发mapReady事件
        const mapReadyEvent = new CustomEvent('map_ready');
        document.dispatchEvent(mapReadyEvent);
        
        // 如果有回调数组，执行它们
        if (window.mapReadyCallbacks && window.mapReadyCallbacks.length) {
            window.mapReadyCallbacks.forEach(function(callback) {
                try {
                    callback();
                } catch (e) {
                    console.error('[地图加载器] 执行回调时出错:', e);
                }
            });
        }
        
        showFallbackMapNotice();
    }
    
    // 显示地图加载错误
    function showMapLoadError() {
        // 创建错误消息元素
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(255, 59, 48, 0.9)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.maxWidth = '80%';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = '9999';
        
        // 移动设备使用更简单的消息
        if (isMobile) {
            errorDiv.innerHTML = `
                <h3 style="margin-top:0">地图加载失败</h3>
                <p>请检查网络连接后重试</p>
                <button onclick="location.reload()" style="background-color:white;color:#ff3b30;border:none;padding:8px 16px;border-radius:5px;font-weight:bold;cursor:pointer;margin-top:10px;">刷新</button>
            `;
    } else {
            errorDiv.innerHTML = `
                <h3 style="margin-top:0">地图加载失败</h3>
                <p>无法加载Google地图，请检查您的网络连接或刷新页面重试。</p>
                <button onclick="location.reload()" style="background-color:white;color:#ff3b30;border:none;padding:8px 16px;border-radius:5px;font-weight:bold;cursor:pointer;margin-top:10px;">刷新页面</button>
            `;
        }
        
        document.body.appendChild(errorDiv);
        
        // 自动关闭错误提示（移动设备）
        if (isMobile) {
            setTimeout(function() {
                // 尝试创建备用方案
                createFallbackMap();
                
                // 淡出并移除错误信息
                errorDiv.style.transition = 'opacity 0.5s';
                errorDiv.style.opacity = '0';
                setTimeout(function() {
                    if (errorDiv.parentNode) {
                        errorDiv.parentNode.removeChild(errorDiv);
                    }
                }, 500);
            }, 3000);
        }
    }
    
    // 显示备用地图通知
    function showFallbackMapNotice() {
        const notice = document.createElement('div');
        notice.style.position = 'fixed';
        notice.style.top = '50px';
        notice.style.left = '50%';
        notice.style.transform = 'translateX(-50%)';
        notice.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notice.style.color = 'white';
        notice.style.padding = '8px 16px';
        notice.style.borderRadius = '20px';
        notice.style.fontSize = '14px';
        notice.style.zIndex = '1000';
        notice.style.textAlign = 'center';
        notice.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
        notice.textContent = '地图加载受限，但功能正常可用';
        
        document.body.appendChild(notice);
        
        // 自动隐藏通知
        setTimeout(function() {
            notice.style.transition = 'opacity 0.5s';
            notice.style.opacity = '0';
            setTimeout(function() {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
            }
            }, 500);
        }, 4000);
    }
})(); 