/**
 * 移动端标记修复脚本
 * 解决移动设备上标记管理的问题，防止setMap错误和内存泄漏
 */

(function() {
    'use strict';
    
    console.log('[Mobile Markers] 初始化移动端标记修复');
    
    // 是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
        console.log('[Mobile Markers] 不是移动设备，跳过此修复');
        return;
    }
    
    // 等待DOM加载完成
    window.addEventListener('DOMContentLoaded', function() {
        // 等待Google Maps API加载完成
        const waitForGoogleMaps = setInterval(function() {
            if (window.google && window.google.maps && window.map) {
                clearInterval(waitForGoogleMaps);
                applyMarkerFixes();
            }
        }, 200);
        
        // 10秒后如果仍未加载，强制应用修复
        setTimeout(function() {
            clearInterval(waitForGoogleMaps);
            applyMarkerFixes();
        }, 10000);
    });
    
    // 应用标记修复
    function applyMarkerFixes() {
        console.log('[Mobile Markers] 应用标记修复');
        
        // 存储所有标记
        window.allMarkers = window.allMarkers || [];
        
        // 定期清理无效标记
        setInterval(cleanupInvalidMarkers, 30000);
        
        // 安全地添加标记的方法
        window.addSafeMarker = function(position, title, options) {
            try {
                // 确保地图对象可用
                if (!window.map || !window.google || !window.google.maps) {
                    console.warn('[Mobile Markers] 地图尚未初始化，无法添加标记');
                    return null;
                }
                
                // 确保位置有效
                if (!position || typeof position !== 'object' || 
                    (typeof position.lat !== 'function' && !position.lat)) {
                    console.warn('[Mobile Markers] 无效的位置对象:', position);
                    return null;
                }
                
                // 处理位置格式
                let markerPosition;
                if (typeof position.lat === 'function') {
                    // 这已经是LatLng对象
                    markerPosition = position;
                } else if (typeof position.lat === 'number' && typeof position.lng === 'number') {
                    // 这是一个{lat, lng}简单对象
                    markerPosition = new google.maps.LatLng(position.lat, position.lng);
                } else {
                    // 尝试使用提供的值
                    const lat = parseFloat(position.lat || 0);
                    const lng = parseFloat(position.lng || 0);
                    markerPosition = new google.maps.LatLng(lat, lng);
                }
                
                // 准备标记选项
                const markerOptions = Object.assign({
                    position: markerPosition,
                    map: window.map,
                    title: title || '',
                    optimized: false, // 使用DOM元素而非Canvas渲染，在某些移动设备上更稳定
                    clickable: true,
                    visible: true
                }, options || {});
                
                // 创建标记
                const marker = new google.maps.Marker(markerOptions);
                
                // 添加到标记管理数组
                window.allMarkers.push({
                    marker: marker,
                    timestamp: Date.now(),
                    position: {
                        lat: markerPosition.lat(),
                        lng: markerPosition.lng()
                    },
                    title: title || ''
                });
                
                return marker;
            } catch (error) {
                console.error('[Mobile Markers] 添加标记时出错:', error);
                return null;
            }
        };
        
        // 安全地移除标记的方法
        window.removeSafeMarker = function(marker) {
            try {
                if (!marker) return false;
                
                // 先从地图中移除
                try {
                    marker.setMap(null);
                } catch (setMapError) {
                    console.warn('[Mobile Markers] setMap(null)失败:', setMapError);
                }
                
                // 从数组中移除
                window.allMarkers = window.allMarkers.filter(function(item) {
                    return item.marker !== marker;
                });
                
                return true;
            } catch (error) {
                console.error('[Mobile Markers] 移除标记时出错:', error);
                return false;
            }
        };
        
        // 更安全的setMap方法
        if (window.google && window.google.maps && window.google.maps.Marker) {
            const originalSetMap = window.google.maps.Marker.prototype.setMap;
            window.google.maps.Marker.prototype.setMap = function(map) {
                try {
                    // 如果map不是null且不是有效的地图对象，则防御性处理
                    if (map !== null && (typeof map !== 'object' || !map.getDiv)) {
                        console.warn('[Mobile Markers] 尝试使用无效的地图对象:', map);
                        return;
                    }
                    
                    // 调用原始方法
                    return originalSetMap.call(this, map);
                } catch (error) {
                    console.error('[Mobile Markers] setMap错误:', error);
                    // 不抛出异常，防止导致应用崩溃
                }
            };
        }
        
        // 实现标记自动过期
        window.markerExpirationTime = 3 * 60 * 60 * 1000; // 3小时
        
        // 修复全局标记数组
        if (window.markers && Array.isArray(window.markers)) {
            // 将原始标记迁移到新的安全数组
            window.markers.forEach(function(marker) {
                try {
                    if (marker && typeof marker.getPosition === 'function') {
                        window.allMarkers.push({
                            marker: marker,
                            timestamp: Date.now(),
                            position: {
                                lat: marker.getPosition().lat(),
                                lng: marker.getPosition().lng()
                            },
                            title: marker.getTitle() || ''
                        });
                    }
                } catch (e) {
                    console.warn('[Mobile Markers] 迁移标记时出错:', e);
                }
            });
        }
        
        // 处理原始addReportMarker函数
        if (typeof window.addReportMarker === 'function') {
            const originalAddReportMarker = window.addReportMarker;
            window.addReportMarker = function(location, description) {
                try {
                    // 先尝试使用原始方法
                    const originalResult = originalAddReportMarker(location, description);
                    if (originalResult) {
                        return originalResult;
                    }
                    
                    // 如果原始方法失败，使用安全方法
                    console.log('[Mobile Markers] 原始addReportMarker失败，使用安全方法');
                    
                    // 转换位置对象为必要的格式
                    const position = location;
                    
                    // 创建安全标记
                    const marker = window.addSafeMarker(position, description, {
                        animation: window.google.maps.Animation.DROP,
                        label: {
                            text: '🚩',
                            fontSize: '24px'
                        },
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 0
                        }
                    });
                    
                    // 添加点击事件
                    if (marker) {
                        marker.reportData = {
                            description: description,
                            position: position,
                            timestamp: Date.now()
                        };
                        
                        google.maps.event.addListener(marker, 'click', function() {
                            if (window.openedInfoWindow) {
                                window.openedInfoWindow.close();
                            }
                            
                            // 创建信息窗口
                            const infoWindow = new google.maps.InfoWindow({
                                content: `<div style="padding:8px;max-width:200px;"><div style="margin-bottom:5px;font-weight:bold;">报告</div><div>${description}</div></div>`,
                                maxWidth: 200
                            });
                            
                            infoWindow.open(window.map, marker);
                            window.openedInfoWindow = infoWindow;
                        });
                    }
                    
                    return marker;
                } catch (error) {
                    console.error('[Mobile Markers] 添加报告标记失败:', error);
                    
                    // 创建一个最基本的标记作为后备
                    try {
                        const fallbackMarker = new google.maps.Marker({
                            position: new google.maps.LatLng(
                                parseFloat(location.lat || 0),
                                parseFloat(location.lng || 0)
                            ),
                            map: window.map,
                            title: description || '标记'
                        });
                        
                        fallbackMarker.reportData = {
                            description: description,
                            position: location,
                            timestamp: Date.now()
                        };
                        
                        window.allMarkers.push({
                            marker: fallbackMarker,
                            timestamp: Date.now(),
                            position: {
                                lat: parseFloat(location.lat || 0),
                                lng: parseFloat(location.lng || 0)
                            },
                            title: description || ''
                        });
                        
                        return fallbackMarker;
                    } catch (fallbackError) {
                        console.error('[Mobile Markers] 后备标记创建也失败:', fallbackError);
                        return null;
                    }
                }
            };
        }
        
        // 清理过期和无效标记
        function cleanupInvalidMarkers() {
            try {
                const now = Date.now();
                const expirationTime = window.markerExpirationTime || 3 * 60 * 60 * 1000; // 默认3小时
                
                // 保存有效标记
                const validMarkers = [];
                
                // 遍历所有标记
                window.allMarkers.forEach(function(item) {
                    try {
                        const marker = item.marker;
                        const timestamp = item.timestamp;
                        
                        // 检查标记是否过期
                        if (now - timestamp > expirationTime) {
                            console.log('[Mobile Markers] 标记已过期，移除');
                            try {
                                marker.setMap(null);
                            } catch (e) {
                                console.warn('[Mobile Markers] 移除过期标记时出错:', e);
                            }
                            return;
                        }
                        
                        // 检查标记是否有效
                        if (!marker || typeof marker.getPosition !== 'function') {
                            console.log('[Mobile Markers] 标记无效，移除');
                            return;
                        }
                        
                        // 标记有效，保留
                        validMarkers.push(item);
                    } catch (itemError) {
                        console.warn('[Mobile Markers] 处理标记项时出错:', itemError);
                    }
                });
                
                // 更新标记数组
                window.allMarkers = validMarkers;
                
                console.log(`[Mobile Markers] 标记清理完成，有效标记数量: ${validMarkers.length}`);
            } catch (error) {
                console.error('[Mobile Markers] 清理标记时出错:', error);
            }
        }
        
        console.log('[Mobile Markers] 标记修复已应用');
    }
})(); 