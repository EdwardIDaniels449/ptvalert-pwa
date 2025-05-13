/**
 * Firebase到Cloudflare实时同步脚本
 * 在网页应用中定期将Firebase的数据同步到Cloudflare
 */

// 同步配置
const syncConfig = {
    // 同步间隔（毫秒）
    interval: 60000, // 默认1分钟同步一次
    
    // 只同步最近的报告（小时）
    recentHours: 3,
    
    // 是否启用自动同步
    enabled: true,
    
    // 是否发送通知
    sendNotifications: true,
    
    // 上次同步时间
    lastSyncTime: null,
    
    // 同步状态
    status: 'idle', // idle, syncing, success, error
    
    // 上次同步结果
    lastResult: null
};

// 初始化同步系统
function initFirebaseToCloudflareSync() {
    console.log('[FB>CF] 初始化Firebase到Cloudflare同步系统...');
    
    // 如果禁用了同步，直接返回
    if (!syncConfig.enabled) {
        console.log('[FB>CF] 同步系统已禁用');
        return;
    }
    
    // 从localStorage恢复设置
    const savedSettings = localStorage.getItem('firebase-cloudflare-sync');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            Object.assign(syncConfig, settings);
            console.log('[FB>CF] 已从localStorage恢复同步设置', syncConfig);
        } catch (error) {
            console.error('[FB>CF] 解析同步设置失败:', error);
        }
    }
    
    // 开始定时同步
    startPeriodicSync();
    
    // 马上执行一次同步
    syncReportsToCloudflare();
    
    console.log('[FB>CF] 同步系统初始化完成，同步间隔:', syncConfig.interval, 'ms');
}

// 开始定时同步
function startPeriodicSync() {
    // 清除可能存在的旧定时器
    if (window._firebaseCloudflareSync) {
        clearInterval(window._firebaseCloudflareSync);
    }
    
    // 设置新的定时器
    window._firebaseCloudflareSync = setInterval(() => {
        syncReportsToCloudflare();
    }, syncConfig.interval);
    
    console.log('[FB>CF] 已设置定时同步，间隔:', syncConfig.interval, 'ms');
}

// 同步Firebase报告到Cloudflare
function syncReportsToCloudflare() {
    // 如果已经在同步中，跳过这次同步
    if (syncConfig.status === 'syncing') {
        console.log('[FB>CF] 上一次同步尚未完成，跳过本次同步');
        return;
    }
    
    console.log('[FB>CF] 开始同步Firebase报告到Cloudflare...');
    syncConfig.status = 'syncing';
    
    // 计算时间范围（只同步最近n小时的数据）
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - syncConfig.recentHours * 60 * 60 * 1000);
    
    // 从Firebase获取报告
    reportsRef.once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                console.log('[FB>CF] Firebase中没有报告数据');
                return [];
            }
            
            const reports = [];
            snapshot.forEach(childSnapshot => {
                const report = childSnapshot.val();
                
                // 只处理有效报告
                if (!report || !report.id) return;
                
                // 只处理最近的报告
                const reportTime = new Date(report.time);
                if (reportTime < cutoffTime) return;
                
                reports.push(report);
            });
            
            return reports;
        })
        .then(reports => {
            if (!reports.length) {
                console.log('[FB>CF] 没有需要同步的最近报告');
                syncConfig.status = 'success';
                syncConfig.lastSyncTime = new Date().toISOString();
                syncConfig.lastResult = { processed: 0, succeeded: 0, failed: 0 };
                saveConfigToLocalStorage();
                return;
            }
            
            console.log(`[FB>CF] 找到 ${reports.length} 条最近报告需要同步`);
            
            // 准备同步数据
            const syncData = {
                reports: reports,
                sendNotifications: syncConfig.sendNotifications
            };
            
            // 发送到Cloudflare
            return fetch(`${cloudflareConfig.apiUrl}/api/sync-from-firebase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(syncData)
            })
            .then(response => response.json())
            .then(result => {
                console.log('[FB>CF] 同步完成:', result);
                
                // 更新同步状态
                syncConfig.status = 'success';
                syncConfig.lastSyncTime = new Date().toISOString();
                syncConfig.lastResult = result;
                
                // 保存配置到localStorage
                saveConfigToLocalStorage();
                
                // 如果启用了通知，显示成功消息
                if (syncConfig.sendNotifications && result.succeeded > 0) {
                    sendDanmaku(currentLang === 'zh' ? 
                        `${result.succeeded}条报告已同步到Cloudflare并发送通知` : 
                        `${result.succeeded} reports synced to Cloudflare with notifications`
                    );
                }
                
                return result;
            })
            .catch(error => {
                console.error('[FB>CF] 同步失败:', error);
                
                // 更新同步状态
                syncConfig.status = 'error';
                syncConfig.lastResult = { error: error.message };
                
                // 保存配置到localStorage
                saveConfigToLocalStorage();
                
                // 显示错误消息
                sendDanmaku(currentLang === 'zh' ? 
                    '同步到Cloudflare失败' : 
                    'Failed to sync to Cloudflare'
                );
                
                throw error;
            });
        })
        .catch(error => {
            console.error('[FB>CF] 获取Firebase报告失败:', error);
            syncConfig.status = 'error';
            syncConfig.lastResult = { error: error.message };
            saveConfigToLocalStorage();
        });
}

// 保存配置到localStorage
function saveConfigToLocalStorage() {
    try {
        const configToSave = {
            interval: syncConfig.interval,
            recentHours: syncConfig.recentHours,
            enabled: syncConfig.enabled,
            sendNotifications: syncConfig.sendNotifications,
            lastSyncTime: syncConfig.lastSyncTime,
            status: syncConfig.status
        };
        
        localStorage.setItem('firebase-cloudflare-sync', JSON.stringify(configToSave));
    } catch (error) {
        console.error('[FB>CF] 保存同步配置到localStorage失败:', error);
    }
}

// 手动触发同步
function triggerManualSync() {
    console.log('[FB>CF] 手动触发同步...');
    return syncReportsToCloudflare();
}

// 修改同步设置
function updateSyncConfig(newConfig) {
    Object.assign(syncConfig, newConfig);
    
    // 如果修改了同步间隔，重新启动定时器
    if (newConfig.interval !== undefined) {
        startPeriodicSync();
    }
    
    // 保存到localStorage
    saveConfigToLocalStorage();
    
    console.log('[FB>CF] 同步配置已更新:', syncConfig);
}

// 导出API
window.firebaseCloudflareSync = {
    config: syncConfig,
    init: initFirebaseToCloudflareSync,
    syncNow: triggerManualSync,
    updateConfig: updateSyncConfig
}; 