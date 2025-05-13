# PtvAlert 真实通知配置部署指南

本指南将帮助您设置和部署 PtvAlert 应用程序的真实推送通知功能。

## 已完成的配置

我们已经为您更新了以下文件：

1. `config.js` - 更新了 VAPID 公钥
2. `vapid-keys.js` - 创建了包含完整 VAPID 密钥配置的文件
3. `index.html` - 更新了 API 密钥和引入了配置文件
4. `wrangler.toml` - 更新了 Cloudflare Worker 的 VAPID 配置

## 部署步骤

要完成设置过程，请按照以下步骤操作：

### 1. 安装 Wrangler CLI

如果您尚未安装 Wrangler CLI，请运行：

```bash
npm install -g wrangler
```

### 2. 登录到您的 Cloudflare 账户

```bash
wrangler login
```

### 3. 创建必要的 KV 命名空间

```bash
wrangler kv:namespace create SUBSCRIPTIONS
wrangler kv:namespace create MARKERS
wrangler kv:namespace create ADMIN_USERS
wrangler kv:namespace create BANNED_USERS
```

运行上述命令后，您将获得每个命名空间的 ID。请记下这些 ID 值。

### 4. 更新 wrangler.toml

使用上一步中获得的 KV 命名空间 ID 替换 `wrangler.toml` 文件中的占位符：

```toml
[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "YOUR_KV_NAMESPACE_ID" # 替换为实际 ID
preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID" # 替换为实际预览 ID
```

对每个 KV 命名空间部分进行相同的更新。

### 5. 发布 Cloudflare Worker

```bash
wrangler publish
```

### 6. 验证配置

发布 Worker 后，访问以下 URL 验证配置：

```
https://ptvalert.pages.dev/api/test-config
```

如果一切正常，您应该会看到成功的响应。

## 测试推送通知

完成部署后，您可以测试推送通知功能：

1. 访问您的应用网站
2. 允许通知权限（浏览器会提示）
3. 添加新的报告或标记
4. 确认您收到了通知

## 故障排除

如果遇到问题，请检查：

1. Cloudflare Worker 日志中的错误消息
2. 确保所有 KV 命名空间均已正确创建和配置
3. 验证 VAPID 密钥配置是否正确
4. 检查浏览器的通知权限设置

## 安全注意事项

- 您的配置文件中包含敏感信息，请确保不要将其公开或提交到公共代码仓库
- 考虑在生产环境中使用 Cloudflare 的环境变量和密钥管理功能来存储这些敏感值
- 定期轮换 API 密钥以提高安全性

如有任何问题，请参考 Cloudflare Workers 文档或联系支持。 