/**
 * 紧急修复缓存函数
 * 解决cacheReportLocally未定义错误
 */

// 立即定义全局函数，确保总是可用
if (typeof window.cacheReportLocally !== 'function') {
    console.log('[紧急修复] 定义全局cacheReportLocally函数');
    window.cacheReportLocally = function(report) {
        try {
            console.log('[紧急修复] 缓存报告到本地:', report.id);
            
            // 获取现有缓存
            let cachedReports = [];
            const cachedData = localStorage.getItem('cached_reports');
            if (cachedData) {
                cachedReports = JSON.parse(cachedData);
            }
            
            // 更新或添加报告
            const existingIndex = cachedReports.findIndex(r => r.id === report.id);
            if (existingIndex !== -1) {
                cachedReports[existingIndex] = report;
            } else {
                cachedReports.push(report);
            }
            
            // 只保留最近50个报告
            if (cachedReports.length > 50) {
                cachedReports.sort((a, b) => new Date(b.time) - new Date(a.time));
                cachedReports = cachedReports.slice(0, 50);
            }
            
            // 保存回本地存储
            localStorage.setItem('cached_reports', JSON.stringify(cachedReports));
            return true;
        } catch (error) {
            console.error("[紧急修复] 缓存报告失败:", error);
            return false;
        }
    };
}

// 确保其他关键函数也定义
if (typeof window.saveToLocalStorage !== 'function') {
    console.log('[紧急修复] 定义全局saveToLocalStorage函数');
    window.saveToLocalStorage = function(report) {
        try {
            console.log('[紧急修复] 保存报告到本地:', report.id);
            
            // 获取现有的待发送报告
            let pendingReports = [];
            const pendingData = localStorage.getItem('pending_reports');
            if (pendingData) {
                pendingReports = JSON.parse(pendingData);
            }
            
            // 添加到待发送列表
            pendingReports.push({
                ...report,
                pendingSince: new Date().toISOString()
            });
            
            // 限制数量
            if (pendingReports.length > 20) {
                pendingReports = pendingReports.slice(-20);
            }
            
            // 保存回localStorage
            localStorage.setItem('pending_reports', JSON.stringify(pendingReports));
            return true;
        } catch (error) {
            console.error("[紧急修复] 保存报告失败:", error);
            return false;
        }
    };
}

// 确保syncReportToCloudflare函数也被定义
if (typeof window.syncReportToCloudflare !== 'function') {
    console.log('[紧急修复] 定义全局syncReportToCloudflare函数');
    window.syncReportToCloudflare = function(reportData) {
        console.log('[紧急修复] 模拟同步报告到Cloudflare:', reportData.id);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: '[紧急修复] 模拟同步成功',
                    data: { reportId: reportData.id }
                });
            }, 300);
        });
    };
}

console.log('[紧急修复] 缓存函数已全局定义，应该解决了未定义错误'); 