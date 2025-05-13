/**
 * 全局缓存函数
 * 解决cacheReportLocally未定义的错误
 */

(function() {
    console.log('[缓存函数] 初始化全局缓存函数...');

    // 定义全局缓存报告函数
    window.cacheReportLocally = window.cacheReportLocally || function(report) {
        try {
            console.log('[缓存函数] 缓存报告到本地存储:', report.id);
            
            // 获取现有缓存
            let cachedReports = [];
            const cachedData = localStorage.getItem('cached_reports');
            if (cachedData) {
                cachedReports = JSON.parse(cachedData);
            }
            
            // 检查报告是否已存在，如果存在则更新
            const existingIndex = cachedReports.findIndex(r => r.id === report.id);
            if (existingIndex !== -1) {
                cachedReports[existingIndex] = report;
            } else {
                cachedReports.push(report);
            }
            
            // 只保留最近的50个报告，避免存储空间过大
            if (cachedReports.length > 50) {
                cachedReports.sort((a, b) => new Date(b.time) - new Date(a.time));
                cachedReports = cachedReports.slice(0, 50);
            }
            
            // 保存回本地存储
            localStorage.setItem('cached_reports', JSON.stringify(cachedReports));
            return true;
        } catch (error) {
            console.error("[缓存函数] 缓存报告到本地存储失败:", error);
            return false;
        }
    };

    // 定义同步到Cloudflare的函数
    window.syncReportToCloudflare = window.syncReportToCloudflare || function(reportData) {
        console.log("[缓存函数] 模拟同步报告到Cloudflare:", reportData.id);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: '模拟同步到Cloudflare成功',
                    data: { reportId: reportData.id }
                });
            }, 500);
        });
    };

    // 定义保存到本地存储的函数
    window.saveToLocalStorage = window.saveToLocalStorage || function(report) {
        try {
            console.log("[缓存函数] 保存报告到本地存储:", report.id);
            
            // 获取现有的待发送报告
            let pendingReports = [];
            const pendingData = localStorage.getItem('pending_reports');
            if (pendingData) {
                pendingReports = JSON.parse(pendingData);
            }
            
            // 添加当前报告到待发送列表
            pendingReports.push({
                ...report,
                pendingSince: new Date().toISOString()
            });
            
            // 限制最大待发送数量
            if (pendingReports.length > 20) {
                pendingReports = pendingReports.slice(-20); // 只保留最新的20条
            }
            
            // 保存回localStorage
            localStorage.setItem('pending_reports', JSON.stringify(pendingReports));
            return true;
        } catch (error) {
            console.error("[缓存函数] 保存报告到本地存储失败:", error);
            return false;
        }
    };

    console.log('[缓存函数] 全局缓存函数初始化完成');
})(); 