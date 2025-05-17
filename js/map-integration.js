/**
 * 地图集成脚本 v1.0.0
 * 专门用于处理Google Maps初始化和标记管理
 * 独立控制地图生命周期，避免与其他脚本冲突
 */

(function() {
    // 立即记录加载状态
    console.log('[Map Integration] 脚本加载 - 版本1.0.0');
    
    // 定义全局变量
    let map = null;
    let markers = [];
    let initialized = false;
    let apiLoaded = false;
    
    // 墨尔本中心坐标
    const MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
    
    // 在全局空间暴露初始化函数
    window.initializeGoogleMap = initializeMap;
    
    // 初始化地图
    function initializeMap() {
        // 防止重复初始化
        if (initialized) {
            console.log('[Map Integration] 地图已初始化，跳过');
            return;
        }
        
        // 获取地图容器
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('[Map Integration] 找不到地图容器元素');
            return;
        }
        
        console.log('[Map Integration] 正在初始化地图...');
        
        try {
            // 确保容器可见
            mapContainer.style.display = 'block';
            mapContainer.style.visibility = 'visible';
            mapContainer.style.opacity = '1';
            
            // 创建地图
            map = new google.maps.Map(mapContainer, {
                center: MELBOURNE_CENTER,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                fullscreenControl: false,
                streetViewControl: false,
                zoomControl: true,
                mapTypeControl: false
            });
            
            // 添加中心点标记
            addMarker(MELBOURNE_CENTER, '墨尔本中心');
            
            // 设置已初始化标志
            initialized = true;
            
            // 添加点击事件处理器
            addMapClickHandler();
            
            // 通知其他组件地图已准备就绪
            triggerMapReadyEvent();
            
            // 从本地存储加载保存的标记
            setTimeout(loadMarkersFromStorage, 500);
            
            console.log('[Map Integration] 地图初始化成功');
        } catch (error) {
            console.error('[Map Integration] 初始化地图时出错:', error);
        }
    }
    
    // 加载API
    function loadGoogleMapsAPI() {
        if (apiLoaded) {
            console.log('[Map Integration] API已加载，无需重复加载');
            return;
        }
        
        console.log('[Map Integration] 正在加载Google Maps API...');
        
        // 创建脚本元素
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=initializeGoogleMap';
        script.async = true;
        script.defer = true;
        
        // 添加加载事件处理器
        script.onload = function() {
            console.log('[Map Integration] Google Maps API加载成功');
            apiLoaded = true;
        };
        
        // 添加错误处理器
        script.onerror = function() {
            console.error('[Map Integration] 加载Google Maps API失败');
            showErrorUI();
        };
        
        // 添加到文档
        document.head.appendChild(script);
    }
    
    // 添加标记
    function addMarker(position, title, options = {}) {
        if (!map) {
            console.error('[Map Integration] 地图未初始化，无法添加标记');
            return null;
        }
        
        try {
            // 创建标记
            const marker = new google.maps.Marker({
                position: position,
                map: map,
                title: title || '',
                ...options
            });
            
            // 添加到标记数组
            markers.push(marker);
            
            return marker;
        } catch (error) {
            console.error('[Map Integration] 添加标记时出错:', error);
            return null;
        }
    }
    
    // 从本地存储加载标记
    function loadMarkersFromStorage() {
        if (!map) {
            console.warn('[Map Integration] 地图未初始化，无法加载标记');
            return;
        }
        
        try {
            console.log('[Map Integration] 加载保存的标记...');
            
            // 获取标记数据
            const storedMarkers = localStorage.getItem('savedMarkers');
            if (!storedMarkers) {
                console.log('[Map Integration] 本地存储中没有标记数据');
                return;
            }
            
            // 解析标记数据
            const markerData = JSON.parse(storedMarkers);
            if (!Array.isArray(markerData) || markerData.length === 0) {
                console.log('[Map Integration] 没有有效的标记数据');
                return;
            }
            
            console.log(`[Map Integration] 找到 ${markerData.length} 个标记`);
            
            // 清除现有标记
            clearMarkers();
            
            // 添加标记
            markerData.forEach((data, index) => {
                // 确保位置数据有效
                if (!data.location || typeof data.location.lat === 'undefined' || typeof data.location.lng === 'undefined') {
                    console.warn(`[Map Integration] 标记 #${index} 位置数据无效，跳过`);
                    return;
                }
                
                // 确保经纬度是数值
                const lat = parseFloat(data.location.lat);
                const lng = parseFloat(data.location.lng);
                
                if (isNaN(lat) || isNaN(lng)) {
                    console.warn(`[Map Integration] 标记 #${index} 经纬度无效，跳过`);
                    return;
                }
                
                // 创建标记
                const marker = addMarker(
                    {lat, lng}, 
                    data.description || '无描述',
                    {
                        label: {
                            text: '🐶',
                            fontSize: '24px'
                        },
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 0
                        },
                        optimized: false
                    }
                );
                
                // 为标记添加点击事件
                if (marker) {
                    // 点击时显示信息窗口
                    marker.addListener('click', function() {
                        // 关闭已打开的信息窗口
                        if (window.openedInfoWindow) {
                            window.openedInfoWindow.close();
                        }
                        
                        // 创建信息窗口内容
                        let content = '<div style="padding:10px;max-width:300px;">';
                        
                        // 如果有图片，添加图片
                        if (data.image) {
                            content += `<div style="margin-bottom:10px;"><img src="${data.image}" style="max-width:100%;max-height:150px;border-radius:4px;"></div>`;
                        }
                        
                        // 添加描述
                        content += `<div style="font-size:14px;margin-bottom:10px;">${data.description || '无描述'}</div>`;
                        
                        // 添加时间戳
                        const time = data.timestamp ? new Date(data.timestamp) : new Date();
                        content += `<div style="font-size:12px;color:#666;">${time.toLocaleDateString()} ${time.toLocaleTimeString()}</div>`;
                        
                        content += '</div>';
                        
                        // 创建信息窗口
                        const infoWindow = new google.maps.InfoWindow({
                            content: content,
                            maxWidth: 300
                        });
                        
                        // 打开信息窗口
                        infoWindow.open(map, marker);
                        
                        // 保存信息窗口引用
                        window.openedInfoWindow = infoWindow;
                    });
                }
            });
            
            console.log(`[Map Integration] 已加载 ${markers.length} 个标记`);
        } catch (error) {
            console.error('[Map Integration] 加载标记时出错:', error);
        }
    }
    
    // 清除所有标记
    function clearMarkers() {
        if (markers.length === 0) {
            return;
        }
        
        console.log(`[Map Integration] 清除 ${markers.length} 个标记`);
        
        // 从地图中移除标记
        markers.forEach(marker => {
            if (marker && typeof marker.setMap === 'function') {
                marker.setMap(null);
            }
        });
        
        // 清空数组
        markers = [];
    }
    
    // 添加地图点击事件处理器
    function addMapClickHandler() {
        if (!map) {
            console.error('[Map Integration] 地图未初始化，无法添加点击事件');
            return;
        }
        
        try {
            // 添加点击事件监听器
            map.addListener('click', function(event) {
                const lat = event.latLng.lat();
                const lng = event.latLng.lng();
                
                console.log(`[Map Integration] 地图点击: ${lat}, ${lng}`);
                
                // 如果正在添加报告模式
                if (window.addingReport) {
                    // 保存选中位置
                    window.selectedLocation = { lat, lng };
                    
                    // 隐藏提示
                    const addReportTip = document.getElementById('addReportTip');
                    if (addReportTip) {
                        addReportTip.style.display = 'none';
                    }
                    
                    // 显示表单
                    const reportForm = document.getElementById('reportForm');
                    if (reportForm) {
                        reportForm.style.display = 'block';
                        reportForm.style.transform = 'translateY(0)';
                    }
                }
            });
            
            console.log('[Map Integration] 已添加地图点击事件处理器');
        } catch (error) {
            console.error('[Map Integration] 添加点击事件处理器时出错:', error);
        }
    }
    
    // 触发地图就绪事件
    function triggerMapReadyEvent() {
        console.log('[Map Integration] 触发地图就绪事件');
        
        // 创建自定义事件
        const event = new CustomEvent('map_initialized', {
            detail: {
                map: map
            }
        });
        
        // 分发事件
        document.dispatchEvent(event);
        
        // 向后兼容旧事件
        document.dispatchEvent(new CustomEvent('map_ready'));
        
        // 调用回调
        if (Array.isArray(window.mapReadyCallbacks)) {
            window.mapReadyCallbacks.forEach(callback => {
                if (typeof callback === 'function') {
                    try {
                        callback();
                    } catch (error) {
                        console.error('[Map Integration] 调用回调时出错:', error);
                    }
                }
            });
        }
    }
    
    // 显示错误UI
    function showErrorUI() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            return;
        }
        
        mapContainer.innerHTML = `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f8f9fa;">
                <div style="text-align:center;padding:20px;background:rgba(0,0,0,0.7);color:white;border-radius:8px;max-width:80%;">
                    <h3 style="margin-top:0;">地图加载失败</h3>
                    <p>无法加载Google Maps。可能是由于网络问题或API密钥无效。</p>
                    <button onclick="window.location.reload()" style="background:#0071e3;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-top:10px;">重试</button>
                </div>
            </div>
        `;
    }
    
    // DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Map Integration] DOM加载完成，准备加载API');
        setTimeout(loadGoogleMapsAPI, 100);
    });
    
    // 暴露API到全局
    window.MapIntegration = {
        getMap: function() { return map; },
        getMarkers: function() { return [...markers]; },
        addMarker: addMarker,
        clearMarkers: clearMarkers,
        loadMarkersFromStorage: loadMarkersFromStorage,
        initialize: initializeMap,
        loadAPI: loadGoogleMapsAPI
    };
})(); 