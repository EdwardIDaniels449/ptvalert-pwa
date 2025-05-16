/**
 * 标记自动清理工具
 * 负责清理超过三小时的标记，从Cloudflare、Firebase和localStorage中删除
 * 
 * 使用方法:
 * 1. 页面加载时自动启动定时清理
 * 2. 可通过 window.MarkersCleanup.cleanupNow() 手动触发清理
 */

(function() {
    'use strict';
    
    // 配置
    const config = {
        // 清理时间阈值(毫秒) - 3小时
        expirationTime: 3 * 60 * 60 * 1000,
        
        // 检查间隔(毫秒) - 10分钟
        checkInterval: 10 * 60 * 1000,
        
        // 是否打印详细日志
        verbose: true
    };
    
    // 保存定时器引用
    let cleanupInterval = null;
    
    // 初始化清理服务
    function initialize() {
        console.log('[Markers Cleanup] 初始化标记自动清理服务...');
        
        // 启动定时清理
        startPeriodicCleanup();
        
        // 立即执行一次清理
        setTimeout(cleanupExpiredMarkers, 5000);
        
        console.log('[Markers Cleanup] 服务初始化完成，将每', (config.checkInterval / 60000), '分钟检查一次过期标记');
        
        // 在页面关闭前保存清理状态
        window.addEventListener('beforeunload', function() {
            if (cleanupInterval) {
                clearInterval(cleanupInterval);
            }
        });
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
        
        console.log('[Markers Cleanup] 定时清理已启动，间隔:', config.checkInterval / 1000, '秒');
    }
    
    // 主清理函数
    function cleanupExpiredMarkers() {
        log('开始清理过期标记...');
        
        // 计算过期时间点
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - config.expirationTime);
        
        log('清理', cutoffTime, '之前创建的标记');
        
        // 并行执行所有清理任务
        Promise.all([
            cleanupFirebaseMarkers(cutoffTime),
            cleanupCloudflareMarkers(cutoffTime),
            cleanupLocalStorageMarkers(cutoffTime),
            cleanupMapMarkers(cutoffTime)
        ])
        .then(results => {
            const [firebaseResult, cloudflareResult, localStorageResult, mapResult] = results;
            
            log('清理完成统计:',
                'Firebase:', firebaseResult,
                'Cloudflare:', cloudflareResult,
                'localStorage:', localStorageResult,
                '地图:', mapResult
            );
        })
        .catch(error => {
            console.error('[Markers Cleanup] 清理过程中发生错误:', error);
        });
    }
    
    // 清理Firebase中的过期标记
    function cleanupFirebaseMarkers(cutoffTime) {
        return new Promise((resolve) => {
            log('开始清理Firebase中的过期标记...');
            
            try {
                // 检查Firebase是否可用
                if (typeof firebase === 'undefined' || !firebase.database) {
                    console.warn('[Markers Cleanup] Firebase未初始化，跳过Firebase清理');
                    return resolve({skipped: true, reason: 'Firebase未初始化'});
                }
                
                // 获取reports引用
                const reportsRef = firebase.database().ref('reports');
                
                // 查询所有标记
                reportsRef.once('value')
                    .then(snapshot => {
                        if (!snapshot.exists()) {
                            log('Firebase中没有标记数据');
                            return {count: 0, removed: 0};
                        }
                        
                        const expiredReportIds = [];
                        let totalCount = 0;
                        
                        // 找出所有过期的标记
                        snapshot.forEach(childSnapshot => {
                            const report = childSnapshot.val();
                            const reportId = childSnapshot.key;
                            totalCount++;
                            
                            // 跳过无效报告
                            if (!report || !report.time) return;
                            
                            // 检查时间
                            const reportTime = new Date(report.time);
                            if (reportTime < cutoffTime) {
                                expiredReportIds.push(reportId);
                            }
                        });
                        
                        log(`Firebase中有 ${totalCount} 个标记，找到 ${expiredReportIds.length} 个过期标记需要删除`);
                        
                        if (expiredReportIds.length === 0) {
                            return {count: totalCount, removed: 0};
                        }
                        
                        // 批量删除过期标记
                        const deletePromises = expiredReportIds.map(reportId => {
                            return reportsRef.child(reportId).remove()
                                .then(() => {
                                    log(`已从Firebase删除过期标记: ${reportId}`);
                                    return true;
                                })
                                .catch(error => {
                                    console.error(`删除Firebase标记失败 ${reportId}:`, error);
                                    return false;
                                });
                        });
                        
                        // 等待所有删除操作完成
                        return Promise.all(deletePromises)
                            .then(results => {
                                const successCount = results.filter(Boolean).length;
                                return {count: totalCount, removed: successCount};
                            });
                    })
                    .then(result => {
                        log('Firebase标记清理完成:', result);
                        resolve(result);
                    })
                    .catch(error => {
                        console.error('清理Firebase标记时出错:', error);
                        resolve({error: error.message});
                    });
            } catch (error) {
                console.error('清理Firebase标记过程中发生异常:', error);
                resolve({error: error.message});
            }
        });
    }
    
    // 清理Cloudflare中的过期标记
    function cleanupCloudflareMarkers(cutoffTime) {
        return new Promise((resolve) => {
            log('开始清理Cloudflare中的过期标记...');
            
            try {
                // 检查Cloudflare配置是否可用
                const cloudflareConfig = getCloudflareConfig();
                if (!cloudflareConfig || !cloudflareConfig.apiUrl) {
                    console.warn('[Markers Cleanup] Cloudflare配置未找到，跳过Cloudflare清理');
                    return resolve({skipped: true, reason: 'Cloudflare配置未找到'});
                }
                
                // 尝试获取所有标记
                fetch(`${cloudflareConfig.apiUrl}${cloudflareConfig.dataEndpoint || '/api/reports'}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': cloudflareConfig.apiKey ? `Bearer ${cloudflareConfig.apiKey}` : undefined
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data || !data.reports || !Array.isArray(data.reports)) {
                        log('Cloudflare中没有标记数据或格式不正确');
                        return {count: 0, removed: 0};
                    }
                    
                    const totalCount = data.reports.length;
                    
                    // 找出过期的标记
                    const expiredReports = data.reports.filter(report => {
                        if (!report || !report.time) return false;
                        const reportTime = new Date(report.time);
                        return reportTime < cutoffTime;
                    });
                    
                    log(`Cloudflare中有 ${totalCount} 个标记，找到 ${expiredReports.length} 个过期标记需要删除`);
                    
                    if (expiredReports.length === 0) {
                        return {count: totalCount, removed: 0};
                    }
                    
                    // 批量删除
                    const deletePromises = expiredReports.map(report => {
                        return fetch(`${cloudflareConfig.apiUrl}${cloudflareConfig.dataEndpoint || '/api/reports'}/${report.id}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': cloudflareConfig.apiKey ? `Bearer ${cloudflareConfig.apiKey}` : undefined
                            }
                        })
                        .then(response => {
                            if (response.ok) {
                                log(`已从Cloudflare删除过期标记: ${report.id}`);
                                return true;
                            } else {
                                console.error(`删除Cloudflare标记失败 ${report.id}: ${response.status}`);
                                return false;
                            }
                        })
                        .catch(error => {
                            console.error(`删除Cloudflare标记出错 ${report.id}:`, error);
                            return false;
                        });
                    });
                    
                    return Promise.all(deletePromises)
                        .then(results => {
                            const successCount = results.filter(Boolean).length;
                            return {count: totalCount, removed: successCount};
                        });
                })
                .then(result => {
                    log('Cloudflare标记清理完成:', result);
                    resolve(result);
                })
                .catch(error => {
                    console.error('清理Cloudflare标记时出错:', error);
                    resolve({error: error.message});
                });
            } catch (error) {
                console.error('清理Cloudflare标记过程中发生异常:', error);
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
                    console.warn('[Markers Cleanup] localStorage不可用，跳过本地存储清理');
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
                    if (!marker || !marker.time) return true; // 保留没有时间字段的标记
                    const markerTime = new Date(marker.time);
                    return markerTime >= cutoffTime;
                });
                
                const removedCount = markerData.length - validMarkers.length;
                log(`本地存储中有 ${totalCount} 个标记，删除了 ${removedCount} 个过期标记`);
                
                // 保存更新后的标记
                localStorage.setItem('savedMarkers', JSON.stringify(validMarkers));
                
                resolve({count: totalCount, removed: removedCount});
            } catch (error) {
                console.error('清理本地存储标记过程中发生异常:', error);
                resolve({error: error.message});
            }
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
                
                const totalCount = window.markers.length;
                
                // 找出需要删除的标记
                const markersToRemove = [];
                const markersToKeep = [];
                
                window.markers.forEach((marker, index) => {
                    // 跳过无效标记
                    if (!marker || !marker.reportData) {
                        markersToKeep.push(marker);
                        return;
                    }
                    
                    // 检查时间
                    if (!marker.reportData.time) {
                        markersToKeep.push(marker);
                        return;
                    }
                    
                    const markerTime = new Date(marker.reportData.time);
                    if (markerTime < cutoffTime) {
                        markersToRemove.push(marker);
                    } else {
                        markersToKeep.push(marker);
                    }
                });
                
                log(`地图上有 ${totalCount} 个标记，找到 ${markersToRemove.length} 个过期标记需要删除`);
                
                // 删除标记
                markersToRemove.forEach(marker => {
                    // 从地图上移除
                    if (marker && typeof marker.setMap === 'function') {
                        marker.setMap(null);
                    }
                });
                
                // 更新全局标记数组
                window.markers = markersToKeep;
                
                // 如果标记处理器可用，保存更新后的标记
                if (window.MarkerHandler && typeof window.MarkerHandler.saveMarkersToStorage === 'function') {
                    window.MarkerHandler.saveMarkersToStorage();
                }
                
                resolve({count: totalCount, removed: markersToRemove.length});
            } catch (error) {
                console.error('清理地图标记过程中发生异常:', error);
                resolve({error: error.message});
            }
        });
    }
    
    // 获取Cloudflare配置
    function getCloudflareConfig() {
        // 先尝试直接访问全局变量
        if (typeof cloudflareConfig !== 'undefined') {
            return cloudflareConfig;
        }
        
        // 再尝试从window对象获取
        if (window.cloudflareConfig) {
            return window.cloudflareConfig;
        }
        
        // 如果都不可用，返回一个默认配置
        return {
            apiUrl: 'https://ptvalert.qingyangzhou85.workers.dev',
            dataEndpoint: '/api/reports'
        };
    }
    
    // 记录日志
    function log() {
        if (config.verbose) {
            console.log('[Markers Cleanup]', ...arguments);
        }
    }
    
    // 导出API
    window.MarkersCleanup = {
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
        }
    };
    
    // 如果DOM已加载完成，立即初始化；否则等待DOM加载完成
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initialize, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initialize, 1000);
        });
    }
})(); 