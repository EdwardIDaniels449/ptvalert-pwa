/**
 * 标记清理服务
 * 解决 "setMap: not an instance of Map" 错误并确保标记在3小时后过期
 */

(function() {
    'use strict';
    
    console.log('[Marker Cleanup Service] 初始化标记清理服务...');
    
    // 配置
    const config = {
        // 清理时间阈值(毫秒) - 3小时
        expirationTime: 3 * 60 * 60 * 1000,
        
        // 检查间隔(毫秒) - 5分钟
        checkInterval: 5 * 60 * 1000,
        
        // 是否打印详细日志
        verbose: true
    };
    
    // 保存定时器引用
    let cleanupInterval = null;
    
    // 初始化清理服务
    function initialize() {
        console.log('[Marker Cleanup Service] 初始化标记自动清理服务...');
        
        // 修复Google Maps API错误
        fixGoogleMapsMarkers();
        
        // 启动定时清理
        startPeriodicCleanup();
        
        // 立即执行一次清理
        setTimeout(cleanupExpiredMarkers, 5000);
        
        console.log('[Marker Cleanup Service] 服务初始化完成，将每', (config.checkInterval / 60000), '分钟检查一次过期标记');
        
        // 在页面关闭前保存清理状态
        window.addEventListener('beforeunload', function() {
            if (cleanupInterval) {
                clearInterval(cleanupInterval);
            }
        });
    }
    
    // 修复Google Maps标记问题
    function fixGoogleMapsMarkers() {
        // 确保window.markers存在
        if (!window.markers) {
            window.markers = [];
        }
        
        // 验证现有标记
        if (Array.isArray(window.markers)) {
            const validMarkers = [];
            
            for (let i = 0; i < window.markers.length; i++) {
                const marker = window.markers[i];
                
                // 检查标记是否有效
                if (marker && typeof marker.setMap === 'function') {
                    try {
                        // 测试setMap是否有效
                        if (window.map) {
                            // 添加reportData如果不存在
                            if (!marker.reportData) {
                                marker.reportData = {
                                    time: new Date().toISOString()
                                };
                            }
                            validMarkers.push(marker);
                        }
                    } catch (e) {
                        console.warn('[Marker Cleanup Service] 无效标记发现:', e);
                    }
                }
            }
            
            // 更新全局标记数组
            window.markers = validMarkers;
            console.log(`[Marker Cleanup Service] 验证了 ${validMarkers.length} 个有效标记`);
        }
    }
    
    // 启动定时清理
    function startPeriodicCleanup() {
        // 清除可能存在的旧定时器
        if (cleanupInterval) {
            clearInterval(cleanupInterval);
        }
        
        // 设置新的定时器
        cleanupInterval = setInterval(function() {
            cleanupExpiredMarkers();
        }, config.checkInterval);
        
        console.log('[Marker Cleanup Service] 定时清理已启动，间隔:', config.checkInterval / 1000, '秒');
    }
    
    // 主清理函数
    function cleanupExpiredMarkers() {
        log('开始清理过期标记...');
        
        // 计算过期时间点
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - config.expirationTime);
        
        log('清理', cutoffTime, '之前创建的标记');
        
        // 执行地图标记清理
        cleanupMapMarkers(cutoffTime)
            .then(result => {
                log('地图标记清理完成:', result);
                
                // 清理本地存储中的标记
                return cleanupLocalStorageMarkers(cutoffTime);
            })
            .then(result => {
                log('本地存储标记清理完成:', result);
            })
            .catch(error => {
                console.error('[Marker Cleanup Service] 清理过程中发生错误:', error);
            });
    }
    
    // 清理地图上显示的过期标记
    function cleanupMapMarkers(cutoffTime) {
        return new Promise((resolve) => {
            log('开始清理地图上的过期标记...');
            
            try {
                // 检查地图标记数组是否可用
                if (!window.markers || !Array.isArray(window.markers)) {
                    log('地图标记数组未定义或不是数组，跳过地图清理');
                    return resolve({skipped: true, reason: '地图标记数组未定义'});
                }
                
                // 确保地图实例有效
                if (!isValidMapInstance(window.map)) {
                    log('地图实例无效，跳过地图清理');
                    return resolve({skipped: true, reason: '地图实例无效'});
                }
                
                const totalCount = window.markers.length;
                log(`地图上有 ${totalCount} 个标记待检查`);
                
                // 找出需要删除的标记
                const markersToRemove = [];
                const markersToKeep = [];
                
                for (let i = 0; i < window.markers.length; i++) {
                    const marker = window.markers[i];
                    
                    // 跳过无效标记
                    if (!marker || typeof marker.setMap !== 'function') {
                        continue;
                    }
                    
                    // 如果没有reportData，添加一个默认值
                    if (!marker.reportData) {
                        marker.reportData = {
                            time: new Date().toISOString()
                        };
                        markersToKeep.push(marker);
                        continue;
                    }
                    
                    // 检查时间
                    if (!marker.reportData.time) {
                        marker.reportData.time = new Date().toISOString();
                        markersToKeep.push(marker);
                        continue;
                    }
                    
                    // 解析时间
                    try {
                        const markerTime = new Date(marker.reportData.time);
                        if (isNaN(markerTime.getTime())) {
                            marker.reportData.time = new Date().toISOString();
                            markersToKeep.push(marker);
                            continue;
                        }
                        
                        // 检查是否过期
                        if (markerTime < cutoffTime) {
                            markersToRemove.push(marker);
                        } else {
                            markersToKeep.push(marker);
                        }
                    } catch (e) {
                        // 时间解析错误，保留标记但更新时间
                        marker.reportData.time = new Date().toISOString();
                        markersToKeep.push(marker);
                    }
                }
                
                log(`找到 ${markersToRemove.length} 个过期标记需要删除`);
                
                // 删除标记
                for (let i = 0; i < markersToRemove.length; i++) {
                    safelyRemoveMarker(markersToRemove[i]);
                }
                
                // 更新全局标记数组
                window.markers = markersToKeep;
                
                // 保存更新后的标记
                saveMarkersToStorage();
                
                resolve({count: totalCount, removed: markersToRemove.length});
            } catch (error) {
                console.error('[Marker Cleanup Service] 清理地图标记过程中发生异常:', error);
                resolve({error: error.message});
            }
        });
    }
    
    // 清理本地存储中的过期标记
    function cleanupLocalStorageMarkers(cutoffTime) {
        return new Promise((resolve) => {
            log('开始清理本地存储中的过期标记...');
            
            try {
                // 检查localStorage是否可用
                if (typeof localStorage === 'undefined') {
                    console.warn('[Marker Cleanup Service] localStorage不可用，跳过本地存储清理');
                    return resolve({skipped: true, reason: 'localStorage不可用'});
                }
                
                // 获取现有标记
                const savedMarkers = localStorage.getItem('savedMarkers');
                if (!savedMarkers) {
                    log('本地存储中没有标记数据');
                    return resolve({count: 0, removed: 0});
                }
                
                const markerData = JSON.parse(savedMarkers);
                if (!Array.isArray(markerData)) {
                    console.warn('本地存储中的标记数据格式不正确');
                    return resolve({count: 0, error: '标记数据格式不正确'});
                }
                
                const totalCount = markerData.length;
                
                // 过滤掉过期标记
                const validMarkers = markerData.filter(marker => {
                    if (!marker || !marker.time) {
                        // 没有时间信息的标记添加当前时间
                        if (marker) marker.time = new Date().toISOString();
                        return true;
                    }
                    
                    try {
                        const markerTime = new Date(marker.time);
                        return !isNaN(markerTime.getTime()) && markerTime >= cutoffTime;
                    } catch (e) {
                        // 时间解析错误，保留标记但更新时间
                        marker.time = new Date().toISOString();
                        return true;
                    }
                });
                
                const removedCount = markerData.length - validMarkers.length;
                log(`本地存储中有 ${totalCount} 个标记，删除了 ${removedCount} 个过期标记`);
                
                // 保存更新后的标记
                localStorage.setItem('savedMarkers', JSON.stringify(validMarkers));
                
                resolve({count: totalCount, removed: removedCount});
            } catch (error) {
                console.error('[Marker Cleanup Service] 清理本地存储标记过程中发生异常:', error);
                resolve({error: error.message});
            }
        });
    }
    
    // 安全地从地图上移除标记
    function safelyRemoveMarker(marker) {
        if (!marker) return;
        
        try {
            // 确保地图实例有效
            if (isValidMapInstance(window.map) && typeof marker.setMap === 'function') {
                marker.setMap(null);
                
                // 移除事件监听器以避免内存泄漏
                if (marker.clickListener) {
                    google.maps.event.removeListener(marker.clickListener);
                }
                
                log('成功移除标记');
            }
        } catch (error) {
            console.error('[Marker Cleanup Service] 移除标记时出错:', error);
        }
    }
    
    // 检查地图实例是否有效
    function isValidMapInstance(map) {
        if (!map) return false;
        
        try {
            // 检查是否是Google Maps实例
            if (typeof google !== 'undefined' && google.maps && google.maps.Map && map instanceof google.maps.Map) {
                return true;
            }
            
            // 检查是否有必要的方法
            return typeof map.getCenter === 'function' && 
                   typeof map.setCenter === 'function' && 
                   typeof map.getBounds === 'function';
        } catch (e) {
            return false;
        }
    }
    
    // 保存标记到本地存储
    function saveMarkersToStorage() {
        try {
            if (!window.markers || !Array.isArray(window.markers)) return;
            
            // 创建标记数据数组
            const markerData = window.markers.map(function(marker) {
                try {
                    if (!marker || typeof marker.getPosition !== 'function') return null;
                    
                    const position = marker.getPosition();
                    if (!position) return null;
                    
                    // 创建带时间戳的标记数据
                    return {
                        lat: position.lat(),
                        lng: position.lng(),
                        description: marker.getTitle ? marker.getTitle() : '',
                        time: marker.reportData && marker.reportData.time 
                            ? marker.reportData.time 
                            : new Date().toISOString()
                    };
                } catch (e) {
                    return null;
                }
            }).filter(Boolean); // 过滤掉null值
            
            // 保存到localStorage
            localStorage.setItem('savedMarkers', JSON.stringify(markerData));
            log(`已保存 ${markerData.length} 个标记到localStorage`);
        } catch (error) {
            console.error('[Marker Cleanup Service] 保存标记到localStorage失败:', error);
        }
    }
    
    // 记录日志
    function log() {
        if (config.verbose) {
            console.log('[Marker Cleanup Service]', ...arguments);
        }
    }
    
    // 导出API
    window.MarkerCleanupService = {
        // 初始化清理服务
        init: initialize,
        
        // 立即执行一次清理
        cleanupNow: cleanupExpiredMarkers,
        
        // 更新配置
        updateConfig: function(newConfig) {
            Object.assign(config, newConfig);
            
            // 如果更新了检查间隔，重启定时器
            if (newConfig.checkInterval) {
                startPeriodicCleanup();
            }
        },
        
        // 安全地移除标记
        safelyRemoveMarker: safelyRemoveMarker
    };
    
    // 如果DOM已加载完成，立即初始化；否则等待DOM加载完成
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initialize, 2000);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initialize, 2000);
        });
    }
})(); 