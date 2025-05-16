/**
 * 标记加载修复脚本
 * 解决重复加载和保存标记导致的控制台刷屏和内存溢出问题
 */

(function() {
    'use strict';
    
    console.log('[Marker Loading Fix] 初始化标记加载修复...');
    
    // 修复控制台输出
    function reduceConsoleOutput() {
        // 计数器，用于限制日志输出频率
        let logCounter = 0;
        let lastLogTime = Date.now();
        const LOG_INTERVAL = 5000; // 每5秒最多输出一次相同类型的日志
        
        // 存储原始console方法
        const originalConsoleLog = console.log;
        const originalConsoleInfo = console.info;
        
        // 上一条日志信息
        let lastLogMessage = '';
        let repeatCount = 0;
        
        // 替换console.log
        console.log = function() {
            try {
                // 构建日志消息
                const args = Array.from(arguments);
                const message = args.map(arg => 
                    typeof arg === 'string' ? arg : 
                    (arg && typeof arg.toString === 'function' ? arg.toString() : String(arg))
                ).join(' ');
                
                // 检查是否是标记相关的日志
                if (message.includes('Adding report marker') || 
                    message.includes('Saved') && message.includes('markers to storage')) {
                    
                    // 如果是重复的消息
                    if (message === lastLogMessage) {
                        repeatCount++;
                        
                        // 每10次重复或每5秒才输出一次日志
                        if (repeatCount % 10 === 0 || (Date.now() - lastLogTime > LOG_INTERVAL)) {
                            originalConsoleLog.call(console, `[简化] ${message} (重复 ${repeatCount} 次)`);
                            lastLogTime = Date.now();
                        }
                    } else {
                        // 新消息
                        if (repeatCount > 1) {
                            originalConsoleLog.call(console, `[简化] 上一条消息重复了 ${repeatCount} 次`);
                        }
                        
                        // 限制标记相关日志频率
                        logCounter++;
                        if (logCounter % 10 === 0 || (Date.now() - lastLogTime > LOG_INTERVAL)) {
                            originalConsoleLog.apply(console, args);
                            lastLogTime = Date.now();
                        }
                        
                        // 重置重复计数
                        repeatCount = 1;
                        lastLogMessage = message;
                    }
                } else {
                    // 非标记相关的日志正常输出
                    originalConsoleLog.apply(console, args);
                }
            } catch (e) {
                // 出错时回退到原始方法
                originalConsoleLog.apply(console, arguments);
            }
        };
        
        // 同样处理console.info
        console.info = function() {
            try {
                const args = Array.from(arguments);
                const message = args.join(' ');
                
                if (message.includes('marker') || message.includes('标记')) {
                    logCounter++;
                    if (logCounter % 10 === 0 || (Date.now() - lastLogTime > LOG_INTERVAL)) {
                        originalConsoleInfo.apply(console, args);
                        lastLogTime = Date.now();
                    }
                } else {
                    originalConsoleInfo.apply(console, args);
                }
            } catch (e) {
                originalConsoleInfo.apply(console, arguments);
            }
        };
        
        console.log('[Marker Loading Fix] 已减少标记相关的控制台输出');
    }
    
    // 修复标记加载过程
    function fixMarkerLoading() {
        // 注入代码到现有的loadExistingMarkers函数
        const originalLoadExistingMarkers = window.MarkerHandler && window.MarkerHandler.loadExistingMarkers;
        
        if (originalLoadExistingMarkers && !window._markerLoadingFixed) {
            console.log('[Marker Loading Fix] 修复标记加载函数...');
            
            window._markerLoadingFixed = true;
            window.MarkerHandler.loadExistingMarkers = function() {
                try {
                    // 获取保存的标记
                    const savedMarkers = localStorage.getItem('savedMarkers');
                    if (!savedMarkers) {
                        console.log('[Marker Loading Fix] 没有找到保存的标记');
                        return;
                    }
                    
                    // 解析标记数据
                    let markerData = JSON.parse(savedMarkers);
                    if (!Array.isArray(markerData)) {
                        console.log('[Marker Loading Fix] 标记数据格式不正确');
                        return;
                    }
                    
                    // 移动设备上只加载有限数量的标记
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const MAX_MARKERS = isMobile ? 10 : 50;
                    
                    console.log(`[Marker Loading Fix] 找到 ${markerData.length} 个标记, ` + 
                               `${isMobile ? '移动设备' : '桌面设备'} 最多加载 ${MAX_MARKERS} 个`);
                    
                    // 限制标记数量，只保留最新的部分
                    if (markerData.length > MAX_MARKERS) {
                        markerData = markerData.slice(-MAX_MARKERS);
                        
                        // 同时更新localStorage以减少未来的加载量
                        try {
                            localStorage.setItem('savedMarkers', JSON.stringify(markerData));
                            console.log(`[Marker Loading Fix] 已将localStorage中的标记限制为 ${MAX_MARKERS} 个`);
                        } catch (e) {
                            console.log('[Marker Loading Fix] 无法更新localStorage', e);
                        }
                    }
                    
                    // 暂时禁用保存，避免重复保存
                    const originalSaveMarkers = window.MarkerHandler && window.MarkerHandler.saveMarkersToStorage;
                    if (originalSaveMarkers) {
                        window.MarkerHandler.saveMarkersToStorage = function() {
                            console.log('[Marker Loading Fix] 跳过批量加载过程中的保存操作');
                        };
                    }
                    
                    // 分批加载标记
                    const BATCH_SIZE = isMobile ? 2 : 5;
                    const BATCH_DELAY = isMobile ? 1000 : 300;
                    
                    console.log(`[Marker Loading Fix] 将使用批量大小: ${BATCH_SIZE}, 延迟: ${BATCH_DELAY}ms`);
                    
                    // 清除现有标记
                    if (window.markers && window.markers.length > 0) {
                        console.log(`[Marker Loading Fix] 清除 ${window.markers.length} 个现有标记`);
                        window.markers.forEach(function(marker) {
                            if (marker && typeof marker.setMap === 'function') {
                                marker.setMap(null);
                            }
                        });
                        window.markers = [];
                    }
                    
                    let currentBatch = 0;
                    
                    function loadNextBatch() {
                        const startIdx = currentBatch * BATCH_SIZE;
                        if (startIdx >= markerData.length) {
                            console.log('[Marker Loading Fix] 所有批次加载完成');
                            
                            // 恢复保存函数
                            if (originalSaveMarkers) {
                                window.MarkerHandler.saveMarkersToStorage = originalSaveMarkers;
                                
                                // 执行一次最终保存
                                setTimeout(function() {
                                    try {
                                        window.MarkerHandler.saveMarkersToStorage();
                                        console.log('[Marker Loading Fix] 执行最终保存操作');
                                    } catch (e) {
                                        console.log('[Marker Loading Fix] 最终保存失败', e);
                                    }
                                }, 1000);
                            }
                            
                            return;
                        }
                        
                        const endIdx = Math.min(startIdx + BATCH_SIZE, markerData.length);
                        console.log(`[Marker Loading Fix] 加载批次 ${currentBatch+1}: 标记 ${startIdx+1}-${endIdx}/${markerData.length}`);
                        
                        for (let i = startIdx; i < endIdx; i++) {
                            const data = markerData[i];
                            try {
                                // 检查是否已存在相同位置的标记
                                const existingSameLocation = window.markers && window.markers.some(function(m) {
                                    if (!m || !m.getPosition) return false;
                                    const pos = m.getPosition();
                                    return pos && 
                                           Math.abs(pos.lat() - data.lat) < 0.0001 && 
                                           Math.abs(pos.lng() - data.lng) < 0.0001;
                                });
                                
                                // 如果已存在相同位置的标记，则跳过
                                if (existingSameLocation) {
                                    console.log(`[Marker Loading Fix] 跳过重复位置的标记 (${data.lat}, ${data.lng})`);
                                    continue;
                                }
                                
                                // 添加标记，不启用保存
                                if (window.addReportMarker) {
                                    window.addReportMarker(
                                        {lat: data.lat, lng: data.lng},
                                        data.description || '',
                                        data.id
                                    );
                                }
                            } catch (e) {
                                console.log(`[Marker Loading Fix] 加载标记 ${i} 失败`, e);
                            }
                        }
                        
                        // 加载下一批
                        currentBatch++;
                        setTimeout(loadNextBatch, BATCH_DELAY);
                    }
                    
                    // 开始批量加载
                    loadNextBatch();
                    
                    // 已接管标记加载，阻止原始函数执行
                    return;
                } catch (e) {
                    console.log('[Marker Loading Fix] 处理标记失败，回退到原始方法', e);
                    
                    // 回退到原始方法
                    if (originalLoadExistingMarkers) {
                        return originalLoadExistingMarkers();
                    }
                }
            };
            
            console.log('[Marker Loading Fix] 已修复标记加载函数');
        } else {
            console.log('[Marker Loading Fix] 未找到标记加载函数或已修复');
        }
    }
    
    // 优化标记保存频率
    function optimizeMarkerSaving() {
        const originalSaveMarkersToStorage = window.MarkerHandler && window.MarkerHandler.saveMarkersToStorage;
        
        if (originalSaveMarkersToStorage && !window._markerSavingOptimized) {
            console.log('[Marker Loading Fix] 优化标记保存频率...');
            
            window._markerSavingOptimized = true;
            window._lastMarkerSaveTime = 0;
            window._pendingSave = false;
            
            window.MarkerHandler.saveMarkersToStorage = function() {
                // 设置挂起的保存标志
                window._pendingSave = true;
                
                // 如果已有定时器，则返回
                if (window._saveMarkersTimer) {
                    return;
                }
                
                // 当前时间
                const now = Date.now();
                
                // 上次保存后经过的时间
                const timeSinceLastSave = now - window._lastMarkerSaveTime;
                
                // 是否是移动设备
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // 设置保存间隔，移动设备使用更长的间隔
                const SAVE_INTERVAL = isMobile ? 10000 : 5000; // 10秒或5秒
                
                if (timeSinceLastSave < SAVE_INTERVAL) {
                    // 如果距离上次保存时间不够长，则设置定时器延迟保存
                    const delayTime = SAVE_INTERVAL - timeSinceLastSave;
                    
                    window._saveMarkersTimer = setTimeout(function() {
                        window._saveMarkersTimer = null;
                        
                        // 如果仍有挂起的保存请求，则执行保存
                        if (window._pendingSave) {
                            try {
                                // 调用原始保存函数
                                originalSaveMarkersToStorage();
                                
                                // 更新保存时间和状态
                                window._lastMarkerSaveTime = Date.now();
                                window._pendingSave = false;
                                
                                console.log('[Marker Loading Fix] 执行延迟标记保存');
                            } catch (e) {
                                console.log('[Marker Loading Fix] 延迟保存失败', e);
                            }
                        }
                    }, delayTime);
                    
                    console.log(`[Marker Loading Fix] 安排延迟保存 ${delayTime}ms 后执行`);
                } else {
                    // 如果距离上次保存时间足够长，则立即保存
                    try {
                        // 调用原始保存函数
                        originalSaveMarkersToStorage();
                        
                        // 更新保存时间和状态
                        window._lastMarkerSaveTime = Date.now();
                        window._pendingSave = false;
                        
                        console.log('[Marker Loading Fix] 执行立即标记保存');
                    } catch (e) {
                        console.log('[Marker Loading Fix] 立即保存失败', e);
                    }
                }
            };
            
            console.log('[Marker Loading Fix] 已优化标记保存频率');
        } else {
            console.log('[Marker Loading Fix] 未找到标记保存函数或已优化');
        }
    }
    
    // 应用所有修复
    function applyAllFixes() {
        // 先减少控制台输出，让后续修复的日志不会太多
        reduceConsoleOutput();
        
        // DOM加载完成后应用其他修复
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                    fixMarkerLoading();
                    optimizeMarkerSaving();
                }, 500);
            });
        } else {
            // 如果DOM已加载，立即执行
            setTimeout(function() {
                fixMarkerLoading();
                optimizeMarkerSaving();
            }, 500);
        }
    }
    
    // 应用修复
    applyAllFixes();
    
    console.log('[Marker Loading Fix] 标记加载修复初始化完成');
})(); 