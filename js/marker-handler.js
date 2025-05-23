/**
 * Marker Handler Script
 * Handles creation and management of map markers
 */

(function() {
    // 设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 移动设备参数
    const MOBILE_MARKER_LIMIT = 100; // 增加移动设备显示标记的最大数量限制
    let markerBatch = []; // 用于批量处理标记
    let isProcessingBatch = false; // 标记批处理锁
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Marker Handler] Initializing marker handler');
        
        // Register with map ready callbacks
        if (!window.mapReadyCallbacks) {
            window.mapReadyCallbacks = [];
        }
        
        window.mapReadyCallbacks.push(initializeMarkerHandler);
    });
    
    // 监听地图就绪事件（备用方法）
    document.addEventListener('map_ready', function() {
        if (!window.markerHandlerInitialized) {
            initializeMarkerHandler();
        }
    });
    
    // Initialize marker handler when map is ready
    function initializeMarkerHandler() {
        console.log('[Marker Handler] Map is ready, initializing marker handler');
        
        // 防止重复初始化
        if (window.markerHandlerInitialized) {
            return;
        }
        window.markerHandlerInitialized = true;
        
        // Initialize markers array if not exists
        window.markers = window.markers || [];
        window.pendingMarkers = window.pendingMarkers || [];
        
        // Add marker creation function to window
        window.addReportMarker = addReportMarker;
        
        // 移动设备上延迟加载现有标记以提高首屏性能
        if (isMobile) {
            console.log('[Marker Handler] 移动设备: 延迟加载现有标记');
            setTimeout(loadExistingMarkers, 2000);
        } else {
            // 桌面设备直接加载
            loadExistingMarkers();
        }
    }
    
    // Add a report marker to the map
    function addReportMarker(location, description, reportId, image) {
        console.log('[Marker Handler] Adding report marker:', location);
        
        // 验证地图对象
        if (!isValidMapObject()) {
            console.warn('[Marker Handler] 无效的地图对象，将标记添加到待处理队列');
            
            // 添加到待处理标记队列
            window.pendingMarkers = window.pendingMarkers || [];
            window.pendingMarkers.push({
                location: location,
                description: description,
                reportId: reportId,
                image: image
            });
            
            return null;
        }
        
        // 确保位置是有效的
        if (!location || typeof location !== 'object') {
            console.warn('[Marker Handler] 无效的位置对象，使用默认位置:', location);
            // 使用默认位置（地图中心或墨尔本中心）
            try {
                if (window.map && typeof window.map.getCenter === 'function') {
                    const center = window.map.getCenter();
                    location = {
                        lat: center.lat(),
                        lng: center.lng()
                    };
                    console.log('[Marker Handler] 使用地图中心作为默认位置:', location);
                } else if (window.MELBOURNE_CENTER) {
                    location = window.MELBOURNE_CENTER;
                    console.log('[Marker Handler] 使用墨尔本中心作为默认位置:', location);
                } else {
                    location = {lat: -37.8136, lng: 144.9631}; // 墨尔本中心位置
                    console.log('[Marker Handler] 使用硬编码墨尔本中心作为默认位置:', location);
                }
            } catch (e) {
                console.error('[Marker Handler] 无法获取默认位置:', e);
                location = {lat: -37.8136, lng: 144.9631}; // 墨尔本中心位置
            }
        } else if ((typeof location.lat !== 'function' && (typeof location.lat !== 'number' && typeof location.lat !== 'string')) ||
                 (typeof location.lng !== 'function' && (typeof location.lng !== 'number' && typeof location.lng !== 'string'))) {
            console.warn('[Marker Handler] 位置对象格式不正确，尝试修复:', location);
            
            // 尝试从其他属性中提取lat和lng
            if (location.latitude !== undefined && location.longitude !== undefined) {
                location = {
                    lat: parseFloat(location.latitude),
                    lng: parseFloat(location.longitude)
                };
                console.log('[Marker Handler] 从latitude/longitude修复位置:', location);
            } else if (location.position && location.position.lat !== undefined && location.position.lng !== undefined) {
                location = {
                    lat: parseFloat(location.position.lat),
                    lng: parseFloat(location.position.lng)
                };
                console.log('[Marker Handler] 从position属性修复位置:', location);
            } else {
                console.warn('[Marker Handler] 无法修复位置对象，使用默认位置');
                // 使用默认位置
                try {
                    if (window.map && typeof window.map.getCenter === 'function') {
                        const center = window.map.getCenter();
                        location = {
                            lat: center.lat(),
                            lng: center.lng()
                        };
                    } else if (window.MELBOURNE_CENTER) {
                        location = window.MELBOURNE_CENTER;
                    } else {
                        location = {lat: -37.8136, lng: 144.9631}; // 墨尔本中心位置
                    }
                } catch (e) {
                    console.error('[Marker Handler] 无法获取默认位置:', e);
                    location = {lat: -37.8136, lng: 144.9631}; // 墨尔本中心位置
                }
            }
        }
        
        // Create report data object
        const reportData = {
            id: reportId || 'marker-' + Date.now(),
            location: location,
            description: description || '无描述',
            time: new Date().toISOString(),
            image: image || '',
            emoji: '🐶' // Default emoji
        };
        
        try {
            // 处理位置格式
            let markerPosition;
            try {
                if (typeof location.lat === 'function') {
                    // 已经是LatLng对象
                    markerPosition = location;
                } else {
                    // 创建新的LatLng对象
                    markerPosition = new google.maps.LatLng(
                        parseFloat(location.lat),
                        parseFloat(location.lng)
                    );
                }
            } catch (posError) {
                console.error('[Marker Handler] 创建位置对象失败:', posError);
                // 尝试使用地图中心作为备用位置
                try {
                    if (window.map && typeof window.map.getCenter === 'function') {
                        markerPosition = window.map.getCenter();
                    } else {
                        // 使用墨尔本中心坐标创建LatLng对象
                        markerPosition = new google.maps.LatLng(-37.8136, 144.9631);
                    }
                } catch (fallbackError) {
                    console.error('[Marker Handler] 创建备用位置对象失败:', fallbackError);
                    return null;
                }
            }
            
            // 针对移动设备优化的标记选项
            const markerOptions = {
                position: markerPosition,
                // 先不设置地图，稍后再调用setMap
                title: description,
                optimized: true // 启用优化
            };
            
            // 桌面设备添加动画和复杂标签
            if (!isMobile) {
                markerOptions.animation = google.maps.Animation.DROP;
                markerOptions.label = {
                    text: '🐶',
                    fontSize: '24px',
                    className: 'marker-label'
                };
                markerOptions.icon = {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 0,
                };
                markerOptions.optimized = false;
            } else {
                // 移动设备使用简单图标
                markerOptions.icon = {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/></svg>'),
                    scaledSize: new google.maps.Size(30, 30),
                    anchor: new google.maps.Point(15, 15)
                };
            }
            
            // Create marker
            const marker = new google.maps.Marker(markerOptions);
            
            // 安全地设置地图
            try {
                if (isValidMapObject()) {
                    marker.setMap(window.map);
                }
            } catch (setMapError) {
                console.error('[Marker Handler] 设置地图时出错:', setMapError);
                // 继续执行，保留标记对象以便后续使用
            }
            
            // 移动设备上使用更轻量级的点击处理
            if (isMobile) {
                // 使用更轻量级的点击事件
                let clickListener = marker.addListener('click', function() {
                    // 关闭任何已打开的信息窗口
                    if (window.openedInfoWindow) {
                        window.openedInfoWindow.close();
                    }
                    
                    // 简化的信息窗口内容
                    const infoWindow = new google.maps.InfoWindow({
                        content: createInfoWindowContent(description, true),
                        maxWidth: 250 // 移动设备窗口更小
                    });
                    
                    infoWindow.open(window.map, marker);
                    
                    // 保存当前打开的信息窗口引用
                    window.openedInfoWindow = infoWindow;
                });
            } else {
                // 桌面设备使用完整功能
                marker.addListener('click', function() {
                    console.log('[Marker Handler] Marker clicked:', reportData.id);
                    
                    // Call showReportDetails function if available
                    if (typeof window.showReportDetails === 'function') {
                        window.showReportDetails(reportData);
                    } else {
                        // 关闭任何已打开的信息窗口
                        if (window.openedInfoWindow) {
                            window.openedInfoWindow.close();
                        }
                        
                        // 直接在地图上显示信息窗口
                        const infoWindow = new google.maps.InfoWindow({
                            content: createInfoWindowContent(description),
                            maxWidth: 300
                        });
                        
                        infoWindow.open(window.map, marker);
                        
                        // 保存当前打开的信息窗口引用
                        window.openedInfoWindow = infoWindow;
                    }
                });
            }
            
            // Store report data with marker
            marker.reportData = reportData;
            
            // Add to markers array
            window.markers.push(marker);
            
            // 移动设备: 在到达限制前尽量显示更多标记
            if (isMobile && window.markers.length > MOBILE_MARKER_LIMIT) {
                console.log('[Marker Handler] 移动设备上标记数量已达到限制:', MOBILE_MARKER_LIMIT);
                // 保留所有标记数据，从地图上保留最新的标记
                const markersToRemove = window.markers.length - MOBILE_MARKER_LIMIT;
                
                // 创建一个副本以避免修改原数组索引
                const markersToHide = window.markers.slice(0, markersToRemove);
                
                // 仅从地图上移除，但保留在数组中
                markersToHide.forEach(function(marker) {
                    safeSetMap(marker, null);
                });
            } else {
                // 确保所有标记都显示
                window.markers.forEach(function(marker, index) {
                    if (marker && marker.getMap && marker.getMap() === null) {
                        safeSetMap(marker, window.map);
                    }
                });
            }
            
            // 桌面设备立即保存标记，移动设备批量保存以提升性能
            if (!isMobile) {
                // 立即保存
                saveMarkersToStorage();
            } else {
                // 批量保存
                scheduleBatchSave();
            }
            
            return marker;
        } catch (error) {
            console.error('[Marker Handler] Error adding marker:', error);
            return null;
        }
    }
    
    // 批量保存调度函数
    function scheduleBatchSave() {
        if (!isProcessingBatch) {
            isProcessingBatch = true;
            setTimeout(function() {
                saveMarkersToStorage();
                isProcessingBatch = false;
            }, 5000); // 5秒后批量保存
        }
    }
    
    // Create info window content
    function createInfoWindowContent(description, isMobileVersion = false) {
        // 移动设备版本使用更简洁的内容
        if (isMobileVersion) {
            let content = '<div style="padding: 8px; max-width: 250px;">';
            content += `<div style="font-size: 13px; margin-bottom: 6px;">${description}</div>`;
            
            // 简化的时间显示
            const now = new Date();
            content += `<div style="font-size: 11px; color: #666;">${now.toLocaleDateString()}</div>`;
            content += '</div>';
            return content;
        }
        
        // 桌面版本
        let content = '<div style="padding: 10px; max-width: 300px;">';
        
        // Add description
        content += `<div style="font-size: 14px; margin-bottom: 10px;">${description}</div>`;
        
        // Add timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        const dateStr = now.toLocaleDateString();
        content += `<div style="font-size: 12px; color: #666; margin-top: 5px;">${dateStr} ${timeStr}</div>`;
        
        content += '</div>';
        
        return content;
    }
    
    // Load existing markers from storage
    function loadExistingMarkers() {
        console.log('[Marker Handler] Loading existing markers');
        
        try {
            // 确保地图已初始化
            if (!isValidMapObject()) {
                console.warn('[Marker Handler] 地图未完全初始化，延迟加载标记');
                setTimeout(loadExistingMarkers, 2000);
                return;
            }
            
            // Try to load from localStorage
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (!savedMarkers) {
                console.log('[Marker Handler] No saved markers found in storage');
                return;
            }
            
            let markerData;
            try {
                markerData = JSON.parse(savedMarkers);
                if (!Array.isArray(markerData)) {
                    console.warn('[Marker Handler] 标记数据格式不正确');
                    return;
                }
            } catch (parseError) {
                console.error('[Marker Handler] 解析标记数据失败:', parseError);
                // 尝试清理损坏的数据
                localStorage.removeItem('savedMarkers');
                return;
            }
            
            // 过滤无效标记
            const validMarkerData = markerData.filter(data => {
                return data && typeof data.lat === 'number' && typeof data.lng === 'number';
            });
            
            if (validMarkerData.length === 0) {
                console.log('[Marker Handler] 没有有效的标记数据');
                return;
            }
            
            console.log(`[Marker Handler] 找到 ${validMarkerData.length} 个有效标记，准备加载`);
            
            // 移动设备上分批加载标记
            if (isMobile) {
                console.log('[Marker Handler] 移动设备: 分批加载', validMarkerData.length, '个标记');
                
                // 限制初始加载的标记数量
                const initialBatchSize = Math.min(validMarkerData.length, 10);
                // 最大加载数量
                const maxMarkersToLoad = Math.min(validMarkerData.length, MOBILE_MARKER_LIMIT);
                
                // 先加载前几个标记
                for (let i = 0; i < initialBatchSize; i++) {
                    const data = validMarkerData[i];
                    try {
                        addReportMarker(
                            {lat: data.lat, lng: data.lng},
                            data.description || '无描述',
                            data.id,
                            data.image
                        );
                    } catch (err) {
                        console.warn(`[Marker Handler] 加载标记 ${i} 失败:`, err);
                    }
                }
                
                // 剩余标记延迟加载
                if (maxMarkersToLoad > initialBatchSize) {
                    setTimeout(function() {
                        // 批量加载剩余标记
                        for (let i = initialBatchSize; i < maxMarkersToLoad; i++) {
                            const data = validMarkerData[i];
                            try {
                                addReportMarker(
                                    {lat: data.lat, lng: data.lng},
                                    data.description || '无描述',
                                    data.id,
                                    data.image
                                );
                            } catch (err) {
                                console.warn(`[Marker Handler] 加载标记 ${i} 失败:`, err);
                                // 继续加载其他标记
                            }
                        }
                    }, 5000); // 5秒后加载剩余标记
                }
                
                console.log('[Marker Handler] 初始加载', initialBatchSize, '个标记，最大加载', maxMarkersToLoad, '个标记');
            } else {
                // 桌面设备直接加载所有标记
                let loadedCount = 0;
                validMarkerData.forEach(function(data, index) {
                    try {
                        // Add marker to map
                        const marker = addReportMarker(
                            {lat: data.lat, lng: data.lng},
                            data.description || '无描述',
                            data.id,
                            data.image
                        );
                        
                        if (marker) loadedCount++;
                    } catch (err) {
                        console.warn(`[Marker Handler] 加载标记 ${index} 失败:`, err);
                    }
                });
                
                console.log('[Marker Handler] 已成功加载', loadedCount, '个标记，共', validMarkerData.length, '个');
            }
        } catch (error) {
            console.error('[Marker Handler] Error loading markers from storage:', error);
        }
    }
    
    // Save markers to storage
    function saveMarkersToStorage() {
        if (!window.markers) {
            return;
        }
        
        try {
            // Convert markers to simple objects for storage
            const markerData = window.markers.map(function(marker) {
                try {
                    const position = marker.getPosition();
                    const reportData = marker.reportData || {};
                    
                    return {
                        lat: position.lat(),
                        lng: position.lng(),
                        description: reportData.description || marker.getTitle() || '',
                        id: reportData.id || ('marker-' + Date.now()),
                        time: reportData.time || new Date().toISOString(),
                        image: reportData.image || ''
                    };
                } catch (err) {
                    console.warn('[Marker Handler] 跳过无效标记:', err);
                    return null;
                }
            }).filter(item => item !== null); // 过滤掉无效标记
            
            // Save to localStorage
            localStorage.setItem('savedMarkers', JSON.stringify(markerData));
            console.log('[Marker Handler] Saved', markerData.length, 'markers to storage');
        } catch (error) {
            console.error('[Marker Handler] Error saving markers to storage:', error);
        }
    }
    
    // 辅助函数：验证地图对象是否有效
    function isValidMapObject() {
        // 验证地图对象存在且具有必要的方法
        return (
            window.map && 
            typeof window.map === 'object' &&
            typeof window.map.getCenter === 'function' &&
            typeof window.map.getBounds === 'function' &&
            typeof window.map.getDiv === 'function'
        );
    }
    
    // 辅助函数：安全地调用setMap
    function safeSetMap(marker, mapObject) {
        if (!marker || typeof marker !== 'object' || typeof marker.setMap !== 'function') {
            return false;
        }
        
        try {
            // 验证地图对象（如果不是null）
            if (mapObject !== null && !isValidMapObject()) {
                console.warn('[Marker Handler] 尝试使用无效的地图对象');
                return false;
            }
            
            marker.setMap(mapObject);
            return true;
        } catch (error) {
            console.error('[Marker Handler] setMap调用失败:', error);
            return false;
        }
    }
    
    // Expose functions to global scope
    window.MarkerHandler = {
        addReportMarker: addReportMarker,
        loadExistingMarkers: loadExistingMarkers,
        saveMarkersToStorage: saveMarkersToStorage,
        isValidMapObject: isValidMapObject,
        safeSetMap: safeSetMap
    };
})(); 