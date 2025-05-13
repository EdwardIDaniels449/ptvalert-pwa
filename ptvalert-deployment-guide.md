# PtvAlert 部署和维护指南

本文档提供了 PtvAlert 应用的完整部署和维护指南，包括 Cloudflare Worker API 后端和前端 Web 应用。

## 系统架构

PtvAlert 使用以下架构：

1. **前端应用** - 纯静态 HTML/JS/CSS 应用，可以部署在任何静态托管服务上
2. **Cloudflare Worker API** - 无服务器后端，处理数据存储和推送通知
3. **KV 存储** - Cloudflare KV 命名空间，作为数据库使用
4. **推送通知服务** - 使用 Web Push API 和 VAPID 协议

## Cloudflare Worker 配置

### 已部署的 Worker

Worker 已成功部署到以下 URL：
```
https://ptvalert.qingyangzhou85.workers.dev
```

可以通过以下端点测试 API 连接：
```
https://ptvalert.qingyangzhou85.workers.dev/ping
https://ptvalert.qingyangzhou85.workers.dev/version
https://ptvalert.qingyangzhou85.workers.dev/api/reports
```

### KV 命名空间

Worker 使用以下 KV 命名空间：

| 名称 | ID | 用途 |
|------|----|----|
| REPORTS | 813b223b2bd24ca4a50655c37d62e964 | 存储事件报告 |
| SUBSCRIPTIONS | 3e834580823b431f93239c9092cc062d | 存储推送通知订阅 |
| MARKERS | f0687e4580d64df484752257469e7742 | 存储地图标记 |
| ADMIN_USERS | 90d07da1d69a4c0cbdfeec29e0db07a1 | 存储管理员用户 |
| BANNED_USERS | e6ca3f9fb8264b078fc172106a4638b5 | 存储被禁用户 |

## 前端配置

### 关键配置文件

1. **cloudflare-config.js** - 定义 API 配置
2. **fix-api-mode.js** - 确保使用真实 API 而非模拟响应
3. **api-diagnostics.js** - API 连接诊断工具

### 推送通知配置

VAPID 密钥已配置在 `cloudflare-config.js` 中：

```javascript
vapidPublicKey: 'BIi0aWM8sQdsY8SIriYSG551h2HAezVghr6sudVRqEQeQu-6tILY6pbuytfDshoO7As3128FE791I0boTeNQD-8'
```

私钥已配置在 Cloudflare Worker 环境变量中。

## 维护指南

### 更新 Worker 代码

如需更新 Worker 代码，请按照以下步骤操作：

1. 编辑 `worker.js` 文件
2. 使用 Wrangler 发布更新：

```bash
npx wrangler publish
```

### 查看 Worker 日志

要查看 Worker 的运行日志，可以使用：

```bash
npx wrangler tail
```

### 前端更新

前端应用更新后，确保以下设置保持正确：

1. `cloudflare-config.js` 中的 API URL 和 VAPID 公钥
2. `index.html` 中引入的脚本顺序（确保 cloudflare-config.js 在 fix-api-mode.js 之前加载）

### 故障排除

如果遇到 API 连接问题，请检查：

1. 使用浏览器开发工具检查网络请求
2. If(API请求失败):
    a. 使用 `/ping` 和 `/version` 端点测试 API 可用性
    b. 检查 `fix-api-mode.js` 中的日志输出
    c. 使用 `api-diagnostics.js` 工具进行更深入的诊断

#### 已知问题及解决方案

1. **Response body is already used 错误**

   如果在 `/api/sync-from-firebase` 端点测试中遇到以下错误：
   ```
   TypeError: Failed to execute 'clone' on 'Response': Response body is already used
   ```
   
   这是因为 Worker 代码中尝试多次读取请求体。解决方案是在读取请求体之前克隆请求：
   
   ```javascript
   // 创建请求的副本，以防止原始请求体已被使用
   let requestClone = request.clone();
   const data = await requestClone.json();
   ```
   
   同时，确保前端测试工具使用 POST 请求并提供有效的 JSON 格式数据：
   
   ```javascript
   fetch(`${apiUrl}/api/sync-from-firebase`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ reports: [] })
   })
   ```

2. **CORS 问题**

   如果遇到跨域资源共享 (CORS) 错误，确保 Worker 中包含了正确的 CORS 头部：
   
   ```javascript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type, Authorization',
     'Access-Control-Max-Age': '86400',
   };
   ```

## 扩展与优化

### 扩展 KV 存储

如果数据量增长，可能需要实施分页或索引策略：

```javascript
// 分页示例
async function handleGetReports(request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;
  
  // 实现分页逻辑
}
```

### 性能优化

1. 使用 Cloudflare 缓存提高性能
2. 考虑实现客户端数据缓存
3. 使用 Service Worker 提供离线支持

## 安全注意事项

1. 定期更新 VAPID 密钥
2. 考虑实现额外的 API 认证
3. 监控滥用情况并更新封禁用户列表

## 联系与支持

如有任何问题，请联系项目维护者。 