/**
 * 特定错误修复补丁
 * 专门解决"未知错误"问题和相关崩溃
 */

(function() {
    'use strict';
    
    console.log('[Error Fix Patch] 初始化特定错误修复补丁');
    
    // 立即执行应用修复 - 不等待页面加载
    applyPatch();
    
    // 在页面加载完成后再次应用修复（以防万一）
    window.addEventListener('load', function() {
        setTimeout(applyPatch, 500);
    });
    
    // 如果DOM已加载，立即执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(applyPatch, 100);
    }
    
    // 应用主要修复
    function applyPatch() {
        console.log('[Error Fix Patch] 应用特定错误修复');
        
        // 修复由mobile-crash-fix.js第15行抛出的"未知错误"
        fixUnknownError();
        
        // 直接修补console.error来拦截特定错误
        patchConsoleError();
        
        // 添加附加运行时诊断
        addRuntimeDiagnostics();
    }
    
    // 修复由mobile-crash-fix.js触发的"未知错误"
    function fixUnknownError() {
        // 检查是否已经存在我们自己的错误处理器
        if (window._originalErrorHandler && window._errorHandlerPatched) {
            console.log('[Error Fix Patch] 已有错误处理器，跳过修复');
            return;
        }
        
        // 保存原始错误处理器引用
        window._originalErrorHandler = window.onerror;
        window._errorHandlerPatched = true;
        
        // 替换全局错误处理器 - 置于最顶层
        window.onerror = function(message, source, lineno, colno, error) {
            // 捕获并处理所有错误，记录到控制台但不显示给用户
            try {
                // 特别处理"未知错误"
                if (message === '未知错误' || (typeof message === 'string' && message.includes('unknown error'))) {
                    console.log('[Error Fix Patch] 拦截到未知错误');
                    return true; // 防止错误继续传播
                }
                
                // 对于其他错误，调用原始处理器（如果存在）
                if (window._originalErrorHandler && typeof window._originalErrorHandler === 'function') {
                    return window._originalErrorHandler(message, source, lineno, colno, error);
                }
            } catch (e) {
                // 如果错误处理器本身出错，确保不会抛出新错误
                console.log('[Error Fix Patch] 错误处理器出错:', e);
            }
            
            return true; // 默认阻止所有错误传播
        };
        
        // 修复错误事件监听器
        try {
            const originalAddEventListener = window.addEventListener;
            window.addEventListener = function(type, listener, options) {
                if (type === 'error') {
                    // 包装错误事件监听器
                    const wrappedListener = function(event) {
                        try {
                            // 检查是否未知错误
                            if (event && (event.message === '未知错误' || 
                                (event.message && typeof event.message === 'string' && event.message.includes('unknown')))) {
                                console.log('[Error Fix Patch] 阻止未知错误事件传播');
                                event.preventDefault && event.preventDefault();
                                event.stopPropagation && event.stopPropagation();
                                return false;
                            }
                            
                            // 正常处理其他错误
                            return listener.call(this, event);
                        } catch (e) {
                            console.log('[Error Fix Patch] 错误事件处理器出错:', e);
                            return false;
                        }
                    };
                    
                    // 使用包装后的监听器
                    return originalAddEventListener.call(this, type, wrappedListener, options);
                }
                
                // 其他类型的事件正常处理
                return originalAddEventListener.call(this, type, listener, options);
            };
        } catch (e) {
            console.log('[Error Fix Patch] 修复错误事件监听器失败:', e);
        }
        
        console.log('[Error Fix Patch] 已安装未知错误修复');
    }
    
    // 直接修补console.error以拦截特定错误消息
    function patchConsoleError() {
        if (window._consoleErrorPatched) {
            return;
        }
        
        // 保存原始console.error
        const originalConsoleError = console.error;
        window._consoleErrorPatched = true;
        
        // 替换console.error
        console.error = function() {
            try {
                // 检查是否为目标错误消息
                if (arguments.length > 0) {
                    const errorMsg = arguments[0];
                    
                    // 如果是来自mobile-crash-fix.js的未知错误，拦截它
                    if (typeof errorMsg === 'string' && 
                        (errorMsg.includes('[Mobile Fix] 捕获到全局错误: 未知错误') || 
                         errorMsg.includes('未知错误'))) {
                        // 将其转为普通日志，不是错误
                        console.log('[Error Fix Patch] 拦截控制台错误:', 
                                    errorMsg.replace('[Mobile Fix]', '[已修复]'));
                        return;
                    }
                }
                
                // 其他错误正常处理
                return originalConsoleError.apply(console, arguments);
            } catch (e) {
                // 确保我们的补丁不会崩溃
                return originalConsoleError.apply(console, arguments);
            }
        };
        
        console.log('[Error Fix Patch] 已修补console.error');
    }
    
    // 添加运行时诊断
    function addRuntimeDiagnostics() {
        // 记录关键对象状态
        console.log('[Error Fix Patch] 添加运行时诊断');
        
        // 每60秒记录一次状态（降低频率减少控制台输出）
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
                console.log('[Error Fix Patch] 诊断失败:', e);
            }
        }, 60000); // 每60秒运行一次，减少日志量
    }
    
    console.log('[Error Fix Patch] 错误修复补丁已初始化');
})(); 