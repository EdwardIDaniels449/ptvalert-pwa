/**
 * 移动端轻量标记系统
 * 专为移动设备优化的标记处理系统，显著降低内存使用和性能开销
 */

(function() {
    'use strict';
    
    // 移动设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 如果不是移动设备，简单退出
    if (!isMobile) {
        console.log('[Mobile Markers Lite] 非移动设备，跳过轻量标记系统');
        return;
    }
    
    console.log('[Mobile Markers Lite] 初始化移动设备轻量标记系统');
    
    // 配置
    const MAX_MARKERS = 20;        // 最大标记数量
    const BATCH_SIZE = 3;          // 批处理大小
    const LOW_QUALITY_MAP = true;  // 低质量地图渲染以提高性能
    
    // 替换标记相关对象和方法
    function setupLightweightMarkers() {
        // 监听地图加载完成事件
        if (!window.mapLiteHandlerInit) {
            // 当原始处理器初始化时进行拦截
            const originalMarkerHandlerInit = window.initializeMarkerHandler;
            
            // 替换为轻量版本
            window.initializeMarkerHandler = function() {
                console.log('[Mobile Markers Lite] 拦截标记初始化');
                window.markerHandlerInitialized = true;
                
                // 初始化标记数组
                window.markers = window.markers || [];
                window.pendingMarkers = window.pendingMarkers || [];
                
                // 添加简化版本的标记添加函数
                window.addReportMarker = addLightReportMarker;
                
                // 延迟加载现有标记
                setTimeout(loadExistingLightMarkers, 3000);
                
                // 启用移动优化
                enableMobileOptimizations();
            };
            
            window.mapLiteHandlerInit = true;
        }
        
        // 当地图就绪时触发初始化
        document.addEventListener('map_ready', function() {
            if (!window.markerHandlerInitialized) {
                window.initializeMarkerHandler();
            }
        });
    }
    
    // 简化版的添加标记函数
    function addLightReportMarker(location, description, reportId, image) {
        console.log('[Mobile Markers Lite] 添加轻量标记');
        
        // 验证地图对象
        if (!window.map || typeof window.map !== 'object') {
            console.log('[Mobile Markers Lite] 地图未就绪，将标记添加到待处理队列');
            window.pendingMarkers.push({
                location: location,
                description: description,
                reportId: reportId,
                image: image
            });
            return null;
        }
        
        // 确保位置有效
        if (!location || 
            typeof location.lat === 'undefined' || 
            typeof location.lng === 'undefined') {
            console.log('[Mobile Markers Lite] 无效位置');
            return null;
        }
        
        // 检查是否达到最大标记数量
        if (window.markers.length >= MAX_MARKERS) {
            console.log(`[Mobile Markers Lite] 已达最大标记数量(${MAX_MARKERS})，移除旧标记`);
            
            // 移除最旧的标记（保持在地图上显示的标记在限制范围内）
            const markersToRemove = window.markers.slice(0, window.markers.length - MAX_MARKERS + 1);
            
            // 从地图上移除
            markersToRemove.forEach(function(marker) {
                if (marker && typeof marker.setMap === 'function') {
                    marker.setMap(null);
                }
            });
            
            // 更新数组
            window.markers = window.markers.slice(window.markers.length - MAX_MARKERS + 1);
        }
        
        // 创建标记对象
        try {
            // 创建位置
            let markerPosition;
            try {
                if (typeof location.lat === 'function') {
                    markerPosition = location;
                } else {
                    markerPosition = new google.maps.LatLng(
                        parseFloat(location.lat), 
                        parseFloat(location.lng)
                    );
                }
            } catch (e) {
                console.log('[Mobile Markers Lite] 创建位置失败', e);
                return null;
            }
            
            // 使用非常轻量级的标记选项
            const markerOptions = {
                position: markerPosition,
                map: window.map,
                title: description,
                optimized: true,
                // 移动设备使用简单图标
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#4285F4',
                    fillOpacity: 0.8,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 1
                }
            };
            
            // 创建标记
            const marker = new google.maps.Marker(markerOptions);
            
            // 添加简化的点击事件
            marker.addListener('click', function() {
                // 关闭现有信息窗口
                if (window.openedInfoWindow) {
                    window.openedInfoWindow.close();
                }
                
                // 创建简化的信息窗口内容
                const content = '<div style="padding:8px;max-width:200px;font-size:12px;">' + 
                                description + 
                                '</div>';
                
                // 创建信息窗口
                const infoWindow = new google.maps.InfoWindow({
                    content: content,
                    maxWidth: 200
                });
                
                // 打开信息窗口
                infoWindow.open(window.map, marker);
                
                // 保存引用
                window.openedInfoWindow = infoWindow;
            });
            
            // 添加基本的报告数据
            marker.reportData = {
                id: reportId || 'marker-' + Date.now(),
                description: description,
                time: new Date().toISOString(),
                image: ''  // 移动版不存储图片数据以节省内存
            };
            
            // 将标记添加到标记数组
            window.markers.push(marker);
            
            // 延迟保存以减少写入频率
            if (!window._markersUpdateTimeout) {
                window._markersUpdateTimeout = setTimeout(function() {
                    window._markersUpdateTimeout = null;
                    saveLightMarkers();
                }, 5000);
            }
            
            return marker;
        } catch (error) {
            console.log('[Mobile Markers Lite] 创建标记失败', error);
            return null;
        }
    }
    
    // 加载现有标记 - 轻量版
    function loadExistingLightMarkers() {
        console.log('[Mobile Markers Lite] 加载现有标记');
        
        try {
            // 从localStorage获取保存的标记
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (!savedMarkers) {
                console.log('[Mobile Markers Lite] 没有保存的标记');
                return;
            }
            
            // 解析标记数据
            let markerData;
            try {
                markerData = JSON.parse(savedMarkers);
                if (!Array.isArray(markerData)) {
                    console.log('[Mobile Markers Lite] 标记数据格式不正确');
                    return;
                }
            } catch (e) {
                console.log('[Mobile Markers Lite] 解析标记数据失败', e);
                return;
            }
            
            // 移动设备只加载最新的MAX_MARKERS个标记
            if (markerData.length > MAX_MARKERS) {
                markerData = markerData.slice(-MAX_MARKERS);
            }
            
            console.log(`[Mobile Markers Lite] 将加载 ${markerData.length} 个标记`);
            
            // 分批加载标记以改善性能
            loadMarkerBatch(markerData, 0, BATCH_SIZE);
        } catch (error) {
            console.log('[Mobile Markers Lite] 加载标记失败', error);
        }
    }
    
    // 批量加载标记
    function loadMarkerBatch(markerData, startIndex, batchSize) {
        // 检查是否完成所有批次
        if (startIndex >= markerData.length) {
            console.log('[Mobile Markers Lite] 所有标记批次加载完成');
            return;
        }
        
        // 计算本批次的结束索引
        const endIndex = Math.min(startIndex + batchSize, markerData.length);
        console.log(`[Mobile Markers Lite] 加载标记批次 ${startIndex}-${endIndex-1}/${markerData.length}`);
        
        // 加载当前批次的标记
        for (let i = startIndex; i < endIndex; i++) {
            const data = markerData[i];
            
            // 安全检查
            if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
                continue;
            }
            
            try {
                // 添加标记
                addLightReportMarker(
                    {lat: data.lat, lng: data.lng},
                    data.description || '无描述',
                    data.id || ('marker-' + Date.now()),
                    null  // 移动版本不加载图片
                );
            } catch (e) {
                console.log(`[Mobile Markers Lite] 加载标记 ${i} 失败`, e);
            }
        }
        
        // 安排下一批次
        if (endIndex < markerData.length) {
            setTimeout(function() {
                loadMarkerBatch(markerData, endIndex, batchSize);
            }, 1000); // 每秒加载一批
        } else {
            console.log('[Mobile Markers Lite] 标记加载完成');
        }
    }
    
    // 保存标记 - 轻量版
    function saveLightMarkers() {
        try {
            if (!window.markers || window.markers.length === 0) {
                console.log('[Mobile Markers Lite] 没有标记需要保存');
                return;
            }
            
            // 创建简化的标记数据
            const markerData = window.markers.map(function(marker) {
                try {
                    const position = marker.getPosition();
                    
                    return {
                        lat: position.lat(),
                        lng: position.lng(),
                        description: marker.getTitle() || '',
                        id: marker.reportData ? marker.reportData.id : null,
                        time: marker.reportData ? marker.reportData.time : new Date().toISOString()
                    };
                } catch (e) {
                    console.log('[Mobile Markers Lite] 跳过无效标记', e);
                    return null;
                }
            }).filter(item => item !== null);
            
            // 保存到localStorage
            localStorage.setItem('savedMarkers', JSON.stringify(markerData));
            console.log(`[Mobile Markers Lite] 已保存 ${markerData.length} 个标记`);
        } catch (error) {
            console.log('[Mobile Markers Lite] 保存标记失败', error);
        }
    }
    
    // 启用移动端优化
    function enableMobileOptimizations() {
        // 优化地图性能
        if (window.map && LOW_QUALITY_MAP) {
            try {
                // 降低地图质量以提高性能
                window.map.setOptions({
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    scaleControl: false,
                    streetViewControl: false,
                    rotateControl: false,
                    fullscreenControl: false,
                    gestureHandling: 'greedy',
                    styles: [{ stylers: [{ saturation: -50 }] }] // 降低饱和度以减少渲染负担
                });
                
                console.log('[Mobile Markers Lite] 应用低质量地图设置');
            } catch (e) {
                console.log('[Mobile Markers Lite] 设置地图选项失败', e);
            }
        }
        
        // 优化事件处理
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                // 清理不可见时的资源
                console.log('[Mobile Markers Lite] 页面隐藏，清理资源');
                
                // 当页面不可见时，触发GC
                if (window.gc) {
                    window.gc();
                }
            }
        });
    }
    
    // 应用所有轻量级功能
    setupLightweightMarkers();
    
    // 导出全局函数
    window.MobileLightMarkers = {
        addMarker: addLightReportMarker,
        saveMarkers: saveLightMarkers,
        loadMarkers: loadExistingLightMarkers
    };
    
    console.log('[Mobile Markers Lite] 移动端轻量标记系统初始化完成');
})(); 