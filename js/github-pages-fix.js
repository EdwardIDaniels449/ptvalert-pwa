/**
 * GitHub Pages 环境修复
 * 处理GitHub Pages特殊环境下的路径和API问题
 */

(function() {
    console.log('[GitHub Pages修复] 初始化...');
    
    // 检测当前环境
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // 如果不是GitHub Pages环境，则不需要应用修复
    if (!isGitHubPages) {
        console.log('[GitHub Pages修复] 不在GitHub Pages环境中，跳过修复');
        return;
    }
    
    console.log('[GitHub Pages修复] 检测到GitHub Pages环境，开始应用修复...');
    
    // 获取仓库名称
    function getRepositoryName() {
        const pathSegments = window.location.pathname.split('/');
        if (pathSegments.length >= 2 && pathSegments[1]) {
            return pathSegments[1];
        }
        return '';
    }
    
    const repoName = getRepositoryName();
    if (!repoName) {
        console.warn('[GitHub Pages修复] 无法检测到仓库名称，可能导致修复不完全');
    } else {
        console.log('[GitHub Pages修复] 检测到仓库名称:', repoName);
    }
    
    // 设置基础路径
    const basePath = repoName ? '/' + repoName + '/' : '/';
    console.log('[GitHub Pages修复] 设置基础路径:', basePath);
    
    // 设置全局变量供其他脚本使用
    window.GITHUB_PAGES_BASE_PATH = basePath;
    window.IS_GITHUB_PAGES = true;
    
    // 设置API基础URL
    window.API_BASE_URL = 'https://' + window.location.hostname + basePath;
    console.log('[GitHub Pages修复] 设置API基础URL:', window.API_BASE_URL);
    
    // 修复Service Worker注册
    if ('serviceWorker' in navigator) {
        console.log('[GitHub Pages修复] 修复Service Worker注册...');
        
        // 保存原始注册方法
        const originalRegister = navigator.serviceWorker.register;
        
        // 修补注册方法
        navigator.serviceWorker.register = function(scriptURL, options = {}) {
            // 诊断信息
            console.log('[GitHub Pages修复] 拦截Service Worker注册:', scriptURL);
            
            // 简单使用当前目录的service-worker.js和相对路径作用域
            const newScriptURL = './service-worker.js';
            const newOptions = {
                scope: './'
            };
            
            console.log('[GitHub Pages修复] 使用简单相对路径:', newScriptURL);
            console.log('[GitHub Pages修复] 使用相对作用域:', newOptions.scope);
            
            // 显示诊断信息
            const diagnosticInfo = {
                original: {
                    scriptURL: scriptURL,
                    options: options
                },
                modified: {
                    scriptURL: newScriptURL,
                    options: newOptions
                },
                environment: {
                    hostname: window.location.hostname,
                    pathname: window.location.pathname,
                    repoName: repoName,
                    basePath: basePath
                }
            };
            console.log('[GitHub Pages修复] Service Worker注册诊断:', diagnosticInfo);
            
            // 创建一个带回退机制的注册函数
            const registerWithFallback = async function() {
                try {
                    // 尝试注册主Service Worker
                    console.log('[GitHub Pages修复] 尝试注册主Service Worker...');
                    const registration = await originalRegister.call(navigator.serviceWorker, newScriptURL, newOptions);
                    console.log('[GitHub Pages修复] Service Worker注册成功:', registration.scope);
                    return registration;
                } catch (mainError) {
                    console.error('[GitHub Pages修复] 主Service Worker注册失败，尝试备用方案:', mainError);
                    
                    try {
                        // 尝试备用Service Worker
                        console.log('[GitHub Pages修复] 尝试注册备用Service Worker...');
                        const fallbackReg = await originalRegister.call(
                            navigator.serviceWorker, 
                            './fallback-service-worker.js', 
                            {scope: './'}
                        );
                        console.log('[GitHub Pages修复] 备用Service Worker注册成功:', fallbackReg.scope);
                        return fallbackReg;
                    } catch (fallbackError) {
                        console.error('[GitHub Pages修复] 备用Service Worker注册也失败:', fallbackError);
                        
                        try {
                            // 创建内联Service Worker
                            console.log('[GitHub Pages修复] 尝试创建内联Service Worker...');
                            const minimalSW = `
                                // 内联最小Service Worker
                                self.addEventListener('install', event => {
                                    console.log('[内联SW] 安装');
                                    self.skipWaiting();
                                });
                                
                                self.addEventListener('activate', event => {
                                    console.log('[内联SW] 激活');
                                    event.waitUntil(clients.claim());
                                });
                                
                                self.addEventListener('fetch', event => {
                                    console.log('[内联SW] 收到请求:', event.request.url);
                                    event.respondWith(fetch(event.request));
                                });
                                
                                self.addEventListener('push', event => {
                                    console.log('[内联SW] 收到推送');
                                    const title = 'PtvAlert';
                                    const options = { 
                                        body: '收到新的通知',
                                        icon: './images/icon-192x192.png'
                                    };
                                    event.waitUntil(self.registration.showNotification(title, options));
                                });
                                
                                self.addEventListener('notificationclick', event => {
                                    console.log('[内联SW] 通知点击');
                                    event.notification.close();
                                    const url = self.location.origin;
                                    event.waitUntil(clients.openWindow(url));
                                });
                                
                                console.log('[内联SW] 内联Service Worker加载完成');
                            `;
                            
                            const blob = new Blob([minimalSW], {type: 'application/javascript'});
                            const blobURL = URL.createObjectURL(blob);
                            
                            const inlineReg = await originalRegister.call(
                                navigator.serviceWorker, 
                                blobURL, 
                                {scope: './'}
                            );
                            console.log('[GitHub Pages修复] 内联Service Worker注册成功:', inlineReg.scope);
                            return inlineReg;
                        } catch (inlineError) {
                            console.error('[GitHub Pages修复] 所有Service Worker注册方法都失败:', inlineError);
                            
                            // 返回一个伪注册对象，以防止应用崩溃
                            console.log('[GitHub Pages修复] 创建伪Service Worker对象...');
                            return {
                                scope: './',
                                active: {
                                    state: 'activated',
                                    scriptURL: newScriptURL
                                },
                                installing: null,
                                waiting: null,
                                pushManager: {
                                    getSubscription: () => Promise.resolve(null),
                                    subscribe: () => Promise.resolve({
                                        endpoint: 'https://fake-push-endpoint.github.io',
                                        toJSON: () => ({ endpoint: 'https://fake-push-endpoint.github.io' })
                                    })
                                },
                                unregister: () => Promise.resolve(true),
                                update: () => Promise.resolve(this),
                                getNotifications: () => Promise.resolve([]),
                                showNotification: (title, options) => {
                                    console.log('[GitHub Pages修复] 伪Service Worker显示通知:', title);
                                    return Promise.resolve();
                                },
                                __fake: true
                            };
                        }
                    }
                }
            };
            
            // 返回带回退的注册Promise
            return registerWithFallback();
        };
    }
    
    // 修复fetch请求，拦截对service-worker.js的404请求
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function(resource, options) {
            const url = resource.url || resource.toString();
            
            // 检查是否是Service Worker请求
            if (url.includes('service-worker.js') && !url.includes('?')) {
                console.log('[GitHub Pages修复] 拦截对Service Worker的fetch请求:', url);
                
                // 计算正确的URL
                const correctUrl = basePath + 'service-worker.js';
                if (url !== correctUrl) {
                    console.log('[GitHub Pages修复] 修复Service Worker URL:', url, '->', correctUrl);
                    resource = correctUrl;
                }
            }
            
            return originalFetch.call(this, resource, options)
                .catch(error => {
                    // 如果是网络错误，并且是service-worker.js请求
                    if (url.includes('service-worker.js')) {
                        console.warn('[GitHub Pages修复] Service Worker获取失败，尝试使用最小替代:', error);
                        
                        // 返回一个最小的Service Worker脚本
                        const minimalSW = `
                            // 最小Service Worker - 由GitHub Pages修复脚本生成
                            self.addEventListener('install', event => {
                                console.log('[最小SW] 安装');
                                self.skipWaiting();
                            });
                            
                            self.addEventListener('activate', event => {
                                console.log('[最小SW] 激活');
                                event.waitUntil(clients.claim());
                            });
                            
                            self.addEventListener('fetch', event => {
                                // 简单的fetch处理
                                event.respondWith(fetch(event.request));
                            });
                            
                            console.log('[最小SW] 已加载 - 来自GitHub Pages修复脚本');
                        `;
                        
                        // 创建响应对象
                        return new Response(minimalSW, {
                            status: 200,
                            statusText: 'OK (Minimal SW)',
                            headers: {
                                'Content-Type': 'application/javascript',
                                'X-Generated-By': 'GitHub-Pages-Fix'
                            }
                        });
                    }
                    
                    // 对于其他请求，继续传播错误
                    throw error;
                });
        };
    }
    
    // 添加诊断功能
    window.runGitHubPagesDiagnostics = function() {
        console.log('===== GitHub Pages 环境诊断 =====');
        console.log('是否GitHub Pages环境:', isGitHubPages);
        console.log('仓库名称:', repoName);
        console.log('基础路径:', basePath);
        console.log('当前URL:', window.location.href);
        console.log('主机名:', window.location.hostname);
        console.log('路径名:', window.location.pathname);
        console.log('API基础URL:', window.API_BASE_URL);
        
        // 检查Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations()
                .then(registrations => {
                    console.log('已注册的Service Worker数量:', registrations.length);
                    registrations.forEach((reg, index) => {
                        console.log(`Service Worker #${index+1}:`);
                        console.log('- 作用域:', reg.scope);
                        console.log('- 更新状态:', reg.updateViaCache);
                        console.log('- 激活状态:', reg.active ? 'active' : 'inactive');
                        if (reg.active) {
                            console.log('- 脚本URL:', reg.active.scriptURL);
                        }
                        console.log('- 是否伪造:', reg.__fake ? 'yes' : 'no');
                    });
                })
                .catch(error => {
                    console.error('获取Service Worker注册信息失败:', error);
                });
        } else {
            console.log('此浏览器不支持Service Worker');
        }
        
        // 检查加载的脚本
        const scripts = document.querySelectorAll('script');
        console.log('页面加载的脚本数量:', scripts.length);
        scripts.forEach((script, index) => {
            console.log(`脚本 #${index+1}:`, script.src || '(内联脚本)');
        });
        
        // 检查manifest
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            console.log('Manifest URL:', manifestLink.href);
            
            // 获取manifest内容
            fetch(manifestLink.href)
                .then(response => response.json())
                .then(manifest => {
                    console.log('Manifest内容:', manifest);
                })
                .catch(error => {
                    console.error('获取Manifest失败:', error);
                });
        } else {
            console.log('未找到manifest链接');
        }
        
        console.log('===== 诊断结束 =====');
    };
    
    // 添加页面载入诊断
    window.addEventListener('load', function() {
        // 延迟5秒，确保所有资源加载完成
        setTimeout(function() {
            console.log('[GitHub Pages修复] 页面加载完成，执行诊断...');
            window.runGitHubPagesDiagnostics();
        }, 5000);
    });
    
    console.log('[GitHub Pages修复] 初始化完成');
})(); 