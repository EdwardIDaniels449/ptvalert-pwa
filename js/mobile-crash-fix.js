/**
 * 移动端闪退修复脚本
 * 解决PWA在移动设备上的闪退和稳定性问题
 */

(function() {
    'use strict';
    
    console.log('[Mobile Fix] 初始化移动端闪退修复脚本');
    
    // 防止全局错误导致应用崩溃
    window.addEventListener('error', function(event) {
        console.error('[Mobile Fix] 捕获到全局错误:', event.message);
        event.preventDefault();
        showErrorRecoveryUI(event);
        return true; // 防止错误继续传播
    }, true);
    
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', function(event) {
        console.error('[Mobile Fix] 捕获到未处理的Promise拒绝:', event.reason);
        event.preventDefault();
        showErrorRecoveryUI(event);
        return true; // 防止错误继续传播
    });
    
    // 在页面加载完成后应用修复
    window.addEventListener('load', function() {
        // 确保页面在1秒后仍然正常
        setTimeout(applyMobileFixes, 1000);
    });
    
    // 在可视化变化时尝试恢复
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            console.log('[Mobile Fix] 页面变为可见，检查是否需要恢复');
            checkAndRecover();
        }
    });
    
    // 应用所有移动端修复
    function applyMobileFixes() {
        if (!isMobileDevice()) {
            return; // 仅在移动设备上应用修复
        }
        
        console.log('[Mobile Fix] 应用移动端稳定性修复');
        
        // 为关键DOM元素添加错误处理
        protectDomOperations();
        
        // 防止Google Maps API错误导致崩溃
        fixGoogleMapsErrors();
        
        // 修复Service Worker问题
        fixServiceWorkerIssues();
        
        // 优化移动端性能
        optimizeMobilePerformance();
        
        // 初始化周期性健康检查
        initHealthCheck();
        
        // 确保manifest正确
        validateManifest();
    }
    
    // 检查是否为移动设备
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // 保护DOM操作
    function protectDomOperations() {
        // 为常用DOM操作方法添加安全包装器
        const originalGetElementById = document.getElementById;
        document.getElementById = function(id) {
            try {
                return originalGetElementById.call(document, id);
            } catch (e) {
                console.error('[Mobile Fix] getElementById错误:', e);
                return null;
            }
        };
        
        // 保护querySelector和querySelectorAll
        const originalQuerySelector = document.querySelector;
        document.querySelector = function(selector) {
            try {
                return originalQuerySelector.call(document, selector);
            } catch (e) {
                console.error('[Mobile Fix] querySelector错误:', e);
                return null;
            }
        };
        
        // 保护添加事件监听器
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            try {
                if (typeof listener !== 'function') {
                    console.warn('[Mobile Fix] 尝试添加非函数事件监听器');
                    return;
                }
                
                // 包装事件监听器以捕获错误
                const wrappedListener = function(event) {
                    try {
                        return listener.call(this, event);
                    } catch (e) {
                        console.error('[Mobile Fix] 事件监听器错误:', e);
                        event.preventDefault();
                        return false;
                    }
                };
                
                return originalAddEventListener.call(this, type, wrappedListener, options);
            } catch (e) {
                console.error('[Mobile Fix] addEventListener错误:', e);
            }
        };
    }
    
    // 修复Google Maps相关错误
    function fixGoogleMapsErrors() {
        console.log('[Mobile Fix] 应用Google Maps错误修复');
        
        // 创建后备地图对象
        if (!window.google || !window.google.maps) {
            window.google = window.google || {};
            window.google.maps = window.google.maps || {
                Map: function() { return {}; },
                Marker: function() { return {}; },
                InfoWindow: function() { return { open: function() {} }; },
                LatLng: function(lat, lng) { return { lat: function() { return lat; }, lng: function() { return lng; } }; },
                event: { addListener: function() { return { remove: function() {} }; } }
            };
            
            console.log('[Mobile Fix] 创建Google Maps后备对象');
        }
        
        // 防止常见崩溃点
        if (window.google && window.google.maps) {
            // 保护setMap方法
            if (window.google.maps.Marker) {
                const originalSetMap = window.google.maps.Marker.prototype.setMap;
                window.google.maps.Marker.prototype.setMap = function(map) {
                    try {
                        if (map && typeof map !== 'object') {
                            console.error('[Mobile Fix] 无效的地图对象传递给setMap');
                            return;
                        }
                        return originalSetMap ? originalSetMap.call(this, map) : null;
                    } catch (e) {
                        console.error('[Mobile Fix] setMap错误:', e);
                    }
                };
            }
        }
        
        // 确保地图初始化不会无限等待
        setTimeout(function() {
            if (window.map && typeof window.map === 'object') {
                console.log('[Mobile Fix] 地图已正确初始化');
            } else {
                console.warn('[Mobile Fix] 地图未初始化，创建后备地图');
                createFallbackMap();
            }
        }, 5000);
    }
    
    // 创建后备地图
    function createFallbackMap() {
        if (document.getElementById('map')) {
            document.getElementById('map').innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;background:#f1f3f5;color:#333;text-align:center;padding:20px;">地图暂时不可用<br>您仍可以添加报告</div>';
            
            // 创建最小功能的地图对象
            window.map = {
                getCenter: function() {
                    return {
                        lat: function() { return window.MELBOURNE_CENTER ? window.MELBOURNE_CENTER.lat : -37.8136; },
                        lng: function() { return window.MELBOURNE_CENTER ? window.MELBOURNE_CENTER.lng : 144.9631; }
                    };
                },
                setCenter: function() { return this; },
                addListener: function() { return { remove: function() {} }; }
            };
            
            // 确保标记相关功能可用
            window.markers = window.markers || [];
            
            // 触发地图准备完成事件
            const event = new CustomEvent('map_ready_fallback');
            window.dispatchEvent(event);
        }
    }
    
    // 修复Service Worker问题
    function fixServiceWorkerIssues() {
        if ('serviceWorker' in navigator) {
            // 处理可能的service worker崩溃
            navigator.serviceWorker.addEventListener('error', function(event) {
                console.error('[Mobile Fix] Service Worker错误:', event);
                recoverServiceWorker();
            });
            
            // 确保service worker正常工作
            navigator.serviceWorker.ready.catch(function(error) {
                console.error('[Mobile Fix] Service Worker准备失败:', error);
                recoverServiceWorker();
            });
        }
    }
    
    // 恢复Service Worker
    function recoverServiceWorker() {
        if ('serviceWorker' in navigator) {
            console.log('[Mobile Fix] 尝试恢复Service Worker');
            
            // 首先尝试使用最简单的可行Service Worker
            const minimalSW = `
                self.addEventListener('install', e => self.skipWaiting());
                self.addEventListener('activate', e => e.waitUntil(clients.claim()));
                self.addEventListener('fetch', e => e.respondWith(
                    fetch(e.request).catch(() => new Response('离线模式'))
                ));
            `;
            
            // 创建一个Blob URL
            const blob = new Blob([minimalSW], {type: 'application/javascript'});
            const url = URL.createObjectURL(blob);
            
            // 注册这个最小化的Service Worker
            navigator.serviceWorker.register(url).then(function() {
                console.log('[Mobile Fix] 恢复Service Worker成功');
            }).catch(function(error) {
                console.error('[Mobile Fix] 恢复Service Worker失败:', error);
            });
        }
    }
    
    // 优化移动端性能
    function optimizeMobilePerformance() {
        // 减少动画和视觉效果以降低内存使用
        document.body.classList.add('mobile-optimized');
        
        // 降低Google Maps分辨率以提高性能
        if (window.google && window.google.maps && window.map) {
            try {
                // 如果存在工具栏等UI元素，禁用它们
                const mapOptions = {
                    disableDefaultUI: true,
                    gestureHandling: 'cooperative'
                };
                window.map.setOptions && window.map.setOptions(mapOptions);
            } catch (e) {
                console.warn('[Mobile Fix] 无法优化地图性能:', e);
            }
        }
        
        // 延迟加载非关键资源
        document.querySelectorAll('img[data-src]').forEach(function(img) {
            // 使用Intersection Observer延迟加载图片
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            observer.unobserve(img);
                        }
                    });
                });
                
                observer.observe(img);
            } else {
                // 如果不支持IntersectionObserver，简单地设置src
                setTimeout(function() {
                    img.src = img.dataset.src;
                }, 1000);
            }
        });
    }
    
    // 初始化定期健康检查
    function initHealthCheck() {
        const HEALTH_CHECK_INTERVAL = 10000; // 10秒检查一次
        
        // 设置健康检查计时器
        setInterval(function() {
            checkAndRecover();
        }, HEALTH_CHECK_INTERVAL);
        
        // 保存最初状态以检测变化
        window.appHealthState = {
            lastCheckTime: Date.now(),
            isMapWorking: !!window.map,
            markersCount: window.markers ? window.markers.length : 0
        };
    }
    
    // 检查应用状态并恢复
    function checkAndRecover() {
        console.log('[Mobile Fix] 执行应用健康检查');
        
        // 检查地图是否仍在工作
        if (!window.map && window.appHealthState.isMapWorking) {
            console.warn('[Mobile Fix] 地图对象丢失，尝试恢复');
            createFallbackMap();
        }
        
        // 检查Service Worker状态
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(function(registration) {
                if (!registration && 'serviceWorker' in navigator) {
                    console.warn('[Mobile Fix] Service Worker注册丢失，尝试恢复');
                    recoverServiceWorker();
                }
            });
        }
        
        // 更新健康状态
        window.appHealthState = {
            lastCheckTime: Date.now(),
            isMapWorking: !!window.map,
            markersCount: window.markers ? window.markers.length : 0
        };
    }
    
    // 显示错误恢复UI
    function showErrorRecoveryUI(event) {
        // 只在严重错误时显示
        if (!isCriticalError(event)) {
            return;
        }
        
        // 避免多次显示
        if (document.getElementById('mobileErrorRecovery')) {
            return;
        }
        
        const errorUI = document.createElement('div');
        errorUI.id = 'mobileErrorRecovery';
        errorUI.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:white;padding:20px;';
        
        errorUI.innerHTML = `
            <div style="font-size:50px;margin-bottom:20px;">⚠️</div>
            <h2 style="margin-bottom:15px;font-size:18px;">应用遇到问题</h2>
            <p style="margin-bottom:25px;font-size:14px;color:#ccc;">我们正在尝试自动恢复...</p>
            <button id="recoveryButton" style="background:#0071e3;color:white;border:none;padding:12px 25px;border-radius:8px;font-weight:bold;margin-bottom:10px;">手动恢复</button>
            <button id="dismissButton" style="background:transparent;color:#999;border:1px solid #555;padding:8px 15px;border-radius:8px;font-size:14px;">忽略</button>
        `;
        
        document.body.appendChild(errorUI);
        
        // 添加按钮事件
        document.getElementById('recoveryButton').addEventListener('click', function() {
            window.location.reload();
        });
        
        document.getElementById('dismissButton').addEventListener('click', function() {
            errorUI.style.display = 'none';
            setTimeout(function() {
                if (errorUI.parentNode) {
                    errorUI.parentNode.removeChild(errorUI);
                }
            }, 300);
        });
        
        // 5秒后自动尝试恢复
        setTimeout(function() {
            // 如果还在显示错误UI，则尝试恢复
            if (document.getElementById('mobileErrorRecovery')) {
                // 首先尝试软恢复
                checkAndRecover();
                
                // 然后移除错误UI
                const errorUI = document.getElementById('mobileErrorRecovery');
                if (errorUI) {
                    errorUI.style.opacity = '0';
                    errorUI.style.transition = 'opacity 0.3s';
                    setTimeout(function() {
                        if (errorUI.parentNode) {
                            errorUI.parentNode.removeChild(errorUI);
                        }
                    }, 300);
                }
            }
        }, 5000);
    }
    
    // 判断是否为严重错误
    function isCriticalError(event) {
        // 获取错误信息
        const errorMessage = event.message || (event.reason ? event.reason.message : '');
        
        // 检查是否包含关键词
        const criticalPatterns = [
            'script error',
            'uncaught',
            'cannot read property',
            'undefined is not an object',
            'null is not an object',
            'not a function',
            'setMap',
            'invalid',
            'google',
            'maps'
        ];
        
        return criticalPatterns.some(pattern => 
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
    }
    
    // 验证清单文件
    function validateManifest() {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
            console.warn('[Mobile Fix] 未找到manifest链接，添加默认链接');
            const link = document.createElement('link');
            link.rel = 'manifest';
            link.href = './manifest.json';
            document.head.appendChild(link);
        }
    }
    
    console.log('[Mobile Fix] 移动端闪退修复脚本已加载');
})(); 