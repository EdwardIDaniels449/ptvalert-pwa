/**
 * PWA manifest修复脚本
 * 确保PWA在移动设备上正确安装和运行
 */

(function() {
    'use strict';
    
    console.log('[Manifest Fix] 初始化PWA manifest修复脚本');
    
    // 在页面加载时执行
    window.addEventListener('load', function() {
        setTimeout(fixManifest, 1000);
    });
    
    // 修复manifest
    function fixManifest() {
        console.log('[Manifest Fix] 开始检查和修复manifest');
        
        // 检查是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            console.log('[Manifest Fix] 检测到移动设备，应用移动设备特定修复');
            
            // 确保所有图标链接正确
            fixIconLinks();
            
            // 监听安装事件
            listenForInstallEvents();
            
            // 对iOS设备进行特殊处理
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                applyiOSFixes();
            }
            
            // 对Android设备进行特殊处理
            if (/Android/.test(navigator.userAgent)) {
                applyAndroidFixes();
            }
        }
    }
    
    // 修复图标链接
    function fixIconLinks() {
        // 检查是否是GitHub Pages环境
        if (window.location.hostname.includes('github.io')) {
            console.log('[Manifest Fix] 检测到GitHub Pages环境，修复图标路径');
            
            // 获取仓库名称
            const pathSegments = window.location.pathname.split('/');
            if (pathSegments.length >= 2 && pathSegments[1]) {
                const repoName = pathSegments[1];
                const basePath = '/' + repoName;
                
                // 检查manifest链接是否需要更新
                const manifestLink = document.querySelector('link[rel="manifest"]');
                if (manifestLink) {
                    const href = manifestLink.getAttribute('href');
                    if (href && href.startsWith('./')) {
                        manifestLink.setAttribute('href', basePath + href.substring(1));
                        console.log('[Manifest Fix] 更新manifest路径:', href, '->', basePath + href.substring(1));
                    }
                }
                
                // 更新图标链接
                document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('./')) {
                        link.setAttribute('href', basePath + href.substring(1));
                        console.log('[Manifest Fix] 更新图标路径:', href, '->', basePath + href.substring(1));
                    }
                });
            }
        }
    }
    
    // 监听PWA安装事件
    function listenForInstallEvents() {
        // 监听beforeinstallprompt事件
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[Manifest Fix] 捕获到beforeinstallprompt事件');
            
            // 阻止Chrome 76+版本自动显示安装提示
            // e.preventDefault();
            
            // 保存事件以供稍后使用
            window.deferredPrompt = e;
            
            // 可选：显示自定义安装按钮
            // showInstallButton();
        });
        
        // 监听appinstalled事件
        window.addEventListener('appinstalled', (evt) => {
            console.log('[Manifest Fix] PWA安装成功');
            
            // 安装成功后清除deferredPrompt
            window.deferredPrompt = null;
            
            // 可选：隐藏安装按钮
            // hideInstallButton();
            
            // 可选：发送安装成功信息到你的分析服务
            // sendAnalytics('PWA Installed');
        });
    }
    
    // 应用iOS特定修复
    function applyiOSFixes() {
        console.log('[Manifest Fix] 应用iOS特定修复');
        
        // 添加iOS特定的meta标签
        ensureMetaTag('apple-mobile-web-app-capable', 'yes');
        ensureMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');
        
        // 确保添加了apple-touch-icon
        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            const link = document.createElement('link');
            link.rel = 'apple-touch-icon';
            link.href = 'images/icon-192x192.png';
            document.head.appendChild(link);
            console.log('[Manifest Fix] 添加了缺失的apple-touch-icon');
        }
        
        // iOS启动画面支持
        addIOSSplashScreenSupport();
    }
    
    // 应用Android特定修复
    function applyAndroidFixes() {
        console.log('[Manifest Fix] 应用Android特定修复');
        
        // 确保有theme-color
        if (!document.querySelector('meta[name="theme-color"]')) {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = '#0071e3';
            document.head.appendChild(meta);
            console.log('[Manifest Fix] 添加了缺失的theme-color meta标签');
        }
    }
    
    // 添加iOS启动画面
    function addIOSSplashScreenSupport() {
        const head = document.head;
        
        // 常见的iOS设备尺寸和方向
        const splashScreens = [
            { width: 1125, height: 2436, ratio: 3 }, // iPhone X/XS
            { width: 828, height: 1792, ratio: 2 },  // iPhone XR
            { width: 1242, height: 2688, ratio: 3 }, // iPhone XS Max
            { width: 750, height: 1334, ratio: 2 },  // iPhone 8, 7, 6
            { width: 1242, height: 2208, ratio: 3 }, // iPhone 8 Plus, 7 Plus, 6 Plus
            { width: 2048, height: 2732, ratio: 2 }  // iPad Pro 12.9"
        ];
        
        // 创建iOS启动画面meta标签
        splashScreens.forEach((screen) => {
            const meta = document.createElement('link');
            meta.rel = 'apple-touch-startup-image';
            meta.href = `images/splash-${screen.width}x${screen.height}.png`;
            meta.media = `(device-width: ${screen.width / screen.ratio}px) and (device-height: ${screen.height / screen.ratio}px) and (-webkit-device-pixel-ratio: ${screen.ratio})`;
            head.appendChild(meta);
        });
    }
    
    // 确保meta标签存在
    function ensureMetaTag(name, content) {
        if (!document.querySelector(`meta[name="${name}"]`)) {
            const meta = document.createElement('meta');
            meta.name = name;
            meta.content = content;
            document.head.appendChild(meta);
            console.log(`[Manifest Fix] 添加了缺失的${name}元标签`);
        }
    }
})(); 