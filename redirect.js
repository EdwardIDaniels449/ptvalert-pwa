/**
 * 紧急重定向脚本
 * 处理GitHub Pages上的URL重定向问题
 */

(function() {
    console.log('[重定向] 初始化重定向检查...');
    
    // 检查当前URL是否需要重定向
    const currentURL = window.location.href;
    const hostname = window.location.hostname;
    const pathSegments = window.location.pathname.split('/');
    
    console.log('[重定向] 当前URL:', currentURL);
    console.log('[重定向] 主机名:', hostname);
    console.log('[重定向] 路径段:', pathSegments);
    
    // 如果在GitHub Pages上
    if (hostname.includes('github.io')) {
        console.log('[重定向] 检测到GitHub Pages环境');
        
        // 仓库名称应该是ptvalert-pwa
        const correctRepoName = 'ptvalert-pwa';
        
        // 获取当前路径中的第一个部分(通常是仓库名)
        const currentRepo = pathSegments.length > 1 ? pathSegments[1] : '';
        
        // 如果路径不正确
        if (currentRepo !== correctRepoName && currentRepo !== '') {
            console.log('[重定向] 检测到不正确的仓库名:', currentRepo);
            console.log('[重定向] 应该为:', correctRepoName);
            
            // 构建正确的URL
            const correctURL = window.location.protocol + '//' + 
                               window.location.host + '/' + 
                               correctRepoName + '/';
            
            console.log('[重定向] 将重定向到:', correctURL);
            
            // 执行重定向
            window.location.href = correctURL;
        }
    }
})(); 