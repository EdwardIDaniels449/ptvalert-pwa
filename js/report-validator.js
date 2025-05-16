/**
 * 报告数据验证工具
 * 用于在同步报告到Cloudflare之前验证数据的有效性
 */

(function() {
    'use strict';
    
    // 验证报告数据的有效性
    function validateReportData(reportData, shouldThrow = false) {
        // 验证结果对象
        const result = {
            isValid: true,
            errors: []
        };
        
        // 1. 检查报告对象是否存在
        if (!reportData) {
            result.isValid = false;
            result.errors.push("报告数据为空");
            if (shouldThrow) throw new Error("无效的报告数据: 数据为空");
            return result;
        }
        
        // 2. 检查报告对象是否为对象类型
        if (typeof reportData !== 'object') {
            result.isValid = false;
            result.errors.push(`报告数据类型错误: ${typeof reportData}`);
            if (shouldThrow) throw new Error("无效的报告数据: 数据类型错误");
            return result;
        }
        
        // 3. 检查必要的字段
        const requiredFields = ['id', 'lat', 'lng', 'description', 'time'];
        const missingFields = requiredFields.filter(field => {
            return reportData[field] === undefined || reportData[field] === null;
        });
        
        if (missingFields.length > 0) {
            result.isValid = false;
            result.errors.push(`缺少必要字段: ${missingFields.join(', ')}`);
            if (shouldThrow) throw new Error(`无效的报告数据: 缺少字段 ${missingFields.join(', ')}`);
        }
        
        // 4. 验证id字段
        if (reportData.id !== undefined && reportData.id !== null) {
            if (typeof reportData.id !== 'string' && typeof reportData.id !== 'number') {
                result.isValid = false;
                result.errors.push(`id字段类型错误: ${typeof reportData.id}`);
                if (shouldThrow) throw new Error("无效的报告数据: id字段类型错误");
            }
        }
        
        // 5. 验证经纬度
        if (reportData.lat !== undefined && reportData.lng !== undefined) {
            if (typeof reportData.lat !== 'number' || typeof reportData.lng !== 'number') {
                result.isValid = false;
                result.errors.push('经纬度必须为数字');
                if (shouldThrow) throw new Error("无效的报告数据: 经纬度必须为数字");
            }
        }
        
        // 6. 验证描述
        if (reportData.description !== undefined) {
            if (typeof reportData.description !== 'string') {
                result.isValid = false;
                result.errors.push('描述必须为字符串');
                if (shouldThrow) throw new Error("无效的报告数据: 描述必须为字符串");
            } else if (reportData.description.length === 0) {
                result.isValid = false;
                result.errors.push('描述不能为空');
                if (shouldThrow) throw new Error("无效的报告数据: 描述不能为空");
            }
        }
        
        // 7. 验证时间
        if (reportData.time !== undefined) {
            const timeAsDate = new Date(reportData.time);
            if (isNaN(timeAsDate.getTime())) {
                result.isValid = false;
                result.errors.push('时间格式无效');
                if (shouldThrow) throw new Error("无效的报告数据: 时间格式无效");
            }
        }
        
        return result;
    }
    
    // 修复报告中可能的问题
    function sanitizeReportData(reportData) {
        if (!reportData) return null;
        
        const sanitized = {...reportData};
        
        // 确保id是字符串
        if (sanitized.id !== undefined && sanitized.id !== null) {
            sanitized.id = String(sanitized.id);
        }
        
        // 确保经纬度是数字
        if (sanitized.lat !== undefined) {
            sanitized.lat = parseFloat(sanitized.lat);
        }
        
        if (sanitized.lng !== undefined) {
            sanitized.lng = parseFloat(sanitized.lng);
        }
        
        // 确保描述是字符串
        if (sanitized.description !== undefined) {
            sanitized.description = String(sanitized.description);
        }
        
        // 确保时间是有效的日期字符串
        if (sanitized.time) {
            const timeAsDate = new Date(sanitized.time);
            if (isNaN(timeAsDate.getTime())) {
                sanitized.time = new Date().toISOString();
            }
        } else {
            sanitized.time = new Date().toISOString();
        }
        
        return sanitized;
    }
    
    // 导出工具函数到全局
    window.ReportValidator = {
        validate: validateReportData,
        sanitize: sanitizeReportData
    };
    
    console.log("报告数据验证工具已加载");
})(); 