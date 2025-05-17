/**
 * PWA支持脚本
 * 提供更可靠的Service Worker注册和PWA体验增强
 */

(function() {
    'use strict';
    
    console.log('[PWA Support] 初始化PWA支持...');
    
    // 确保有图标可用 - 创建默认图标目录
    function ensureIcons() {
        // 如果找不到图标，创建简单的画布元素生成图标
        if (!iconExists()) {
            createFallbackIcons();
        }
    }
    
    // 检查图标是否存在
    function iconExists() {
        // 简单检查 - 尝试预加载一个图标来验证它是否存在
        const iconTest = new Image();
        iconTest.src = './images/icon-192x192.png';
        return true; // 假设图标存在，实际应用中应有更严格的检查
    }
    
    // 创建备用图标
    function createFallbackIcons() {
        // 仅做记录，实际情况下应生成简单图标
        console.log('[PWA Support] 将使用默认图标');
    }
    
    // 注册Service Worker
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            // 等待页面加载完成
            window.addEventListener('load', async function() {
                try {
                    console.log('[PWA Support] 开始注册Service Worker...');
                    
                    // 确定Service Worker路径
                    const swPath = getServiceWorkerPath();
                    
                    // 注册Service Worker
                    const registration = await navigator.serviceWorker.register(swPath, {
                        scope: './'
                    });
                    
                    console.log('[PWA Support] Service Worker注册成功:', registration.scope);
                    
                    // 在Safari上，检查注册状态
                    if (isSafari()) {
                        checkSafariRegistration(registration);
                    }
                } catch (error) {
                    console.error('[PWA Support] Service Worker注册失败:', error);
                    
                    // 尝试使用备用Service Worker
                    registerFallbackServiceWorker();
                }
            });
        } else {
            console.log('[PWA Support] 此浏览器不支持Service Worker');
        }
    }
    
    // 获取Service Worker路径
    function getServiceWorkerPath() {
        // 检测是否在GitHub Pages上
        if (window.location.hostname.includes('github.io')) {
            const pathSegments = window.location.pathname.split('/');
            if (pathSegments.length >= 2 && pathSegments[1]) {
                return '/' + pathSegments[1] + '/service-worker.js';
            }
        }
        
        // 默认路径
        return './service-worker.js';
    }
    
    // 检测是否是Safari浏览器
    function isSafari() {
        const ua = navigator.userAgent;
        return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Android');
    }
    
    // 在Safari上检查Service Worker注册状态
    function checkSafariRegistration(registration) {
        // 在Safari上，我们需要额外检查Service Worker是否真正激活
        setTimeout(function() {
            if (registration.active) {
                console.log('[PWA Support] Safari Service Worker已激活');
            } else {
                console.warn('[PWA Support] Safari Service Worker未激活，可能需要https');
                
                // 显示提示
                showSafariPwaPrompt();
            }
        }, 3000);
    }
    
    // 注册备用Service Worker
    async function registerFallbackServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        
        try {
            console.log('[PWA Support] 尝试注册备用Service Worker...');
            
            // 注册备用Service Worker
            const fallbackReg = await navigator.serviceWorker.register('./fallback-service-worker.js', {
                scope: './'
            });
            
            console.log('[PWA Support] 备用Service Worker注册成功:', fallbackReg.scope);
        } catch (error) {
            console.error('[PWA Support] 备用Service Worker注册也失败:', error);
            
            // 使用内联最小Service Worker
            registerInlineServiceWorker();
        }
    }
    
    // 注册内联Service Worker（最后的兜底方案）
    async function registerInlineServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        
        try {
            console.log('[PWA Support] 尝试使用内联Service Worker...');
            
            // 创建简单的内联Service Worker
            const minimalSW = new Blob([`
                // 最小Service Worker
                self.addEventListener('install', event => self.skipWaiting());
                self.addEventListener('activate', event => event.waitUntil(clients.claim()));
                self.addEventListener('fetch', event => {
                    event.respondWith(
                        fetch(event.request).catch(() => new Response('离线模式'))
                    );
                });
                console.log('内联最小Service Worker已激活');
            `], {type: 'application/javascript'});
            
            // 创建URL
            const swURL = URL.createObjectURL(minimalSW);
            
            // 注册内联Service Worker
            const inlineReg = await navigator.serviceWorker.register(swURL, {
                scope: './'
            });
            
            console.log('[PWA Support] 内联Service Worker注册成功');
        } catch (error) {
            console.error('[PWA Support] 所有Service Worker注册方法均失败:', error);
        }
    }
    
    // 显示Safari PWA添加到主屏幕提示
    function showSafariPwaPrompt() {
        // 仅在iOS Safari上显示
        if (!(/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream)) {
            return;
        }
        
        // 检查是否已经作为PWA运行
        if (window.navigator.standalone) {
            return;
        }
        
        // 检查是否已经显示过提示
        if (localStorage.getItem('pwaPromptDismissed')) {
            return;
        }
        
        // 创建提示元素
        const promptEl = document.createElement('div');
        promptEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            width: 80%;
            max-width: 320px;
            font-size: 14px;
            text-align: center;
        `;
        promptEl.innerHTML = `
            <div>添加到主屏幕获得最佳体验</div>
            <div style="margin-top:8px;">点击<span style="margin:0 5px">⎋</span>然后选择"添加到主屏幕"</div>
            <button style="margin-top:10px;background:#0071e3;border:none;color:white;padding:5px 15px;border-radius:5px;">
                知道了
            </button>
        `;
        
        // 添加到文档
        document.body.appendChild(promptEl);
        
        // 添加点击事件
        promptEl.querySelector('button').addEventListener('click', function() {
            document.body.removeChild(promptEl);
            localStorage.setItem('pwaPromptDismissed', 'true');
        });
        
        // 5秒后自动隐藏
        setTimeout(function() {
            if (promptEl.parentNode) {
                promptEl.parentNode.removeChild(promptEl);
            }
        }, 10000);
    }
    
    // 增强PWA体验
    function enhancePwaExperience() {
        // 处理返回操作
        window.addEventListener('popstate', function(event) {
            // 处理返回按钮，防止用户意外退出PWA
            if (window.navigator.standalone) {
                // 如果是PWA模式，可以在这里处理导航
            }
        });
        
        // 应用主题色
        applyThemeColor();
    }
    
    // 应用主题色
    function applyThemeColor() {
        // 检查是否支持theme-color
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            // 已经存在theme-color，无需处理
            return;
        }
        
        // 添加theme-color
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#0071e3'; // 使用蓝色作为默认主题色
        document.head.appendChild(meta);
    }
    
    // 执行主要功能
    function init() {
        ensureIcons();
        registerServiceWorker();
        enhancePwaExperience();
    }
    
    // 初始化
    init();
    
    console.log('[PWA Support] PWA支持初始化完成');
})(); 