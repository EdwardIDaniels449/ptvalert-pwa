/**
 * 移动端存储清理工具
 * 自动清理localStorage中过多的标记数据，减轻内存负担
 */

(function() {
    'use strict';
    
    // 移动设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 如果不是移动设备，仅执行轻量级清理
    if (!isMobile) {
        console.log('[Storage Cleaner] 检测到桌面设备，仅执行轻量级清理');
        setTimeout(function() {
            try {
                cleanLocalStorage(false);
            } catch (e) {
                console.log('[Storage Cleaner] 轻量级清理失败', e);
            }
        }, 10000);
        return;
    }
    
    console.log('[Storage Cleaner] 初始化移动端存储清理工具');
    
    // 配置参数
    const MAX_MARKERS = 15;          // 移动设备保留的最大标记数
    const AUTO_CLEAN_INTERVAL = 2 * 60 * 1000; // 2分钟自动清理一次
    const STARTUP_DELAY = 5000;      // 启动延迟，等待其他脚本初始化
    const FORCE_CLEAN = true;        // 是否强制清理
    
    // 执行初始清理
    setTimeout(function() {
        cleanLocalStorage(FORCE_CLEAN);
        
        // 设置定期清理
        setInterval(function() {
            cleanLocalStorage(false);
        }, AUTO_CLEAN_INTERVAL);
    }, STARTUP_DELAY);
    
    // 添加存储事件监听器
    window.addEventListener('storage', function(event) {
        if (event.key === 'savedMarkers') {
            console.log('[Storage Cleaner] 检测到标记数据变化，准备清理');
            setTimeout(function() {
                cleanLocalStorage(false);
            }, 1000);
        }
    });
    
    // 监听页面可见性变化，在切换到前台时执行清理
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            console.log('[Storage Cleaner] 页面恢复可见，准备清理');
            cleanLocalStorage(false);
        }
    });
    
    // 清理localStorage函数
    function cleanLocalStorage(forceClean) {
        try {
            console.log('[Storage Cleaner] 开始清理localStorage...');
            
            // 获取保存的标记
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (!savedMarkers) {
                console.log('[Storage Cleaner] 没有找到保存的标记');
                return;
            }
            
            // 解析标记数据
            let markerData;
            try {
                markerData = JSON.parse(savedMarkers);
                if (!Array.isArray(markerData)) {
                    console.log('[Storage Cleaner] 标记数据格式不正确');
                    return;
                }
            } catch (e) {
                console.log('[Storage Cleaner] 解析标记数据失败', e);
                
                // 如果数据损坏，直接清除
                if (forceClean) {
                    localStorage.removeItem('savedMarkers');
                    console.log('[Storage Cleaner] 数据已损坏，已移除savedMarkers');
                }
                return;
            }
            
            // 如果标记数量超出限制，进行裁剪
            if (markerData.length > MAX_MARKERS) {
                console.log(`[Storage Cleaner] 标记数量(${markerData.length})超出限制(${MAX_MARKERS})，正在清理...`);
                
                // 移除重复位置的标记
                const uniqueMarkers = deduplicateMarkers(markerData);
                console.log(`[Storage Cleaner] 去重后剩余 ${uniqueMarkers.length} 个标记`);
                
                // 仍然超出限制时，只保留最新的标记
                if (uniqueMarkers.length > MAX_MARKERS) {
                    const trimmedMarkers = uniqueMarkers.slice(-MAX_MARKERS);
                    
                    // 保存裁剪后的数据
                    localStorage.setItem('savedMarkers', JSON.stringify(trimmedMarkers));
                    console.log(`[Storage Cleaner] 已将标记数量限制为 ${trimmedMarkers.length} 个`);
                    
                    // 如果现有标记数组过长，也进行裁剪
                    if (window.markers && window.markers.length > MAX_MARKERS) {
                        // 从地图上移除多余标记
                        const markersToRemove = window.markers.slice(0, window.markers.length - MAX_MARKERS);
                        markersToRemove.forEach(function(marker) {
                            if (marker && typeof marker.setMap === 'function') {
                                marker.setMap(null);
                            }
                        });
                        
                        // 更新标记数组
                        window.markers = window.markers.slice(-MAX_MARKERS);
                        console.log(`[Storage Cleaner] 已将内存中标记数量限制为 ${window.markers.length} 个`);
                    }
                } else if (uniqueMarkers.length < markerData.length) {
                    // 如果只是去重，也保存更新后的数据
                    localStorage.setItem('savedMarkers', JSON.stringify(uniqueMarkers));
                    console.log(`[Storage Cleaner] 已保存去重后的 ${uniqueMarkers.length} 个标记`);
                }
            } else {
                console.log(`[Storage Cleaner] 标记数量(${markerData.length})在限制范围内，无需清理`);
            }
            
            // 移除其他不必要的存储
            if (forceClean) {
                cleanOtherStorage();
            }
            
            console.log('[Storage Cleaner] localStorage清理完成');
        } catch (e) {
            console.log('[Storage Cleaner] 清理过程中发生错误', e);
        }
    }
    
    // 移除重复位置的标记
    function deduplicateMarkers(markers) {
        const uniquePositions = new Map();
        
        // 遍历标记，保留每个位置最新的标记
        for (const marker of markers) {
            const key = `${Math.round(marker.lat * 10000)},${Math.round(marker.lng * 10000)}`;
            uniquePositions.set(key, marker);
        }
        
        // 返回去重后的标记数组
        return Array.from(uniquePositions.values());
    }
    
    // 清理其他不必要的存储
    function cleanOtherStorage() {
        try {
            // 保留的键列表
            const keysToKeep = [
                'savedMarkers',
                'preferredLanguage',
                'lastSyncTime'
            ];
            
            // 遍历localStorage中的所有键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                
                // 如果不在保留列表中，则移除
                if (key && !keysToKeep.includes(key)) {
                    // 检查是否是图片缓存
                    if (key.includes('image') || key.includes('cache')) {
                        localStorage.removeItem(key);
                        console.log(`[Storage Cleaner] 已移除不必要的存储: ${key}`);
                    }
                }
            }
            
            console.log('[Storage Cleaner] 其他存储清理完成');
        } catch (e) {
            console.log('[Storage Cleaner] 清理其他存储时出错', e);
        }
    }
    
    // 添加手动清理方法到全局对象
    window.MobileStorageCleaner = {
        cleanStorage: function(force) {
            console.log('[Storage Cleaner] 执行手动清理');
            cleanLocalStorage(force === true);
        },
        resetAllStorage: function() {
            // 备份语言设置
            const lang = localStorage.getItem('preferredLanguage');
            
            // 清空所有存储
            localStorage.clear();
            
            // 恢复语言设置
            if (lang) {
                localStorage.setItem('preferredLanguage', lang);
            }
            
            console.log('[Storage Cleaner] 已重置所有存储');
            
            // 刷新页面
            setTimeout(function() {
                window.location.reload();
            }, 500);
        }
    };
    
    console.log('[Storage Cleaner] 移动端存储清理工具初始化完成');
})(); 