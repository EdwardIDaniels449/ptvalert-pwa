# Cloudflare Worker 推送通知设置指南

本指南将帮助您将PtvAlert的推送通知服务迁移到**完全免费**的Cloudflare Worker平台。

## 重要注意事项

1. Cloudflare Workers环境与Node.js不同，**不支持直接导入Node.js模块**（如web-push）。我们已经修改了代码，使其使用原生方法实现推送通知功能，无需依赖外部模块。

2. Cloudflare Workers中的**环境变量只能通过`env`参数访问**，不能作为全局变量直接引用。例如，应该使用`env.VAPID_PUBLIC_KEY`而不是`VAPID_PUBLIC_KEY`。

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
6. 部署后，点击 **编辑代码** 进入编辑器
7. 删除默认代码，然后将 `cloudflare-workers/cloudflare-worker.js` 文件中的所有代码复制粘贴到编辑器中
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

### 在控制面板配置（重要！确保变量名正确）

1. 在Worker详情页，点击 **设置** 标签
2. 找到 **变量** 部分
3. 点击 **环境变量** 按钮
4. 添加两个环境变量（点击"加密"选项以保护敏感数据）:
   - 名称: `VAPID_PUBLIC_KEY`  
     值: `BFpa0WyDaUOEPw7iKaxLHjf1yReNiMXHdSh4t3PBXq962LCjQmpeFKs63PDhwd_F5kPqi7PsI6KGpIoXsaXMJ70`
   - 名称: `VAPID_PRIVATE_KEY`  
     值: `8J0ZKujkR48Rpgu9gIBkym7xsnH9yuZhuhhkw6XZ3fg`
5. 确保变量名称完全匹配，区分大小写
6. 点击 **保存并部署**

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
4. 变量名填写 `SUBSCRIPTIONS`（必须完全匹配，区分大小写）
5. 选择一个已有的KV命名空间或创建新的
6. 点击 **保存并部署**

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

### 常见错误

1. **No such module "web-push"**: 
   - 原因: Cloudflare Workers不支持Node.js模块
   - 解决: 确保使用最新版本的cloudflare-worker.js，它不依赖web-push库

2. **VAPID_PUBLIC_KEY is not defined**:
   - 原因: Worker脚本尝试直接访问全局环境变量
   - 解决: 
     - 确保使用最新版本的cloudflare-worker.js，它通过env参数访问变量
     - 确保在Cloudflare控制面板中正确设置了环境变量（注意大小写）

3. **KV绑定错误**:
   - 原因: 找不到SUBSCRIPTIONS绑定
   - 解决: 
     - 确保正确创建并绑定了SUBSCRIPTIONS命名空间
     - 检查绑定名称是否正确拼写为SUBSCRIPTIONS（区分大小写）

4. **CORS错误**:
   - 原因: 前端无法访问Worker API
   - 解决: 
     - 我们已在代码中添加CORS头，但您可能需要限制为特定域名
     - 如需更改，修改corsHeaders变量中的Origin值

### 验证配置

访问以下URL检查配置是否正确:
```
https://push-notification-service.您的用户名.workers.dev/api/test-config
```

如果一切正常，应该返回:
```json
{
  "success": true,
  "message": "推送通知配置正确",
  "publicKeyConfigured": true
}
```

如果遇到问题，可以查看Cloudflare Worker实时日志:
1. 在Worker详情页点击 **日志**
2. 选择 **开始流式传输** 查看实时日志
3. 测试API时查看错误信息

## 安全注意事项

- 永远不要在公共代码仓库中提交VAPID私钥
- 使用Cloudflare Workers的加密环境变量保护敏感信息
- 周期性检查和轮换密钥以提高安全性 