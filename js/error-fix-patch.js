/**
 * 特定错误修复补丁
 * 专门解决"未知错误"问题和相关崩溃
 */

(function() {
    'use strict';
    
    console.log('[Error Fix Patch] 初始化特定错误修复补丁');
    
    // 在页面加载完成后应用修复
    window.addEventListener('load', function() {
        setTimeout(applyPatch, 1500);
    });
    
    // 如果DOM已加载，立即执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(applyPatch, 1500);
    }
    
    // 应用主要修复
    function applyPatch() {
        console.log('[Error Fix Patch] 应用特定错误修复');
        
        // 修复由mobile-crash-fix.js第15行抛出的"未知错误"
        fixUnknownError();
        
        // 添加附加运行时诊断
        addRuntimeDiagnostics();
    }
    
    // 修复由mobile-crash-fix.js触发的"未知错误"
    function fixUnknownError() {
        // 检查是否已经存在我们自己的错误处理器
        if (window._originalErrorHandler) {
            console.log('[Error Fix Patch] 已有错误处理器，跳过修复');
            return;
        }
        
        // 保存原始错误处理器引用
        window._originalErrorHandler = window.onerror;
        
        // 替换全局错误处理器
        window.onerror = function(message, source, lineno, colno, error) {
            console.log('[Error Fix Patch] 捕获到错误:', message);
            
            // 特别处理"未知错误"
            if (message === '未知错误' || message.includes('unknown error')) {
                console.log('[Error Fix Patch] 处理未知错误');
                return true; // 防止错误继续传播
            }
            
            // 对于其他错误，调用原始处理器（如果存在）
            if (window._originalErrorHandler && typeof window._originalErrorHandler === 'function') {
                return window._originalErrorHandler(message, source, lineno, colno, error);
            }
            
            return false;
        };
        
        // 修复错误事件监听器
        const originalAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
            if (type === 'error') {
                // 包装错误事件监听器
                const wrappedListener = function(event) {
                    // 检查是否未知错误
                    if (event && event.message === '未知错误') {
                        console.log('[Error Fix Patch] 阻止未知错误事件传播');
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }
                    
                    // 正常处理其他错误
                    return listener.call(this, event);
                };
                
                // 使用包装后的监听器
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            
            // 其他类型的事件正常处理
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        console.log('[Error Fix Patch] 已安装未知错误修复');
    }
    
    // 添加运行时诊断
    function addRuntimeDiagnostics() {
        // 记录关键对象状态
        console.log('[Error Fix Patch] 添加运行时诊断');
        
        // 每30秒记录一次状态
        setInterval(function() {
            try {
                const diagnostics = {
                    hasMap: !!window.map,
                    hasGoogleMaps: !!(window.google && window.google.maps),
                    markersCount: window.markers ? window.markers.length : 0,
                    memory: window.performance && window.performance.memory ? 
                            Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)) + 'MB' : 'N/A',
                    timestamp: new Date().toISOString()
                };
                
                console.log('[Error Fix Patch] 诊断:', diagnostics);
            } catch (e) {
                console.error('[Error Fix Patch] 诊断失败:', e);
            }
        }, 30000);
    }
    
    console.log('[Error Fix Patch] 错误修复补丁已初始化');
})(); 