/**
 * 地图加载辅助脚本
 * 确保Google Maps API正确加载和初始化
 */

(function() {
    // 检查Google Maps是否已加载的变量
    let checkCount = 0;
    const maxChecks = 6; // 减少最大尝试次数，避免移动设备上多次重试导致内存问题
    
    // 设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
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
        // 移动设备特定样式
        if (isMobile) {
            // 优化触摸处理
            mapElement.style.touchAction = 'pan-x pan-y';
        }
        
        // 通用样式
        mapElement.style.width = '100%';
        mapElement.style.height = '100vh';
        mapElement.style.position = 'absolute';
        mapElement.style.top = '0';
        mapElement.style.left = '0';
        mapElement.style.zIndex = '1';
        mapElement.style.backgroundColor = '#f5f5f5';
        
        // 添加硬件加速
        mapElement.style.transform = 'translateZ(0)';
        mapElement.style.backfaceVisibility = 'hidden';
        
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
            
            // 清除超时计时器
            if (mapLoadTimer) {
                clearTimeout(mapLoadTimer);
                mapLoadTimer = null;
            }
            
            // 检查地图是否已初始化
            if (typeof window.map === 'undefined' || !window.map) {
                console.log('[地图加载器] 地图未初始化，尝试初始化');
                
                // 调用initMap
                if (typeof window.initMap === 'function') {
                    try {
                        window.initMap();
                        console.log('[地图加载器] 地图已成功初始化');
                    } catch (error) {
                        console.error('[地图加载器] 初始化地图时出错:', error);
                        
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
            
            // 移动设备直接使用备用方案，不再重试
            if (isMobile) {
                createFallbackMap();
            } else {
                showMapLoadError();
            }
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
        
        // 定义墨尔本中心坐标
        const MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
        
        // 创建全局initMap函数
        window.initMap = function() {
            console.log('[地图加载器] 自定义initMap函数被调用');
            
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error('[地图加载器] 找不到地图容器元素');
                return;
            }
            
            // 创建地图 - 移动设备使用更简单的配置
            const mapOptions = {
                center: MELBOURNE_CENTER,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                fullscreenControl: false,
                streetViewControl: false,
                // 移动设备优化
                zoomControl: !isMobile,
                mapTypeControl: false,
                gestureHandling: isMobile ? 'greedy' : 'auto',
                disableDefaultUI: isMobile,
                clickableIcons: false,
                maxZoom: 18,
                minZoom: 10
            };
            
            try {
                // 使用延迟初始化以减少初始加载时的CPU使用
                setTimeout(function() {
                    window.map = new google.maps.Map(mapElement, mapOptions);
                    
                    // 移动设备减少标记数量
                    if (!isMobile) {
                        // 桌面添加中心标记
                        new google.maps.Marker({
                            position: MELBOURNE_CENTER,
                            map: window.map,
                            title: "墨尔本中心"
                        });
                    }
                    
                    console.log('[地图加载器] 地图已通过自定义函数初始化');
                    
                    // 标记初始化完成
                    window.mapsInitialized = true;
                }, isMobile ? 200 : 50);
            } catch (error) {
                console.error('[地图加载器] 创建地图对象时出错:', error);
                createFallbackMap();
            }
        };
        
        // 尝试调用initMap
        try {
            window.initMap();
        } catch (error) {
            console.error('[地图加载器] 调用自定义initMap函数失败:', error);
            createFallbackMap();
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
        
        // 定义墨尔本中心坐标
        const MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
        window.MELBOURNE_CENTER = MELBOURNE_CENTER;
        
        // 创建基本的地图对象
        window.map = {
            getCenter: function() {
                return {
                    lat: function() { return MELBOURNE_CENTER.lat; },
                    lng: function() { return MELBOURNE_CENTER.lng; }
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
                            lat: function() { return MELBOURNE_CENTER.lat + 0.1; }, 
                            lng: function() { return MELBOURNE_CENTER.lng + 0.1; } 
                        }; 
                    },
                    getSouthWest: function() { 
                        return { 
                            lat: function() { return MELBOURNE_CENTER.lat - 0.1; }, 
                            lng: function() { return MELBOURNE_CENTER.lng - 0.1; } 
                        }; 
                    }
                };
            }
        };
        
        // 创建模拟标记类
        window.google.maps.Marker = function(options) {
            return {
                setMap: function() { return this; },
                getPosition: function() {
                    return {
                        lat: function() { return options.position.lat; },
                        lng: function() { return options.position.lng; }
                    };
                },
                setVisible: function() { return this; }
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