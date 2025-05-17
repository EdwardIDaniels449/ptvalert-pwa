/**
 * 移动端性能优化脚本
 * 解决移动端卡顿、渲染慢的问题
 */

(function() {
    console.log('[性能优化] 初始化...');
    
    // 配置参数
    var config = {
        // 帧率检测
        enableFpsMonitor: false,        // 是否启用FPS监控
        fpsThreshold: 30,               // FPS低于此值时进行优化
        
        // 内存管理
        memoryCleanInterval: 60000,     // 内存清理间隔(ms)
        
        // 图片懒加载
        lazyLoadImages: true,           // 是否启用图片懒加载
        lazyLoadDistance: 200,          // 图片提前加载距离(px)
        
        // DOM优化
        maxDomDepth: 15,                // 最大DOM嵌套深度，超过则警告
        maxDomNodes: 1000,              // 最大DOM节点数，超过则警告
        
        // 事件优化
        eventThrottleTime: 100,         // 事件节流时间(ms)
        
        // 渲染优化
        useHardwareAcceleration: true,  // 使用硬件加速
        reduceAnimationsOnSlowDevices: true // 在低性能设备上减少动画
    };
    
    // 性能检测结果
    var perfInfo = {
        isLowEndDevice: false,          // 是否是低端设备
        deviceRating: 0,                // 设备性能评分(0-10)
        averageFps: 60,                 // 平均帧率
        memoryUsage: 0,                 // 内存使用率
        hasSlowNetwork: false,          // 是否慢网络
        batteryLevel: 1,                // 电池电量(0-1)
        isBatterySaving: false          // 是否在省电模式
    };
    
    /**
     * 设备性能检测
     */
    function detectDevicePerformance() {
        // 检测低端设备
        var isLowEndDevice = checkIfLowEndDevice();
        perfInfo.isLowEndDevice = isLowEndDevice;
        
        if (isLowEndDevice) {
            console.log('[性能优化] 检测到低性能设备，启用性能优化');
            enableLowEndOptimizations();
        }
        
        // 尝试获取电池信息
        tryGetBatteryInfo();
        
        // 检测网络状况
        checkNetworkCondition();
    }
    
    /**
     * 检查是否是低端设备
     */
    function checkIfLowEndDevice() {
        // 使用硬件并发数作为CPU性能指标
        var hardwareConcurrency = navigator.hardwareConcurrency || 1;
        
        // 使用设备内存作为性能指标
        var deviceMemory = navigator.deviceMemory || 1;
        
        // 设备评分计算
        var deviceScore = (hardwareConcurrency * 0.6) + (deviceMemory * 0.4);
        perfInfo.deviceRating = Math.min(10, deviceScore);
        
        // 评分低于4认为是低端设备
        var isLowEnd = deviceScore < 4;
        
        // 旧设备检测
        var isOldDevice = /iPhone (5|6|7|8)|iPad Air|iPad Mini 2|Android 5|Android 6/i.test(navigator.userAgent);
        
        console.log('[性能优化] 设备性能评分:', deviceScore.toFixed(1), 
            '(CPU核心:', hardwareConcurrency, 
            '内存:', deviceMemory, 'GB',
            '低端设备:', isLowEnd || isOldDevice,
            '旧设备:', isOldDevice, ')');
        
        return isLowEnd || isOldDevice;
    }
    
    /**
     * 尝试获取电池信息
     */
    function tryGetBatteryInfo() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(function(battery) {
                perfInfo.batteryLevel = battery.level;
                perfInfo.isBatterySaving = battery.level < 0.2;
                
                console.log('[性能优化] 电池信息:', 
                    '电量:', Math.round(battery.level * 100) + '%',
                    '充电状态:', battery.charging ? '充电中' : '未充电');
                
                if (perfInfo.isBatterySaving) {
                    console.log('[性能优化] 检测到低电量，启用节能模式');
                    // 启用节能优化
                    enableBatterySavingMode();
                }
                
                // 监听电池状态变化
                battery.addEventListener('levelchange', function() {
                    perfInfo.batteryLevel = battery.level;
                    perfInfo.isBatterySaving = battery.level < 0.2;
                    
                    if (perfInfo.isBatterySaving) {
                        enableBatterySavingMode();
                    }
                });
            });
        }
    }
    
    /**
     * 检测网络状况
     */
    function checkNetworkCondition() {
        if ('connection' in navigator) {
            var connection = navigator.connection;
            
            // 检测慢网络
            perfInfo.hasSlowNetwork = connection.effectiveType === 'slow-2g' || 
                                     connection.effectiveType === '2g' ||
                                     connection.downlink < 0.5;
            
            console.log('[性能优化] 网络信息:', 
                '类型:', connection.effectiveType,
                '下行速度:', connection.downlink, 'Mbps',
                '延迟:', connection.rtt, 'ms',
                '慢网络:', perfInfo.hasSlowNetwork);
            
            if (perfInfo.hasSlowNetwork) {
                console.log('[性能优化] 检测到慢网络，启用网络优化');
                // 启用网络优化
                enableSlowNetworkOptimizations();
            }
            
            // 监听网络变化
            connection.addEventListener('change', function() {
                checkNetworkCondition();
            });
        }
    }
    
    /**
     * 低端设备优化
     */
    function enableLowEndOptimizations() {
        // 减少DOM复杂度
        simplifyDOMForLowEndDevices();
        
        // 减少动画效果
        if (config.reduceAnimationsOnSlowDevices) {
            reduceAnimations();
        }
        
        // 降低地图复杂度
        if (window.map && typeof window.map.setOptions === 'function') {
            window.setTimeout(function() {
                try {
                    // 减少地图细节
                    window.map.setOptions({
                        disableDefaultUI: true,
                        zoomControl: true,
                        styles: getSimplifiedMapStyle()
                    });
                    console.log('[性能优化] 已优化地图复杂度');
                } catch (e) {
                    console.error('[性能优化] 地图优化失败:', e);
                }
            }, 1000);
        }
        
        // 更激进的内存管理
        setupAggressiveMemoryManagement();
        
        // 减少地图标记密度
        if (window.markers && window.markers.length > 20) {
            console.log('[性能优化] 标记数量过多，进行聚合或减少显示');
            reduceMarkerDensity();
        }
    }
    
    /**
     * 精简低端设备DOM
     */
    function simplifyDOMForLowEndDevices() {
        // 延迟执行，确保DOM已加载
        window.addEventListener('load', function() {
            // 移除不必要的动画元素
            document.querySelectorAll('.animated, .danmaku-container').forEach(function(el) {
                if (el.parentNode) {
                    console.log('[性能优化] 移除动画元素:', el.className);
                    el.style.display = 'none';
                }
            });
            
            // 简化复杂DOM结构
            simplifyDeepDOM();
        });
    }
    
    /**
     * 简化过深的DOM结构
     */
    function simplifyDeepDOM() {
        // 查找深度过大的DOM
        var elements = document.body.getElementsByTagName('*');
        var deepElements = [];
        
        for (var i = 0; i < elements.length; i++) {
            var depth = getElementDepth(elements[i]);
            if (depth > config.maxDomDepth) {
                deepElements.push({element: elements[i], depth: depth});
            }
        }
        
        if (deepElements.length > 0) {
            console.log('[性能优化] 发现', deepElements.length, '个深度过大的DOM元素');
            
            // 对于最深的10个元素，尝试简化
            deepElements.sort(function(a, b) {
                return b.depth - a.depth;
            }).slice(0, 10).forEach(function(item) {
                console.log('[性能优化] 简化深度为', item.depth, '的元素:', item.element.tagName);
                // 这里可以根据需要实现具体的简化逻辑
            });
        }
    }
    
    /**
     * 获取元素的DOM深度
     */
    function getElementDepth(element) {
        var depth = 0;
        var parent = element;
        
        while (parent && parent !== document.body) {
            depth++;
            parent = parent.parentNode;
        }
        
        return depth;
    }
    
    /**
     * 减少动画效果
     */
    function reduceAnimations() {
        // 添加CSS类以减少动画
        document.documentElement.classList.add('reduce-animations');
        
        // 添加CSS样式以控制动画
        var style = document.createElement('style');
        style.textContent = `
            .reduce-animations * {
                transition-duration: 0.1s !important;
                transition-delay: 0s !important;
                animation-duration: 0.1s !important;
                animation-delay: 0s !important;
                animation-iteration-count: 1 !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('[性能优化] 已减少动画效果');
    }
    
    /**
     * 获取简化的地图样式
     */
    function getSimplifiedMapStyle() {
        return [
            {
                "featureType": "poi",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            }
        ];
    }
    
    /**
     * 设置更激进的内存管理
     */
    function setupAggressiveMemoryManagement() {
        // 定期清理内存
        setInterval(function() {
            if (window.gc && typeof window.gc === 'function') {
                window.gc();
            }
            
            // 清理可能的内存泄漏
            cleanupPossibleLeaks();
            
            console.log('[性能优化] 执行内存清理');
        }, config.memoryCleanInterval);
    }
    
    /**
     * 清理可能的内存泄漏
     */
    function cleanupPossibleLeaks() {
        // 清除没用的标记
        if (window.markers && Array.isArray(window.markers)) {
            for (var i = window.markers.length - 1; i >= 0; i--) {
                if (!window.markers[i] || typeof window.markers[i].getMap !== 'function') {
                    window.markers.splice(i, 1);
                }
            }
        }
        
        // 清除未使用的缓存
        try {
            if (window.localStorage && window.localStorage.length > 20) {
                // 找出可能需要清理的缓存
                var keysToClean = [];
                
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key.includes('temp') || key.includes('cache') || key.includes('old')) {
                        keysToClean.push(key);
                    }
                }
                
                if (keysToClean.length > 0) {
                    console.log('[性能优化] 清理', keysToClean.length, '个过期缓存');
                    keysToClean.forEach(function(key) {
                        localStorage.removeItem(key);
                    });
                }
            }
        } catch (e) {
            console.error('[性能优化] 清理缓存失败:', e);
        }
    }
    
    /**
     * 减少地图标记密度
     */
    function reduceMarkerDensity() {
        // 这里实现标记聚合或减少标记的逻辑
        // 具体实现取决于你的地图实现
        if (window.map && window.markers && window.markers.length > 20) {
            // 示例：只显示一定数量的标记
            var markersToShow = window.markers.slice(0, 20);
            
            // 隐藏其他标记
            for (var i = 20; i < window.markers.length; i++) {
                if (window.markers[i] && typeof window.markers[i].setMap === 'function') {
                    window.markers[i].setMap(null);
                }
            }
            
            console.log('[性能优化] 减少标记显示数量:', window.markers.length, '->', markersToShow.length);
        }
    }
    
    /**
     * 启用节能模式
     */
    function enableBatterySavingMode() {
        // 延迟非关键操作
        postponeNonCriticalOperations();
        
        // 减少地图更新频率
        throttleMapUpdates();
        
        // 降低动画数量和复杂度
        reduceAnimations();
        
        console.log('[性能优化] 已启用节能模式');
    }
    
    /**
     * 延迟非关键操作
     */
    function postponeNonCriticalOperations() {
        // 在这里实现延迟非关键操作的逻辑
        window.isLowPowerMode = true;
    }
    
    /**
     * 降低地图更新频率
     */
    function throttleMapUpdates() {
        // 在这里实现降低地图更新频率的逻辑
        if (window.map) {
            // 例如：减少地图移动时的重新渲染
            window.mapUpdateThrottled = true;
        }
    }
    
    /**
     * 为慢网络优化
     */
    function enableSlowNetworkOptimizations() {
        // 降低图片质量
        reduceImageQuality();
        
        // 预加载关键资源
        preloadCriticalResources();
        
        // 减少网络请求
        reduceNetworkRequests();
        
        console.log('[性能优化] 已启用慢网络优化');
    }
    
    /**
     * 降低图片质量
     */
    function reduceImageQuality() {
        // 将图片替换为低质量版本
        window.addEventListener('load', function() {
            document.querySelectorAll('img').forEach(function(img) {
                // 如果有高清图片，替换为低清版本
                if (img.src.includes('highres') || img.src.includes('2x') || img.src.includes('3x')) {
                    var lowresUrl = img.src
                        .replace('highres', 'lowres')
                        .replace('2x', '1x')
                        .replace('3x', '1x');
                    
                    // 确认低清版本与原始URL不同
                    if (lowresUrl !== img.src) {
                        console.log('[性能优化] 替换高清图片:', img.src, '->', lowresUrl);
                        img.src = lowresUrl;
                    }
                }
            });
        });
    }
    
    /**
     * 预加载关键资源
     */
    function preloadCriticalResources() {
        // 预加载关键资源的逻辑
        // 这通常在HTML中通过link标签实现
    }
    
    /**
     * 减少网络请求
     */
    function reduceNetworkRequests() {
        // 合并多个网络请求
        window.minimizeNetworkRequests = true;
        
        // 在这里实现具体的请求合并或减少逻辑
    }
    
    /**
     * 启用图片懒加载
     */
    function setupLazyLoading() {
        if (!config.lazyLoadImages) return;
        
        window.addEventListener('load', function() {
            var lazyImages = document.querySelectorAll('img[data-src]');
            
            if (lazyImages.length === 0) {
                // 如果没有预设的懒加载图片，尝试对普通图片应用懒加载
                document.querySelectorAll('img').forEach(function(img) {
                    if (!img.getAttribute('data-src') && !img.classList.contains('preload')) {
                        img.setAttribute('data-src', img.src);
                        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1透明图
                        img.classList.add('lazy-img');
                    }
                });
                
                lazyImages = document.querySelectorAll('.lazy-img');
            }
            
            console.log('[性能优化] 设置', lazyImages.length, '个图片懒加载');
            
            if ('IntersectionObserver' in window) {
                var lazyImageObserver = new IntersectionObserver(function(entries, observer) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            var lazyImage = entry.target;
                            lazyImage.src = lazyImage.getAttribute('data-src');
                            lazyImage.classList.remove('lazy-img');
                            lazyImageObserver.unobserve(lazyImage);
                        }
                    });
                }, {rootMargin: config.lazyLoadDistance + 'px'});
                
                lazyImages.forEach(function(lazyImage) {
                    lazyImageObserver.observe(lazyImage);
                });
            } else {
                // 回退方案：使用滚动事件
                var lazyLoadThrottleTimeout;
                
                function lazyLoad() {
                    if (lazyLoadThrottleTimeout) {
                        clearTimeout(lazyLoadThrottleTimeout);
                    }
                    
                    lazyLoadThrottleTimeout = setTimeout(function() {
                        var scrollTop = window.pageYOffset;
                        lazyImages.forEach(function(lazyImage) {
                            if (lazyImage.offsetTop < (window.innerHeight + scrollTop + config.lazyLoadDistance)) {
                                lazyImage.src = lazyImage.getAttribute('data-src');
                                lazyImage.classList.remove('lazy-img');
                            }
                        });
                        
                        if (lazyImages.length === 0) {
                            document.removeEventListener('scroll', lazyLoad);
                            window.removeEventListener('resize', lazyLoad);
                            window.removeEventListener('orientationChange', lazyLoad);
                        }
                    }, 20);
                }
                
                document.addEventListener('scroll', lazyLoad);
                window.addEventListener('resize', lazyLoad);
                window.addEventListener('orientationChange', lazyLoad);
                
                // 立即触发一次，处理首屏图片
                lazyLoad();
            }
        });
    }
    
    /**
     * 初始化
     */
    function init() {
        // 设备性能检测
        detectDevicePerformance();
        
        // 设置图片懒加载
        setupLazyLoading();
        
        // 为交互事件添加节流
        if (window.map) {
            addMapEventThrottling();
        }
    }
    
    /**
     * 为地图事件添加节流
     */
    function addMapEventThrottling() {
        // 避免过早操作地图对象
        window.setTimeout(function() {
            if (window.map && typeof window.map.addListener === 'function') {
                // 创建一个代理函数来节流地图事件
                var originalAddListener = window.map.addListener;
                
                window.map.addListener = function(eventName, callback) {
                    // 对拖动和缩放事件进行节流
                    if (eventName === 'drag' || eventName === 'zoom_changed') {
                        var throttledCallback = throttle(callback, config.eventThrottleTime);
                        return originalAddListener.call(this, eventName, throttledCallback);
                    } else {
                        return originalAddListener.call(this, eventName, callback);
                    }
                };
                
                console.log('[性能优化] 已为地图事件添加节流');
            }
        }, 2000);
    }
    
    /**
     * 事件节流函数
     */
    function throttle(func, limit) {
        var lastCall = 0;
        return function() {
            var now = Date.now();
            if (now - lastCall >= limit) {
                lastCall = now;
                return func.apply(this, arguments);
            }
        };
    }
    
    // 执行初始化
    window.addEventListener('load', init);
    
    console.log('[性能优化] 脚本已加载');
})(); 