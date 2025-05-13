/**
 * API诊断工具
 * 用于帮助识别和解决API连接问题的调试脚本
 */

(function() {
    // 等到文档完全加载后运行
    window.addEventListener('DOMContentLoaded', function() {
        console.log('[API诊断] 初始化API诊断工具...');
        
        // 创建诊断UI
        createDiagnosticUI();
        
        // 监听所有API请求
        setupApiMonitoring();
    });
    
    // 创建诊断UI界面
    function createDiagnosticUI() {
        // 创建浮动按钮触发诊断面板
        const diagButton = document.createElement('button');
        diagButton.textContent = 'API诊断';
        diagButton.style.cssText = 'position:fixed;right:10px;top:10px;z-index:10000;background:#007bff;color:white;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;';
        diagButton.onclick = showDiagnosticPanel;
        document.body.appendChild(diagButton);
    }
    
    // 设置API监控
    function setupApiMonitoring() {
        if (!window._apiRequests) {
            window._apiRequests = [];
            window._apiRequestCount = 0;
        }
        
        const cloudflareConfig = window.cloudflareConfig || {};
        const apiUrl = cloudflareConfig.apiUrl || '';
        
        if (apiUrl && !window._monitoringApi) {
            window._monitoringApi = true;
            
            // 保存原始fetch
            const originalFetch = window.fetch;
            
            // 覆盖fetch以监控API请求
            window.fetch = function(url, options = {}) {
                const urlStr = typeof url === 'string' ? url : url.toString();
                
                // 如果是API请求，记录它
                if (urlStr.includes(apiUrl)) {
                    const requestId = ++window._apiRequestCount;
                    const method = options.method || 'GET';
                    
                    const requestInfo = {
                        id: requestId,
                        url: urlStr,
                        method: method,
                        time: new Date().toISOString(),
                        startTime: Date.now(),
                        status: 'pending',
                        endTime: null,
                        duration: null,
                        response: null,
                        error: null
                    };
                    
                    window._apiRequests.push(requestInfo);
                    console.log(`[API诊断] 请求 #${requestId} ${method} ${urlStr}`);
                    
                    // 调用原始fetch并监控结果
                    return originalFetch.apply(this, arguments)
                        .then(response => {
                            requestInfo.endTime = Date.now();
                            requestInfo.duration = requestInfo.endTime - requestInfo.startTime;
                            requestInfo.status = response.ok ? 'success' : 'error';
                            requestInfo.statusCode = response.status;
                            requestInfo.statusText = response.statusText;
                            
                            // 克隆响应，这样我们可以读取它的内容而不影响原始响应
                            return response.clone().text().then(text => {
                                try {
                                    requestInfo.response = text;
                                    console.log(`[API诊断] 请求 #${requestId} 完成: ${response.status} ${response.statusText}`);
                                } catch(e) {
                                    requestInfo.responseError = e.message;
                                }
                                return response;
                            }).catch(e => {
                                requestInfo.responseError = e.message;
                                return response;
                            });
                        })
                        .catch(error => {
                            requestInfo.endTime = Date.now();
                            requestInfo.duration = requestInfo.endTime - requestInfo.startTime;
                            requestInfo.status = 'error';
                            requestInfo.error = error.message || String(error);
                            console.error(`[API诊断] 请求 #${requestId} 失败:`, error);
                            throw error;
                        });
                }
                
                // 非API请求，正常使用fetch
                return originalFetch.apply(this, arguments);
            };
            
            console.log('[API诊断] API监控已启用');
        }
    }
    
    // 显示诊断面板
    function showDiagnosticPanel() {
        // 如果已经存在面板，则移除它
        let existingPanel = document.getElementById('api-diagnostic-panel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        // 创建诊断面板
        const panel = document.createElement('div');
        panel.id = 'api-diagnostic-panel';
        panel.style.cssText = 'position:fixed;top:50px;right:10px;width:90%;max-width:600px;max-height:80vh;overflow:auto;background:white;box-shadow:0 0 10px rgba(0,0,0,0.5);z-index:10001;border-radius:5px;padding:10px;font-family:sans-serif;font-size:14px;';
        
        // 添加标题和关闭按钮
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;">API诊断工具</h3>
                <button id="close-api-panel" style="border:none;background:none;cursor:pointer;font-size:20px;">&times;</button>
            </div>
            <div style="margin-bottom:10px;">
                <button id="test-api-button" style="background:#007bff;color:white;border:none;padding:5px 10px;border-radius:3px;margin-right:10px;">测试API连接</button>
                <button id="clear-api-logs" style="background:#dc3545;color:white;border:none;padding:5px 10px;border-radius:3px;">清除日志</button>
            </div>
            <div id="api-config-info" style="margin-bottom:10px;border:1px solid #ddd;padding:10px;border-radius:3px;"></div>
            <div id="api-test-result" style="margin-bottom:10px;display:none;"></div>
            <div style="margin-bottom:10px;">
                <h4>API请求历史</h4>
                <div id="api-requests-list" style="border:1px solid #ddd;padding:10px;border-radius:3px;max-height:300px;overflow:auto;"></div>
            </div>
            <div style="margin-top:10px;">
                <h4>问题修复</h4>
                <button id="fix-api-url" style="background:#28a745;color:white;border:none;padding:5px 10px;border-radius:3px;margin-right:10px;">修复API URL</button>
                <button id="enable-cors" style="background:#17a2b8;color:white;border:none;padding:5px 10px;border-radius:3px;margin-right:10px;">启用CORS</button>
            </div>
        `;
        document.body.appendChild(panel);
        
        // 绑定事件
        document.getElementById('close-api-panel').onclick = function() {
            panel.remove();
        };
        
        document.getElementById('test-api-button').onclick = testApiConnection;
        document.getElementById('clear-api-logs').onclick = clearApiLogs;
        document.getElementById('fix-api-url').onclick = fixApiUrl;
        document.getElementById('enable-cors').onclick = enableCors;
        
        // 显示API配置信息
        displayApiConfig();
        
        // 显示请求历史
        displayApiRequests();
    }
    
    // 显示API配置信息
    function displayApiConfig() {
        const configInfo = document.getElementById('api-config-info');
        const cloudflareConfig = window.cloudflareConfig || {};
        
        let html = '<h4>当前API配置</h4>';
        html += `<div><strong>API URL:</strong> ${cloudflareConfig.apiUrl || '未设置'}</div>`;
        html += `<div><strong>使用真实API:</strong> ${cloudflareConfig.useRealApi === true ? '是' : '否'}</div>`;
        html += `<div><strong>API密钥:</strong> ${cloudflareConfig.apiKey ? '已设置' : '未设置'}</div>`;
        html += `<div><strong>GitHub Pages环境:</strong> ${window.IS_GITHUB_PAGES === true ? '是' : '否'}</div>`;
        
        configInfo.innerHTML = html;
    }
    
    // 显示API请求历史
    function displayApiRequests() {
        const requestsList = document.getElementById('api-requests-list');
        const requests = window._apiRequests || [];
        
        if (requests.length === 0) {
            requestsList.innerHTML = '<div style="color:#666;text-align:center;">暂无API请求记录</div>';
            return;
        }
        
        let html = '';
        requests.reverse().forEach(req => {
            const status = req.status === 'success' ? 'green' : req.status === 'error' ? 'red' : 'orange';
            
            html += `<div style="margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:8px;">`;
            html += `<div><strong>#${req.id}</strong> <span style="color:${status}">${req.status}</span> - ${req.method} ${req.url.split('/').slice(-2).join('/')}</div>`;
            
            if (req.duration !== null) {
                html += `<div><small>耗时: ${req.duration}ms | 状态码: ${req.statusCode || 'N/A'}</small></div>`;
            }
            
            if (req.error) {
                html += `<div style="color:red;"><small>错误: ${req.error}</small></div>`;
            }
            
            html += `<div><button onclick="showApiDetail(${req.id})" style="font-size:11px;padding:2px 5px;margin-top:3px;">详情</button></div>`;
            html += `</div>`;
        });
        
        requestsList.innerHTML = html;
        
        // 添加全局函数以显示详情
        window.showApiDetail = function(id) {
            const req = window._apiRequests.find(r => r.id === id);
            if (!req) return;
            
            alert(`请求 #${req.id} 详情:\nURL: ${req.url}\n状态: ${req.status}\n响应: ${req.response || '无响应'}\n错误: ${req.error || '无错误'}`);
        };
    }
    
    // 测试API连接
    function testApiConnection() {
        const resultDiv = document.getElementById('api-test-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:#666;">测试API连接中...</div>';
        
        const cloudflareConfig = window.cloudflareConfig || {};
        const apiUrl = cloudflareConfig.apiUrl || cloudflareConfig.apiBaseUrl;
        
        if (!apiUrl) {
            resultDiv.innerHTML = '<div style="color:red;">错误: API URL未设置</div>';
            return;
        }
        
        // 测试基本API端点
        Promise.all([
            testEndpoint(`${apiUrl}/ping`, 'Ping', 'GET'),
            testEndpoint(`${apiUrl}/api/reports`, '报告列表', 'GET'),
            testEndpoint(`${apiUrl}/api/sync-from-firebase`, '同步端点', 'POST', {
                reports: [] // 空数组作为有效载荷
            }),
            testEndpoint(`${apiUrl}/api/send-notification`, '通知端点', 'POST', {
                message: '测试通知消息',
                title: '测试标题',
                icon: '/images/icon-192x192.png'
            })
        ]).then(results => {
            let html = '<h4>API测试结果</h4>';
            
            let allSuccess = true;
            results.forEach(result => {
                const statusColor = result.success ? 'green' : 'red';
                html += `<div>
                    <strong>${result.name}:</strong> 
                    <span style="color:${statusColor}">${result.success ? '成功' : '失败'}</span>
                    ${result.status ? ` (${result.status})` : ''}
                </div>`;
                
                if (!result.success) {
                    html += `<div style="margin-left:10px;color:#666;font-size:12px;">${result.error || ''}</div>`;
                    allSuccess = false;
                }
            });
            
            if (allSuccess) {
                html += '<div style="color:green;margin-top:10px;">✓ 所有API端点测试通过</div>';
            } else {
                html += '<div style="color:red;margin-top:10px;">✗ 部分API端点测试失败</div>';
                html += '<div style="margin-top:5px;">可能的解决方案:</div>';
                html += '<ul style="margin-top:5px;padding-left:20px;">';
                html += '<li>检查Cloudflare Worker是否已部署并运行</li>';
                html += '<li>确认API URL是否正确</li>';
                html += '<li>检查CORS设置是否允许来自此域的请求</li>';
                html += '<li>确认Worker中是否实现了所需的端点</li>';
                html += '</ul>';
            }
            
            resultDiv.innerHTML = html;
        });
    }
    
    // 测试单个端点
    function testEndpoint(url, name, method = 'GET', body = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }
        
        return fetch(url, options)
        .then(response => {
            return {
                name: name,
                success: response.ok,
                status: response.status,
                statusText: response.statusText
            };
        })
        .catch(error => {
            return {
                name: name,
                success: false,
                error: error.message
            };
        });
    }
    
    // 清除API日志
    function clearApiLogs() {
        window._apiRequests = [];
        window._apiRequestCount = 0;
        displayApiRequests();
    }
    
    // 修复API URL
    function fixApiUrl() {
        const newUrl = prompt('请输入新的API URL:', window.cloudflareConfig?.apiUrl || '');
        if (newUrl) {
            window.cloudflareConfig = window.cloudflareConfig || {};
            window.cloudflareConfig.apiUrl = newUrl;
            window.cloudflareConfig.useRealApi = true;
            
            displayApiConfig();
            alert(`API URL已更新为: ${newUrl}`);
            
            // 将更新后的URL保存到localStorage
            try {
                localStorage.setItem('api_url_override', newUrl);
            } catch(e) {
                console.error('无法保存到localStorage:', e);
            }
        }
    }
    
    // 启用CORS
    function enableCors() {
        alert('请在Cloudflare Worker中添加以下CORS头:\n\nAccess-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\nAccess-Control-Allow-Headers: Content-Type, Authorization');
    }
    
    console.log('[API诊断] 诊断工具已加载');
})(); 