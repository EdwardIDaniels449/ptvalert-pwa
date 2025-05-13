/**
 * API模式状态显示脚本
 * 在页面加载完成后显示实际使用的API模式
 */

(function() {
    // 等待DOM加载完成
    window.addEventListener('DOMContentLoaded', function() {
        console.log('[API模式显示] 检查API模式状态');
        
        // 获取状态显示元素
        const statusElement = document.getElementById('apiModeStatus');
        if (!statusElement) {
            console.warn('[API模式显示] 找不到状态显示元素');
            return;
        }
        
        // 获取调试输出区域
        const debugOutput = document.getElementById('debugOutput');
        
        // 确定实际的API模式
        const isGitHubPages = window.IS_GITHUB_PAGES === true;
        const useRealApi = window.cloudflareConfig && window.cloudflareConfig.useRealApi === true;
        
        // 显示API模式状态
        if (useRealApi) {
            statusElement.textContent = '已使用真实API';
            statusElement.style.color = 'lime';
            
            // 添加额外信息
            const apiUrlInfo = document.createElement('div');
            apiUrlInfo.textContent = `API: ${window.cloudflareConfig.apiUrl || '未设置'}`;
            debugOutput.appendChild(apiUrlInfo);
            
            const apiKeyInfo = document.createElement('div');
            apiKeyInfo.textContent = `API密钥: ${window.cloudflareConfig.apiKey ? '已设置' : '未设置'}`;
            debugOutput.appendChild(apiKeyInfo);
        } else {
            statusElement.textContent = '模拟响应模式';
            statusElement.style.color = 'orange';
            
            // 添加警告
            const warningInfo = document.createElement('div');
            warningInfo.style.color = 'red';
            warningInfo.textContent = '注意: 所有API请求仅返回模拟数据';
            debugOutput.appendChild(warningInfo);
        }
        
        // 添加GitHub Pages信息
        const githubInfo = document.createElement('div');
        githubInfo.textContent = `GitHub Pages: ${isGitHubPages ? '是' : '否'}`;
        debugOutput.appendChild(githubInfo);
        
        // 添加查看完整诊断信息的提示
        const diagLink = document.createElement('div');
        diagLink.innerHTML = '<a href="#" style="color:skyblue" onclick="showPtvAlertDiagnostics();return false;">查看完整诊断</a>';
        debugOutput.appendChild(diagLink);
        
        // 添加关闭按钮
        const closeBtn = document.createElement('div');
        closeBtn.style.textAlign = 'center';
        closeBtn.style.marginTop = '5px';
        closeBtn.innerHTML = '<a href="#" style="color:skyblue" onclick="document.getElementById(\'debugOutput\').style.display=\'none\';return false;">关闭</a>';
        debugOutput.appendChild(closeBtn);
        
        console.log('[API模式显示] API模式状态已更新:', useRealApi ? '真实API' : '模拟响应');
    });
})(); 