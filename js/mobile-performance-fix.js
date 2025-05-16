/**
 * 移动端性能优化和内存管理
 * 解决移动设备因内存不足造成的崩溃问题
 */

(function() {
    'use strict';
    
    // 立即执行，确保在其他脚本之前运行
    console.log('[Mobile Performance] 初始化移动端性能优化');
    
    // 移动设备检测 - 确保它不受其他脚本的干扰
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 如果不是移动设备，简单地退出
    if (!isMobileDevice) {
        console.log('[Mobile Performance] 检测到桌面设备，跳过优化');
        return;
    }
    
    console.log('[Mobile Performance] 检测到移动设备，应用优化');
    
    // 配置常量
    const MAX_MARKERS = 25;         // 移动设备上最大显示的标记数量
    const MARKER_BATCH_SIZE = 5;    // 每批加载的标记数量
    const MARKER_BATCH_DELAY = 1000; // 批量加载之间的延迟毫秒数
    const STORAGE_SAVE_INTERVAL = 5000; // localStorage保存间隔
    
    let lastStorageSaveTime = 0;    // 上次保存的时间戳
    let pendingSave = false;        // 是否有待保存的更改
    
    // 拦截标记相关的函数
    function setupMarkerInterceptors() {
        // 等待DOM加载完成
        window.addEventListener('DOMContentLoaded', function() {
            // 等待一小段时间确保其他脚本已加载
            setTimeout(function() {
                interceptMarkerFunctions();
                setupLocalStorageOptimization();
                limitMemoryUsage();
            }, 1000);
        });
        
        // 在load事件中也进行拦截，以确保不会错过
        window.addEventListener('load', function() {
            interceptMarkerFunctions();
            setupLocalStorageOptimization();
            limitMemoryUsage();
        });
    }
    
    // 拦截标记函数
    function interceptMarkerFunctions() {
        // 确保markers数组存在
        window.markers = window.markers || [];
        
        // 保存原始的addReportMarker函数
        if (window.addReportMarker && !window._originalAddMarker) {
            console.log('[Mobile Performance] 拦截addReportMarker函数');
            window._originalAddMarker = window.addReportMarker;
            
            // 替换为优化版本
            window.addReportMarker = function(location, description, reportId, image) {
                // 检查是否超过最大标记限制
                if (window.markers && window.markers.length >= MAX_MARKERS) {
                    console.log(`[Mobile Performance] 标记数量(${window.markers.length})已达上限(${MAX_MARKERS})，移除最旧标记`);
                    
                    // 移除最旧的标记
                    const numToRemove = Math.ceil(MAX_MARKERS * 0.2); // 移除20%的旧标记
                    const markersToRemove = window.markers.slice(0, numToRemove);
                    
                    // 从地图上移除
                    markersToRemove.forEach(function(marker) {
                        if (marker && typeof marker.setMap === 'function') {
                            marker.setMap(null);
                        }
                    });
                    
                    // 从数组中移除
                    window.markers = window.markers.slice(numToRemove);
                    
                    // 标记需要保存更改
                    pendingSave = true;
                }
                
                // 调用原始函数
                const result = window._originalAddMarker(location, description, reportId, image);
                
                // 标记需要保存更改
                pendingSave = true;
                
                // 如果距离上次保存间隔足够长，则立即保存
                const now = Date.now();
                if (now - lastStorageSaveTime > STORAGE_SAVE_INTERVAL) {
                    saveMarkersToStorage();
                }
                
                return result;
            };
        }
        
        // 拦截loadExistingMarkers函数（如果存在）
        if (window.MarkerHandler && window.MarkerHandler.loadExistingMarkers && !window._originalLoadMarkers) {
            console.log('[Mobile Performance] 拦截loadExistingMarkers函数');
            window._originalLoadMarkers = window.MarkerHandler.loadExistingMarkers;
            
            window.MarkerHandler.loadExistingMarkers = function() {
                try {
                    // 获取保存的标记
                    const savedMarkers = localStorage.getItem('savedMarkers');
                    if (!savedMarkers) {
                        console.log('[Mobile Performance] 没有找到保存的标记');
                        return;
                    }
                    
                    // 解析标记数据
                    let markerData = JSON.parse(savedMarkers);
                    if (!Array.isArray(markerData)) {
                        console.warn('[Mobile Performance] 标记数据格式不正确');
                        return;
                    }
                    
                    // 限制加载的标记数量
                    console.log(`[Mobile Performance] 找到 ${markerData.length} 个标记，限制加载 ${MAX_MARKERS} 个`);
                    
                    // 只加载最新的MAX_MARKERS个标记
                    if (markerData.length > MAX_MARKERS) {
                        markerData = markerData.slice(-MAX_MARKERS);
                    }
                    
                    // 分批加载标记
                    let currentBatch = 0;
                    
                    function loadNextBatch() {
                        if (currentBatch * MARKER_BATCH_SIZE >= markerData.length) {
                            console.log('[Mobile Performance] 所有批次标记已加载完成');
                            return;
                        }
                        
                        const startIdx = currentBatch * MARKER_BATCH_SIZE;
                        const endIdx = Math.min(startIdx + MARKER_BATCH_SIZE, markerData.length);
                        console.log(`[Mobile Performance] 加载标记批次 ${currentBatch + 1}，标记 ${startIdx + 1} 到 ${endIdx}`);
                        
                        // 加载当前批次
                        for (let i = startIdx; i < endIdx; i++) {
                            const data = markerData[i];
                            try {
                                if (window.addReportMarker) {
                                    window.addReportMarker(
                                        {lat: data.lat, lng: data.lng},
                                        data.description || '无描述',
                                        data.id,
                                        data.image
                                    );
                                }
                            } catch (err) {
                                console.log(`[Mobile Performance] 加载标记 ${i} 失败:`, err);
                            }
                        }
                        
                        // 安排下一批次
                        currentBatch++;
                        if (currentBatch * MARKER_BATCH_SIZE < markerData.length) {
                            setTimeout(loadNextBatch, MARKER_BATCH_DELAY);
                        } else {
                            console.log('[Mobile Performance] 完成所有标记批量加载');
                        }
                    }
                    
                    // 开始加载第一批
                    loadNextBatch();
                    
                    // 阻止原始函数执行
                    return;
                } catch (error) {
                    console.log('[Mobile Performance] 优化加载标记失败，回退到原始方法:', error);
                    
                    // 失败时回退到原始函数
                    if (window._originalLoadMarkers) {
                        return window._originalLoadMarkers();
                    }
                }
            };
        }
    }
    
    // 优化localStorage使用
    function setupLocalStorageOptimization() {
        console.log('[Mobile Performance] 设置localStorage优化');
        
        // 查找saveMarkersToStorage函数
        let targetFunction = null;
        
        if (window.MarkerHandler && typeof window.MarkerHandler.saveMarkersToStorage === 'function') {
            targetFunction = window.MarkerHandler.saveMarkersToStorage;
        } else if (typeof window.saveMarkersToStorage === 'function') {
            targetFunction = window.saveMarkersToStorage;
        }
        
        // 如果找到了函数，进行替换
        if (targetFunction && !window._originalSaveMarkersToStorage) {
            console.log('[Mobile Performance] 拦截saveMarkersToStorage函数');
            window._originalSaveMarkersToStorage = targetFunction;
            
            // 用节流版本替换
            window.saveMarkersToStorage = function() {
                // 如果没有待保存的更改，则跳过
                if (!pendingSave) {
                    console.log('[Mobile Performance] 没有待保存的更改，跳过保存');
                    return;
                }
                
                // 如果距离上次保存时间太短，则跳过
                const now = Date.now();
                if (now - lastStorageSaveTime < STORAGE_SAVE_INTERVAL) {
                    console.log('[Mobile Performance] 距离上次保存间隔太短，延迟保存');
                    
                    // 确保稍后会保存
                    if (!window._pendingSaveTimeout) {
                        window._pendingSaveTimeout = setTimeout(function() {
                            window._pendingSaveTimeout = null;
                            saveMarkersToStorage();
                        }, STORAGE_SAVE_INTERVAL);
                    }
                    
                    return;
                }
                
                // 执行保存
                try {
                    if (window._originalSaveMarkersToStorage) {
                        window._originalSaveMarkersToStorage();
                    }
                    
                    // 更新最后保存时间
                    lastStorageSaveTime = now;
                    pendingSave = false;
                    
                    console.log('[Mobile Performance] 标记已成功保存到localStorage');
                } catch (e) {
                    console.log('[Mobile Performance] 保存标记失败:', e);
                }
            };
            
            // 替换全局或MarkerHandler的函数
            if (window.MarkerHandler) {
                window.MarkerHandler.saveMarkersToStorage = window.saveMarkersToStorage;
            }
        }
    }
    
    // 限制内存使用
    function limitMemoryUsage() {
        console.log('[Mobile Performance] 设置内存使用限制');
        
        // 清除不必要的数据
        const cleanupInterval = setInterval(function() {
            // 清除控制台
            if (typeof console.clear === 'function') {
                console.clear();
            }
            
            // 清除可能存在的未使用缓存
            if (window.caches && typeof caches.keys === 'function') {
                caches.keys().then(function(names) {
                    for (let name of names) {
                        if (name.includes('temp') || name.includes('image-cache')) {
                            caches.delete(name);
                        }
                    }
                });
            }
            
            // 提示垃圾回收
            if (window.gc) {
                window.gc();
            }
        }, 60000); // 每60秒清理一次
        
        // 在页面可见性改变时优化内存
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                // 页面进入后台时，释放资源
                if (window.markers && window.markers.length > MAX_MARKERS/2) {
                    // 只保留一半的标记
                    const markersToKeep = window.markers.slice(-Math.floor(MAX_MARKERS/2));
                    
                    // 从地图上移除不保留的标记
                    window.markers.slice(0, -Math.floor(MAX_MARKERS/2)).forEach(function(marker) {
                        if (marker && typeof marker.setMap === 'function') {
                            marker.setMap(null);
                        }
                    });
                    
                    // 更新标记数组
                    window.markers = markersToKeep;
                    pendingSave = true;
                    saveMarkersToStorage();
                    
                    console.log('[Mobile Performance] 页面进入后台，减少标记数量以释放内存');
                }
            } else if (document.visibilityState === 'visible') {
                // 页面恢复前台时，重新加载标记
                console.log('[Mobile Performance] 页面恢复前台，准备重新加载标记');
                
                // 延迟一小段时间后重新加载
                setTimeout(function() {
                    if (window.MarkerHandler && window.MarkerHandler.loadExistingMarkers) {
                        window.MarkerHandler.loadExistingMarkers();
                    }
                }, 1000);
            }
        });
    }
    
    // 应用所有优化
    setupMarkerInterceptors();
    
    // 导出函数到全局以备需要
    window.MobilePerformanceFix = {
        limitMarkers: function(max) {
            // 动态调整标记数量上限
            if (max > 0) {
                console.log(`[Mobile Performance] 调整标记上限: ${MAX_MARKERS} -> ${max}`);
                MAX_MARKERS = max;
                
                // 应用新限制
                if (window.markers && window.markers.length > MAX_MARKERS) {
                    const markersToRemove = window.markers.slice(0, window.markers.length - MAX_MARKERS);
                    markersToRemove.forEach(function(marker) {
                        if (marker && typeof marker.setMap === 'function') {
                            marker.setMap(null);
                        }
                    });
                    window.markers = window.markers.slice(-MAX_MARKERS);
                    pendingSave = true;
                    saveMarkersToStorage();
                }
            }
        }
    };
    
    console.log('[Mobile Performance] 移动端性能优化已应用');
})(); 