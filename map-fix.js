/**
 * Map Fix Script (v1.0.2)
 * 用于修复地图加载和标记显示问题
 * 解决谷歌地图API加载失败或未初始化的问题
 */

(function() {
    console.log('[Map Fix] 地图修复脚本已加载 v1.0.2');
    
    // 强制静态模式，不依赖后端API
    window.FORCE_STATIC_MODE = true;
    window.API_MODE = 'static';
    
    // 确保必要的全局变量初始化
    window.markers = window.markers || [];
    window.mapReadyCallbacks = window.mapReadyCallbacks || [];
    window.openedInfoWindow = null;
    window.selectedLocation = null;
    window.addingReport = false;
    
    // 清除可能无效的标记数据
    try {
        const storedMarkers = localStorage.getItem('savedMarkers');
        if (storedMarkers) {
            try {
                const markerData = JSON.parse(storedMarkers);
                // 检查数据有效性
                let isValid = true;
                if (!Array.isArray(markerData)) {
                    isValid = false;
                } else {
                    for (let i = 0; i < markerData.length; i++) {
                        const marker = markerData[i];
                        if (!marker || !marker.location || typeof marker.location.lat === 'undefined') {
                            isValid = false;
                            break;
                        }
                    }
                }
                
                if (!isValid) {
                    console.warn('[Map Fix] 检测到无效的标记数据，重置标记存储');
                    localStorage.removeItem('savedMarkers');
                }
            } catch (e) {
                console.warn('[Map Fix] 检测到无效的标记数据JSON，重置标记存储');
                localStorage.removeItem('savedMarkers');
            }
        }
    } catch (e) {
        console.error('[Map Fix] 检查标记数据时出错:', e);
    }
    
    // 监听DOM加载完成事件
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Map Fix] DOM已加载，正在初始化地图修复');
        
        // 监听自定义地图初始化事件
        document.addEventListener('map_initialized', function() {
            console.log('[Map Fix] 接收到地图初始化事件');
            handleMapInitialized();
        });
        
        // 重置全局API模式为静态模式
        window.API_MODE = 'static';
        console.log('[Map Fix] 已设置为静态模式，使用本地存储数据');
        
        // 2秒后检查地图状态，减少等待时间
        setTimeout(checkMapStatus, 2000);
    });
    
    // 处理地图初始化完成事件
    function handleMapInitialized() {
        console.log('[Map Fix] 处理地图初始化完成事件');
        
        // 为地图添加点击事件，用于添加标记
        addMapClickHandler();
        
        // 预加载一些标记数据
        preloadMarkerData();
        
        // 触发地图就绪事件
        triggerMapReadyEvent();
        
        // 加载标记
        setTimeout(function() {
            loadMarkersFromStorage();
        }, 1000);
    }
    
    // 检查地图状态
    function checkMapStatus() {
        console.log('[Map Fix] 检查地图状态...');
        
        // 检查地图对象是否已初始化
        if (window.map) {
            console.log('[Map Fix] 地图对象已存在，处理初始化完成');
            handleMapInitialized();
            return;
        }
        
        // 检查Google Maps API是否已加载
        if (!window.google || !window.google.maps) {
            console.warn('[Map Fix] Google Maps API未加载，等待API加载完成');
            // 等待加载完成后的回调
            setTimeout(checkMapStatus, 2000);
            return;
        }
        
        // API已加载但地图未初始化，尝试初始化
        if (typeof window.initMap === 'function') {
            try {
                console.log('[Map Fix] 调用initMap函数');
                window.initMap();
                
                if (window.map) {
                    console.log('[Map Fix] 地图初始化成功');
                    handleMapInitialized();
                } else {
                    console.error('[Map Fix] initMap调用后地图对象仍未创建，使用备用初始化');
                    createBackupMap();
                }
            } catch (error) {
                console.error('[Map Fix] 调用initMap函数失败:', error);
                createBackupMap();
            }
        } else {
            console.warn('[Map Fix] 找不到initMap函数，使用备用初始化');
            createBackupMap();
        }
    }
    
    // 预加载一些标记数据
    function preloadMarkerData() {
        // 如果没有本地存储的标记数据，创建一些示例标记
        if (!localStorage.getItem('savedMarkers')) {
            try {
                console.log('[Map Fix] 创建示例标记数据');
                
                // 墨尔本中心位置
                const center = window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631};
                
                // 创建一些示例标记
                const sampleMarkers = [
                    {
                        id: 'sample-1',
                        location: {
                            lat: center.lat + 0.005,
                            lng: center.lng + 0.005
                        },
                        description: '墨尔本中央图书馆',
                        image: null,
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 'sample-2',
                        location: {
                            lat: center.lat - 0.007,
                            lng: center.lng + 0.002
                        },
                        description: '弗林德斯火车站',
                        image: null,
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 'sample-3',
                        location: {
                            lat: center.lat + 0.001,
                            lng: center.lng - 0.008
                        },
                        description: '墨尔本皇家植物园',
                        image: null,
                        timestamp: new Date().toISOString()
                    }
                ];
                
                // 保存到本地存储
                localStorage.setItem('savedMarkers', JSON.stringify(sampleMarkers));
                console.log('[Map Fix] 已创建示例标记数据');
            } catch (e) {
                console.error('[Map Fix] 创建示例标记数据失败:', e);
            }
        }
    }
    
    // 创建备用地图
    function createBackupMap() {
        console.log('[Map Fix] 创建备用地图...');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('[Map Fix] 找不到地图容器元素，无法创建地图');
            return;
        }
        
        try {
            // 获取墨尔本中心坐标
            const center = window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631};
            
            // 创建地图对象
            window.map = new google.maps.Map(mapElement, {
                center: center,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                fullscreenControl: false,
                streetViewControl: false,
                zoomControl: true,
                mapTypeControl: false
            });
            
            console.log('[Map Fix] 备用地图创建成功');
            
            // 处理地图初始化完成
            handleMapInitialized();
        } catch (error) {
            console.error('[Map Fix] 创建备用地图失败:', error);
            createOfflineMapUI();
        }
    }
    
    // 为地图添加点击事件
    function addMapClickHandler() {
        if (!window.map || !google || !google.maps || !google.maps.event) {
            console.error('[Map Fix] 无法为地图添加点击事件');
            return;
        }
        
        try {
            // 添加点击事件
            google.maps.event.addListener(window.map, 'click', function(event) {
                console.log('[Map Fix] 地图被点击:', event.latLng.lat(), event.latLng.lng());
                
                // 如果正在添加报告
                if (window.addingReport) {
                    const location = {
                        lat: event.latLng.lat(),
                        lng: event.latLng.lng()
                    };
                    
                    // 保存选中的位置
                    window.selectedLocation = location;
                    
                    // 使用自定义事件通知其他组件
                    const locationSelectedEvent = new CustomEvent('location_selected', {
                        detail: { location: location }
                    });
                    document.dispatchEvent(locationSelectedEvent);
                    
                    console.log('[Map Fix] 已保存选中位置:', location);
                }
            });
            
            console.log('[Map Fix] 已为地图添加点击事件');
        } catch (e) {
            console.error('[Map Fix] 添加地图点击事件失败:', e);
        }
    }
    
    // 创建离线地图UI
    function createOfflineMapUI() {
        console.log('[Map Fix] 创建离线地图界面...');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('[Map Fix] 找不到地图容器元素，无法创建离线界面');
            return;
        }
        
        // 创建一个虚拟地图对象
        window.map = {
            center: window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631},
            zoom: 13,
            setCenter: function() {},
            setZoom: function() {},
            panTo: function() {},
            addListener: function() { return {remove: function() {}}; }
        };
        
        // 创建离线界面
        mapElement.innerHTML = `
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background-color:#f2f2f2;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div style="background-color:rgba(0,0,0,0.7);color:white;padding:20px;border-radius:10px;text-align:center;max-width:80%;">
                    <h3 style="margin-top:0;">地图暂时不可用</h3>
                    <p>无法加载Google地图服务，请检查网络连接后重试。</p>
                    <button id="retryMapBtn" style="background:#0071e3;color:white;border:none;padding:8px 16px;border-radius:5px;font-weight:bold;cursor:pointer;margin-top:10px;">重试加载</button>
                </div>
            </div>
        `;
        
        // 添加重试按钮事件
        document.getElementById('retryMapBtn').addEventListener('click', function() {
            location.reload(); // 简单地重载页面
        });
        
        // 预加载一些标记数据
        preloadMarkerData();
        
        // 触发地图就绪事件，但标记为离线模式
        triggerMapReadyEvent(true);
    }
    
    // 触发地图就绪事件
    function triggerMapReadyEvent(isOffline) {
        console.log('[Map Fix] 触发地图就绪事件' + (isOffline ? ' (离线模式)' : ''));
        
        // 创建并分发自定义事件
        const mapReadyEvent = new CustomEvent('map_ready', {
            detail: {
                isOffline: !!isOffline
            }
        });
        document.dispatchEvent(mapReadyEvent);
        
        // 调用回调数组中的函数
        if (window.mapReadyCallbacks && Array.isArray(window.mapReadyCallbacks)) {
            console.log(`[Map Fix] 调用 ${window.mapReadyCallbacks.length} 个地图就绪回调函数`);
            for (let i = 0; i < window.mapReadyCallbacks.length; i++) {
                const callback = window.mapReadyCallbacks[i];
                try {
                    if (typeof callback === 'function') {
                        callback();
                    }
                } catch (error) {
                    console.error('[Map Fix] 调用地图就绪回调函数失败:', error);
                }
            }
        }
    }
    
    // 从本地存储加载标记
    function loadMarkersFromStorage() {
        console.log('[Map Fix] 尝试从本地存储加载标记...');
        
        try {
            // 清除现有标记
            if (window.markers && window.markers.length > 0) {
                window.markers.forEach(function(marker) {
                    if (marker && marker.setMap) {
                        marker.setMap(null);
                    }
                });
            }
            
            // 初始化标记数组
            window.markers = [];
            
            // 获取保存的标记
            const storedMarkers = localStorage.getItem('savedMarkers');
            if (storedMarkers) {
                try {
                    const markerData = JSON.parse(storedMarkers);
                    console.log(`[Map Fix] 从本地存储加载了 ${markerData.length} 个标记数据`);
                    
                    // 确保地图已加载
                    if (!window.map || !window.google || !window.google.maps) {
                        console.error('[Map Fix] 地图或Google Maps API未加载，无法添加标记');
                        return;
                    }

                    // 有效标记计数器
                    let validMarkerCount = 0;
                    
                    // 添加新标记
                    markerData.forEach(function(markerInfo) {
                        try {
                            // 检查标记数据是否有效
                            if (!markerInfo) {
                                console.warn('[Map Fix] 跳过无效标记数据');
                                return;
                            }
                            
                            // 检查并确保位置数据完整
                            if (!markerInfo.location || typeof markerInfo.location.lat === 'undefined' || typeof markerInfo.location.lng === 'undefined') {
                                console.warn('[Map Fix] 跳过无位置数据的标记:', markerInfo.id || '未知ID');
                                return;
                            }
                            
                            // 确保lat和lng是数值
                            const lat = parseFloat(markerInfo.location.lat);
                            const lng = parseFloat(markerInfo.location.lng);
                            
                            if (isNaN(lat) || isNaN(lng)) {
                                console.warn('[Map Fix] 跳过无效位置坐标的标记:', markerInfo.id || '未知ID');
                                return;
                            }
                            
                            // 确保描述存在
                            const description = markerInfo.description || '无描述';
                            
                            // 创建标记
                            const marker = new google.maps.Marker({
                                position: {lat: lat, lng: lng},
                                map: window.map,
                                title: description,
                                label: {
                                    text: '🐶',
                                    fontSize: '24px'
                                },
                                icon: {
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 0
                                },
                                optimized: false
                            });
                            
                            // 添加点击事件
                            marker.addListener('click', function() {
                                // 关闭任何已打开的信息窗口
                                if (window.openedInfoWindow) {
                                    window.openedInfoWindow.close();
                                }
                                
                                // 创建信息窗口内容
                                let content = '<div style="padding:10px;max-width:300px;">';
                                
                                // 如果有图片，添加图片
                                if (markerInfo.image) {
                                    content += `<div style="margin-bottom:10px;"><img src="${markerInfo.image}" style="max-width:100%;max-height:150px;border-radius:4px;"></div>`;
                                }
                                
                                // 添加描述
                                content += `<div style="font-size:14px;margin-bottom:10px;">${description}</div>`;
                                
                                // 添加时间戳
                                const time = markerInfo.timestamp ? new Date(markerInfo.timestamp) : new Date();
                                content += `<div style="font-size:12px;color:#666;">${time.toLocaleDateString()} ${time.toLocaleTimeString()}</div>`;
                                
                                content += '</div>';
                                
                                // 创建并打开信息窗口
                                const infoWindow = new google.maps.InfoWindow({
                                    content: content,
                                    maxWidth: 300
                                });
                                
                                infoWindow.open(window.map, marker);
                                
                                // 保存当前打开的信息窗口
                                window.openedInfoWindow = infoWindow;
                            });
                            
                            // 将标记保存到全局数组
                            window.markers.push(marker);
                            validMarkerCount++;
                        } catch (markerError) {
                            console.error('[Map Fix] 创建标记失败:', markerError);
                        }
                    });
                    
                    // 更新状态显示
                    const markerStatus = document.getElementById('markerStatus');
                    if (markerStatus) {
                        markerStatus.textContent = `已加载 ${validMarkerCount} 个标记`;
                        markerStatus.style.color = validMarkerCount > 0 ? 'green' : 'orange';
                    }
                    
                    if (validMarkerCount > 0) {
                        console.log(`[Map Fix] 成功加载 ${validMarkerCount} 个标记`);
                    } else {
                        console.warn('[Map Fix] 没有加载到有效标记，尝试创建示例标记');
                        // 清除可能无效的标记数据
                        localStorage.removeItem('savedMarkers');
                        // 创建新的示例标记
                        preloadMarkerData();
                        // 重新尝试加载
                        setTimeout(loadMarkersFromStorage, 500);
                    }
                } catch (parseError) {
                    console.error('[Map Fix] 解析标记数据失败:', parseError);
                    // 清除无效的标记数据
                    localStorage.removeItem('savedMarkers');
                    // 创建新的示例标记
                    preloadMarkerData();
                    // 重新尝试加载
                    setTimeout(loadMarkersFromStorage, 500);
                }
            } else {
                console.log('[Map Fix] 本地存储中没有标记数据，创建示例标记');
                // 创建示例标记
                preloadMarkerData();
                // 重新尝试加载
                setTimeout(loadMarkersFromStorage, 500);
            }
        } catch (e) {
            console.error('[Map Fix] 从本地存储加载标记失败:', e);
            // 清除可能损坏的数据
            localStorage.removeItem('savedMarkers');
            // 创建新的示例标记
            preloadMarkerData();
        }
    }
    
    // 暴露方法到全局空间
    window.MapFix = {
        checkMapStatus: checkMapStatus,
        loadMarkersFromStorage: loadMarkersFromStorage,
        createBackupMap: createBackupMap,
        preloadMarkerData: preloadMarkerData
    };
})(); 