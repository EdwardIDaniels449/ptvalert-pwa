/**
 * 标记清理修复脚本
 * 用于解决"setMap: not an instance of Map"错误和超时标记清理问题
 */

(function() {
    'use strict';
    
    console.log('[Marker Cleanup Fix] 初始化标记清理修复脚本...');
    
    // 当页面加载完成时执行
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initFixScript, 2000); // 延迟2秒执行，确保其他脚本已加载
    });
    
    // 如果DOM已加载，立即执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initFixScript, 2000);
    }
    
    function initFixScript() {
        console.log('[Marker Cleanup Fix] 开始应用修复...');
        
        // 1. 修复清理标记的逻辑，确保在清理前检查地图实例是否有效
        fixMapMarkerCleanup();
        
        // 2. 修复现有标记显示
        fixExistingMarkers();
        
        // 3. 执行立即清理
        performImmediateCleanup();
    }
    
    // 修复标记清理函数
    function fixMapMarkerCleanup() {
        if (!window.MarkersCleanup) {
            console.warn('[Marker Cleanup Fix] MarkersCleanup未定义，无法应用修复');
            return;
        }
        
        // 保存原始清理函数的引用
        const originalCleanupMapMarkers = window.MarkersCleanup.cleanupMapMarkers;
        
        // 替换为安全版本
        window.MarkersCleanup.cleanupMapMarkers = function(cutoffTime) {
            return new Promise((resolve) => {
                console.log('[Marker Cleanup Fix] 使用安全版本的标记清理函数...');
                
                try {
                    // 确保地图标记数组可用
                    if (!window.markers || !Array.isArray(window.markers)) {
                        console.warn('[Marker Cleanup Fix] 地图标记数组未定义或不是数组，跳过地图清理');
                        return resolve({ skipped: true, reason: '地图标记数组未定义' });
                    }
                    
                    // 确保地图实例有效
                    if (!window.map || typeof window.map.getCenter !== 'function') {
                        console.warn('[Marker Cleanup Fix] 地图实例无效，跳过地图清理');
                        return resolve({ skipped: true, reason: '地图实例无效' });
                    }
                    
                    const totalCount = window.markers.length;
                    console.log(`[Marker Cleanup Fix] 检查 ${totalCount} 个标记...`);
                    
                    // 找出需要删除的标记和保留的标记
                    const markersToRemove = [];
                    const markersToKeep = [];
                    let currentTime = new Date();
                    
                    for (let i = 0; i < window.markers.length; i++) {
                        const marker = window.markers[i];
                        
                        // 检查标记是否有效
                        if (!marker) {
                            console.log('[Marker Cleanup Fix] 跳过无效标记');
                            continue;
                        }
                        
                        // 检查是否有reportData
                        if (!marker.reportData || !marker.reportData.time) {
                            markersToKeep.push(marker);
                            continue;
                        }
                        
                        // 检查时间
                        const markerTime = new Date(marker.reportData.time);
                        if (isNaN(markerTime.getTime())) {
                            // 时间格式无效
                            markersToKeep.push(marker);
                            continue;
                        }
                        
                        const ageInMs = currentTime - markerTime;
                        const threeHoursInMs = 3 * 60 * 60 * 1000;
                        
                        if (ageInMs > threeHoursInMs) {
                            markersToRemove.push(marker);
                        } else {
                            markersToKeep.push(marker);
                        }
                    }
                    
                    console.log(`[Marker Cleanup Fix] 找到 ${markersToRemove.length} 个过期标记需要删除`);
                    
                    // 安全地从地图上移除标记
                    for (let i = 0; i < markersToRemove.length; i++) {
                        const marker = markersToRemove[i];
                        safelyRemoveMarker(marker);
                    }
                    
                    // 更新全局标记数组
                    window.markers = markersToKeep;
                    
                    // 保存到localStorage
                    saveMarkersToStorage();
                    
                    resolve({ count: totalCount, removed: markersToRemove.length });
                } catch (error) {
                    console.error('[Marker Cleanup Fix] 清理标记过程中发生错误:', error);
                    resolve({ error: error.message });
                }
            });
        };
        
        console.log('[Marker Cleanup Fix] 已修复标记清理函数');
    }
    
    // 安全地从地图上移除标记
    function safelyRemoveMarker(marker) {
        try {
            if (marker && typeof marker.setMap === 'function') {
                console.log('[Marker Cleanup Fix] 安全移除标记');
                
                // 使用try-catch包裹每个setMap调用
                try {
                    marker.setMap(null);
                } catch (setMapError) {
                    console.warn('[Marker Cleanup Fix] setMap调用出错:', setMapError.message);
                    // 尝试移除监听器以减少内存泄漏
                    if (marker.clickListener) {
                        google.maps.event.removeListener(marker.clickListener);
                    }
                }
            }
        } catch (error) {
            console.error('[Marker Cleanup Fix] 移除标记时出错:', error);
        }
    }
    
    // 修复现有标记
    function fixExistingMarkers() {
        if (!window.markers || !Array.isArray(window.markers)) {
            console.warn('[Marker Cleanup Fix] 没有标记数组，跳过修复');
            return;
        }
        
        if (!window.map) {
            console.warn('[Marker Cleanup Fix] 地图实例不可用，跳过修复');
            return;
        }
        
        console.log(`[Marker Cleanup Fix] 检查 ${window.markers.length} 个现有标记...`);
        
        const invalidMarkers = [];
        
        // 找出无效标记
        for (let i = window.markers.length - 1; i >= 0; i--) {
            const marker = window.markers[i];
            
            // 检查标记是否有效
            if (!marker || typeof marker.getPosition !== 'function') {
                invalidMarkers.push({ index: i, marker: marker });
                continue;
            }
            
            // 检查标记的地图引用
            try {
                // 尝试获取地图引用，如果出错则标记为无效
                marker.getMap();
            } catch (error) {
                invalidMarkers.push({ index: i, marker: marker });
            }
        }
        
        // 从数组中移除无效标记
        if (invalidMarkers.length > 0) {
            console.log(`[Marker Cleanup Fix] 移除 ${invalidMarkers.length} 个无效标记`);
            
            for (let i = invalidMarkers.length - 1; i >= 0; i--) {
                const { index } = invalidMarkers[i];
                window.markers.splice(index, 1);
            }
            
            // 保存修复后的标记
            saveMarkersToStorage();
        }
    }
    
    // 保存标记到本地存储
    function saveMarkersToStorage() {
        try {
            if (!window.markers) return;
            
            // 创建一个不包含循环引用的简化标记数据
            const markerData = window.markers.map(function(marker) {
                if (!marker || typeof marker.getPosition !== 'function') {
                    return null;
                }
                
                const position = marker.getPosition();
                if (!position) return null;
                
                return {
                    lat: position.lat(),
                    lng: position.lng(),
                    description: marker.getTitle ? marker.getTitle() : '',
                    time: marker.reportData ? marker.reportData.time : new Date().toISOString(),
                    image: marker.reportData ? marker.reportData.image : null
                };
            }).filter(Boolean); // 过滤掉null值
            
            localStorage.setItem('savedMarkers', JSON.stringify(markerData));
            console.log(`[Marker Cleanup Fix] 已保存 ${markerData.length} 个标记到localStorage`);
        } catch (error) {
            console.error('[Marker Cleanup Fix] 保存标记到localStorage失败:', error);
        }
    }
    
    // 执行立即清理
    function performImmediateCleanup() {
        if (!window.MarkersCleanup || typeof window.MarkersCleanup.cleanupNow !== 'function') {
            console.warn('[Marker Cleanup Fix] MarkersCleanup.cleanupNow未定义，无法执行清理');
            return;
        }
        
        // 执行立即清理
        setTimeout(function() {
            console.log('[Marker Cleanup Fix] 执行立即清理...');
            window.MarkersCleanup.cleanupNow();
        }, 5000); // 延迟5秒执行
    }
})(); 