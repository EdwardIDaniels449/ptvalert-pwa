/**
 * 地图显示修复脚本
 * 解决地图背景不显示但标记显示的问题
 */

(function() {
    'use strict';
    
    console.log('[地图显示修复] 初始化...');
    
    // 当页面加载完成时执行
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initMapFix, 1000);
    });
    
    // 如果DOM已加载，立即执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initMapFix, 1000);
    }
    
    function initMapFix() {
        // 获取地图容器
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('[地图显示修复] 找不到地图容器!');
            createMapContainer();
            return;
        }
        
        // 检查地图容器尺寸
        checkMapContainer(mapElement);
        
        // 检查Google Maps初始化状态
        checkGoogleMapsStatus();
        
        // 2秒后再次检查，确保修复生效
        setTimeout(function() {
            checkMapContainer(document.getElementById('map'));
            checkGoogleMapsStatus();
        }, 2000);
    }
    
    // 检查地图容器的尺寸和样式
    function checkMapContainer(mapElement) {
        if (!mapElement) return;
        
        console.log('[地图显示修复] 检查地图容器...');
        
        // 检查容器尺寸
        const width = mapElement.offsetWidth;
        const height = mapElement.offsetHeight;
        
        if (width < 50 || height < 50) {
            console.warn('[地图显示修复] 地图容器尺寸异常:', width, 'x', height);
            
            // 修复容器样式
            mapElement.style.width = '100%';
            mapElement.style.height = '100vh';
            mapElement.style.position = 'absolute';
            mapElement.style.top = '0';
            mapElement.style.left = '0';
            mapElement.style.zIndex = '1';
            mapElement.style.backgroundColor = '#f5f5f5';
            
            console.log('[地图显示修复] 已修复地图容器样式');
        } else {
            console.log('[地图显示修复] 地图容器尺寸正常:', width, 'x', height);
        }
        
        // 检查容器可见性
        const styles = window.getComputedStyle(mapElement);
        if (styles.display === 'none' || styles.visibility === 'hidden') {
            console.warn('[地图显示修复] 地图容器被隐藏!');
            
            // 修复可见性
            mapElement.style.display = 'block';
            mapElement.style.visibility = 'visible';
            
            console.log('[地图显示修复] 已修复地图容器可见性');
        }
    }
    
    // 检查Google Maps API状态并尝试重新初始化
    function checkGoogleMapsStatus() {
        console.log('[地图显示修复] 检查Google Maps状态...');
        
        // 检查地图对象是否存在
        if (!window.map) {
            console.warn('[地图显示修复] 地图对象不存在!');
            attemptMapRecreation();
            return;
        }
        
        // 检查是否为模拟地图对象
        if (window.map && !window.map.getDiv) {
            console.warn('[地图显示修复] 检测到模拟地图对象，尝试修复');
            attemptMapRecreation();
            return;
        }
        
        // 检查地图背景tiles是否正确加载
        const mapDiv = window.map.getDiv ? window.map.getDiv() : document.getElementById('map');
        if (mapDiv) {
            const tiles = mapDiv.querySelectorAll('img[src*="googleapis"]');
            if (tiles.length === 0) {
                console.warn('[地图显示修复] 未检测到地图瓦片，尝试重新加载');
                attemptMapRecreation();
            } else {
                console.log('[地图显示修复] 检测到', tiles.length, '个地图瓦片');
            }
        }
    }
    
    // 尝试重新创建地图
    function attemptMapRecreation() {
        console.log('[地图显示修复] 尝试重新创建地图...');
        
        // 确保Google Maps API已加载
        if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
            console.error('[地图显示修复] Google Maps API未加载!');
            loadGoogleMapsScript();
            return;
        }
        
        try {
            // 清除现有的地图对象
            const mapElement = document.getElementById('map');
            if (mapElement) {
                // 清空容器内容
                while (mapElement.firstChild) {
                    mapElement.removeChild(mapElement.firstChild);
                }
                
                // 重新设置样式
                mapElement.style.width = '100%';
                mapElement.style.height = '100vh';
                mapElement.style.position = 'absolute';
                mapElement.style.top = '0';
                mapElement.style.left = '0';
                mapElement.style.zIndex = '1';
                
                // 初始化新的地图
                const mapOptions = {
                    center: window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631},
                    zoom: 13,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false
                };
                
                console.log('[地图显示修复] 正在创建新的地图实例');
                window.map = new google.maps.Map(mapElement, mapOptions);
                
                // 等待地图完全加载
                google.maps.event.addListenerOnce(window.map, 'idle', function() {
                    console.log('[地图显示修复] 新地图已加载');
                    
                    // 触发地图就绪事件
                    const mapReadyEvent = new CustomEvent('map_ready');
                    document.dispatchEvent(mapReadyEvent);
                    
                    // 移动已有的标记到新地图
                    if (window.markers && window.markers.length > 0) {
                        console.log('[地图显示修复] 将', window.markers.length, '个标记移动到新地图上');
                        
                        window.markers.forEach(function(marker) {
                            if (marker && typeof marker.setMap === 'function') {
                                try {
                                    marker.setMap(window.map);
                                } catch (err) {
                                    console.warn('[地图显示修复] 移动标记时出错:', err);
                                }
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.error('[地图显示修复] 重新创建地图时出错:', error);
            createFallbackMapBackground();
        }
    }
    
    // 创建备用地图背景
    function createFallbackMapBackground() {
        console.log('[地图显示修复] 创建备用地图背景');
        const mapElement = document.getElementById('map');
        if (mapElement) {
            // 设置渐变背景
            mapElement.style.backgroundImage = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
            mapElement.style.backgroundSize = 'cover';
            
            // 添加提示
            const notice = document.createElement('div');
            notice.style.position = 'absolute';
            notice.style.top = '50%';
            notice.style.left = '50%';
            notice.style.transform = 'translate(-50%, -50%)';
            notice.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            notice.style.color = 'white';
            notice.style.padding = '10px 20px';
            notice.style.borderRadius = '5px';
            notice.style.fontSize = '14px';
            notice.style.textAlign = 'center';
            notice.style.zIndex = '1000';
            notice.textContent = '地图背景加载受限，但标记功能可以正常使用';
            
            mapElement.appendChild(notice);
            
            // 5秒后隐藏提示
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
    }
    
    // 创建地图容器
    function createMapContainer() {
        console.log('[地图显示修复] 创建地图容器');
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map';
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100vh';
        mapDiv.style.position = 'absolute';
        mapDiv.style.top = '0';
        mapDiv.style.left = '0';
        mapDiv.style.zIndex = '1';
        mapDiv.style.backgroundColor = '#f5f5f5';
        
        // 插入到body的最前面
        if (document.body.firstChild) {
            document.body.insertBefore(mapDiv, document.body.firstChild);
        } else {
            document.body.appendChild(mapDiv);
        }
    }
    
    // 加载Google Maps API
    function loadGoogleMapsScript() {
        console.log('[地图显示修复] 尝试加载Google Maps API');
        
        // 检查是否已有Google Maps脚本
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            console.warn('[地图显示修复] Google Maps脚本已存在，但未正确加载');
            return;
        }
        
        // 创建脚本标签
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=mapFixCallback&libraries=places&v=weekly';
        script.async = true;
        script.defer = true;
        
        // 添加回调函数
        window.mapFixCallback = function() {
            console.log('[地图显示修复] Google Maps API加载成功');
            attemptMapRecreation();
        };
        
        // 添加脚本到页面
        document.head.appendChild(script);
    }
})(); 