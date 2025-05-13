/**
 * 全面彻底修复API模式脚本
 * 此脚本会覆盖和更新所有与API调用相关的设置
 * 确保在GitHub Pages环境下强制使用真实API而非模拟响应
 */

(function() {
    console.log('[全面修复] 启动全面API修复程序...');
    
    // 1. 强制设置环境标志
    window.IS_GITHUB_PAGES = false;
    console.log('[全面修复] 强制设置 IS_GITHUB_PAGES = false');
    
    // 2. 确保有正确的Cloudflare配置
    const requiredCloudflareConfig = {
        apiUrl: 'https://ptvalert.qingyangzhou85.workers.dev',
        dataEndpoint: '/api/reports',
        syncEndpoint: '/api/sync-from-firebase',
        notificationEndpoint: '/api/send-notification',
        apiKey: '51DZw4un3KKP91kKGEhSMRlv4rT9563sjSHiLuHZc2fi1TxkfwFXH52ZVVhOTzwv5jcJPfFabquIS49Et0ucJXixEr7RJV9dQ65nQNe1mt79wOyxHR8DoHFjFS0CRZoO4q2fw3x1A1FdwPtwbfmkuhYa0okUTSxVk4aMTu4hVjnNYv5y1W4e9fwwsjPLgli3MOzNQ1VkgB8lRleb5dOYpAGGW2TcnTGa9ruR5dzIzjw6JsjA2UPd2rvy1rLAqqHm',
        useRealApi: true
    };
    
    // 如果已经定义了cloudflareConfig，更新它
    if (window.cloudflareConfig) {
        console.log('[全面修复] 更新现有的cloudflareConfig');
        
        // 保留现有值，但确保useRealApi被设置为true
        Object.keys(requiredCloudflareConfig).forEach(key => {
            if (key === 'useRealApi') {
                window.cloudflareConfig[key] = true;
            } else if (!window.cloudflareConfig[key]) {
                window.cloudflareConfig[key] = requiredCloudflareConfig[key];
            }
        });
    } else {
        // 如果没有定义，创建一个新的
        console.log('[全面修复] 创建新的cloudflareConfig');
        window.cloudflareConfig = requiredCloudflareConfig;
    }
    
    console.log('[全面修复] cloudflareConfig已设置:', {
        apiUrl: window.cloudflareConfig.apiUrl,
        useRealApi: window.cloudflareConfig.useRealApi,
        apiKey: window.cloudflareConfig.apiKey ? '已设置' : '未设置'
    });
    
    // 3. 恢复原始fetch函数（如果它被替换）
    if (window.originalFetch && typeof window.originalFetch === 'function') {
        console.log('[全面修复] 恢复原始fetch函数');
        window.fetch = window.originalFetch;
    }
    
    // 4. 创建一个防止后续脚本修改这些值的保护
    const setupPropertyProtection = function() {
        console.log('[全面修复] 设置属性保护');
        
        // 保护IS_GITHUB_PAGES
        let _isGithubPages = false;
        try {
            Object.defineProperty(window, 'IS_GITHUB_PAGES', {
                get: function() { return _isGithubPages; },
                set: function(value) {
                    console.log('[全面修复] 阻止修改IS_GITHUB_PAGES为:', value);
                    _isGithubPages = false;
                    return false;
                },
                configurable: false
            });
        } catch(e) {
            console.log('[全面修复] 无法保护IS_GITHUB_PAGES:', e);
        }
        
        // 保护cloudflareConfig.useRealApi
        try {
            let _useRealApi = true;
            Object.defineProperty(window.cloudflareConfig, 'useRealApi', {
                get: function() { return _useRealApi; },
                set: function(value) {
                    console.log('[全面修复] 阻止修改useRealApi为:', value);
                    _useRealApi = true;
                    return true;
                },
                configurable: false
            });
        } catch(e) {
            console.log('[全面修复] 无法保护cloudflareConfig.useRealApi:', e);
        }
    };
    
    // 立即设置属性保护
    setupPropertyProtection();
    
    // 5. 监听DOMContentLoaded事件，在页面加载完成后再次应用修复
    window.addEventListener('DOMContentLoaded', function() {
        console.log('[全面修复] 页面加载完成，再次应用修复');
        
        // 再次确保设置
        window.IS_GITHUB_PAGES = false;
        window.cloudflareConfig.useRealApi = true;
        
        // 在控制台中输出诊断信息
        console.log('[全面修复] 修复后配置:');
        console.log('- IS_GITHUB_PAGES =', window.IS_GITHUB_PAGES);
        console.log('- cloudflareConfig.useRealApi =', window.cloudflareConfig.useRealApi);
        console.log('- cloudflareConfig.apiUrl =', window.cloudflareConfig.apiUrl);
        
        // 如果在页面中找到调试输出区域，也在那里显示一条消息
        let debugArea = document.getElementById('debugOutput');
        if (debugArea) {
            debugArea.innerHTML += '<div style="color:green">全面API修复已应用</div>';
        }
    });
    
    console.log('[全面修复] 修复程序初始化完成');
})(); 