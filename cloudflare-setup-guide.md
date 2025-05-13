# Cloudflare Worker 推送通知设置指南

本指南将帮助您将PtvAlert的推送通知服务迁移到**完全免费**的Cloudflare Worker平台。

## 第一步：创建Cloudflare账户

1. 访问 [Cloudflare注册页面](https://dash.cloudflare.com/sign-up)
2. 使用您的电子邮箱完成注册流程
3. 登录到Cloudflare控制面板

## 第二步：创建Worker项目

### 方法一：通过Cloudflare控制面板创建（推荐新手使用）

1. 在Cloudflare控制面板左侧菜单中选择 **Workers & Pages**
2. 点击 **创建应用程序**
3. 选择 **创建Worker**
4. 为Worker命名为 `push-notification-service`
5. 点击 **部署** 创建一个默认Worker
6. 部署后，点击 **修改代码** 进入编辑器
7. 将 `cloudflare-workers/cloudflare-worker.js` 文件中的所有代码复制粘贴到编辑器中
8. 点击 **保存并部署**

### 方法二：使用Wrangler CLI工具（推荐开发人员使用）

1. 安装Node.js（如果尚未安装）
2. 安装Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```
3. 登录Cloudflare账户:
   ```bash
   wrangler login
   ```
4. 进入项目的cloudflare-workers目录:
   ```bash
   cd cloudflare-workers
   ```
5. 创建KV命名空间:
   ```bash
   wrangler kv:namespace create SUBSCRIPTIONS
   ```
6. 复制输出的命名空间ID，并更新wrangler.toml文件中的ID值
7. 部署Worker:
   ```bash
   wrangler publish
   ```

## 第三步：配置VAPID密钥

### 在控制面板配置

1. 在Worker详情页，点击 **设置** 标签
2. 找到 **环境变量** 部分
3. 添加两个加密变量:
   - 名称: `VAPID_PUBLIC_KEY`  
     值: `BFpa0WyDaUOEPw7iKaxLHjf1yReNiMXHdSh4t3PBXq962LCjQmpeFKs63PDhwd_F5kPqi7PsI6KGpIoXsaXMJ70`
   - 名称: `VAPID_PRIVATE_KEY`  
     值: `8J0ZKujkR48Rpgu9gIBkym7xsnH9yuZhuhhkw6XZ3fg`
4. 点击 **保存**

### 使用CLI配置

执行以下命令:
```bash
wrangler secret put VAPID_PUBLIC_KEY
# 提示输入时，粘贴: BFpa0WyDaUOEPw7iKaxLHjf1yReNiMXHdSh4t3PBXq962LCjQmpeFKs63PDhwd_F5kPqi7PsI6KGpIoXsaXMJ70

wrangler secret put VAPID_PRIVATE_KEY
# 提示输入时，粘贴: 8J0ZKujkR48Rpgu9gIBkym7xsnH9yuZhuhhkw6XZ3fg
```

## 第四步：创建KV存储

### 在控制面板创建

1. 在Worker详情页，点击 **设置** 标签
2. 找到 **KV命名空间绑定** 部分
3. 点击 **添加绑定**
4. 变量名填写 `SUBSCRIPTIONS`
5. 选择一个已有的KV命名空间或创建新的
6. 点击 **保存**

## 第五步：更新前端代码

1. 打开 `js/notification-handler.js` 文件
2. 更新 saveSubscription 和 deleteSubscriptionFromServer 函数中的URL，替换为您的Worker URL:
   ```javascript
   // 例如: https://push-notification-service.您的用户名.workers.dev/api/subscribe
   ```

## 第六步：测试推送通知

1. 部署更新后的前端代码
2. 使用 `cloudflare-notify.html` 页面发送测试通知
3. 确保在URL字段中输入您的Worker URL

## 故障排除

如果遇到问题，可以检查:

1. Worker日志: Cloudflare控制面板中的实时日志
2. 控制台错误: 浏览器开发者工具中的控制台错误
3. 环境变量: 确认VAPID密钥已正确设置
4. CORS配置: 如果遇到跨域问题，添加适当的CORS头部

## 安全注意事项

- 永远不要在公共代码仓库中提交VAPID私钥
- 使用Cloudflare Workers的加密环境变量保护敏感信息
- 周期性检查和轮换密钥以提高安全性 