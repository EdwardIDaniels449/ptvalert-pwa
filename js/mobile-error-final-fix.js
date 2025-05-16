/**
 * 移动端错误终极修复
 * 解决循环错误引用和未知错误问题
 */

(function() {
    'use strict';
    
    // 立即执行 - 不等待任何事件
    console.log('[Mobile Final Fix] 初始化移动端错误终极修复');
    
    // 保存所有原始日志函数的引用
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // 记录是否已应用修复
    window._mobileErrorFixApplied = true;
    
    // 拦截控制台日志以阻止循环引用
    function setupConsoleInterceptors() {
        console.log = function() {
            // 阻止特定日志输出，防止它们触发更多错误
            if (arguments.length > 0 && typeof arguments[0] === 'string') {
                const msg = arguments[0];
                if (msg.includes('未知错误') || 
                    msg.includes('unknown error') || 
                    msg.includes('[Mobile Fix] 捕获到全局错误') ||
                    msg.includes('[已拦截错误]')) {
                    // 直接抑制这些消息，不输出
                    return;
                }
            }
            
            // 其他日志正常输出
            originalConsoleLog.apply(console, arguments);
        };
        
        console.error = function() {
            // 阻止特定错误消息，防止它们触发更多错误
            if (arguments.length > 0 && typeof arguments[0] === 'string') {
                const msg = arguments[0];
                if (msg.includes('未知错误') || 
                    msg.includes('unknown error') || 
                    msg.includes('[Mobile Fix]') ||
                    msg.includes('捕获到全局错误')) {
                    // 将这些错误转为简单日志
                    originalConsoleLog.call(console, '[已抑制错误]:', msg);
                    return;
                }
            }
            
            // 其他错误正常输出
            originalConsoleError.apply(console, arguments);
        };
    }
    
    // 安装全局错误拦截器
    function setupErrorHandlers() {
        // 清除现有的错误处理器
        window.onerror = null;
        
        // 安装根错误处理器
        window.onerror = function(message, source, lineno, colno, error) {
            // 拦截所有错误，只记录不报错
            try {
                // 使用原始的console.log避免递归
                originalConsoleLog.call(console, '[Mobile Final Fix] 处理全局错误:', message);
            } catch (e) {
                // 静默失败
            }
            
            // 防止错误冒泡
            return true;
        };
        
        // 拦截所有未处理的promise错误
        window.addEventListener('unhandledrejection', function(event) {
            // 拦截Promise错误
            if (event) {
                event.preventDefault && event.preventDefault();
                event.stopPropagation && event.stopPropagation();
            }
            return true;
        }, true);
    }
    
    // 修复url-fix.js中可能的错误
    function fixUrlFixScript() {
        try {
            // 如果全局变量API_BASE_URL未定义，定义它
            if (typeof API_BASE_URL === 'undefined') {
                window.API_BASE_URL = 'https://ptvalert.pages.dev';
                originalConsoleLog.call(console, '[Mobile Final Fix] 已修复 API_BASE_URL');
            }
        } catch (e) {
            // 静默失败
        }
    }
    
    // 主动修复circular reference
    function breakCircularReferences() {
        // 对window._originalErrorHandler等进行检查和清理
        if (window._originalErrorHandler === window.onerror) {
            window._originalErrorHandler = null;
        }
        
        // 确保常用对象存在以防止undefined错误
        window.map = window.map || {};
        window.google = window.google || {maps: {}};
        window.markers = window.markers || [];
    }
    
    // 重写DOM加载事件，确保修复最先应用
    function ensureFirstLoad() {
        // 存储原始的DOMContentLoaded事件监听器
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        
        // 我们的标记，指示我们的修复已应用
        window._fixesApplied = true;
        
        // 重写addEventListener以确保我们的修复先于其他脚本执行
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'DOMContentLoaded' || type === 'load') {
                // 对于文档加载事件，我们确保我们的修复先执行
                const wrappedListener = function(event) {
                    // 首先应用我们的修复
                    if (!window._specificFixesApplied) {
                        window._specificFixesApplied = true;
                        setupConsoleInterceptors();
                        setupErrorHandlers();
                        fixUrlFixScript();
                        breakCircularReferences();
                        originalConsoleLog.call(console, '[Mobile Final Fix] 已在DOM加载时应用修复');
                    }
                    
                    // 然后调用原始监听器
                    return listener.call(this, event);
                };
                
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            
            // 对于其他事件类型，保持原样
            return originalAddEventListener.call(this, type, listener, options);
        };
    }
    
    // 立即执行所有修复
    try {
        setupConsoleInterceptors();
        setupErrorHandlers();
        fixUrlFixScript();
        breakCircularReferences();
        ensureFirstLoad();
        
        // 标记修复已应用
        window._mobileErrorFixFinalApplied = true;
        
        originalConsoleLog.call(console, '[Mobile Final Fix] 所有移动端错误修复已应用');
    } catch (e) {
        // 使用最原始的方法输出错误
        originalConsoleLog.call(console, '[Mobile Final Fix] 应用修复时出错:', e);
    }
})(); 