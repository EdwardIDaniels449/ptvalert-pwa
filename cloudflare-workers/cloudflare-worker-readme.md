# Cloudflare Worker推送通知服务

本项目提供地图标记的推送通知服务，基于Cloudflare Worker免费方案实现。

## 优势

- **完全免费**：Cloudflare Worker提供慷慨的免费套餐
- **全球边缘网络**：低延迟，全球分布
- **简单部署**：一键部署到Cloudflare
- **无需服务器**：无需维护服务器

## 设置步骤

### 1. 创建Cloudflare账户
- 访问 https://dash.cloudflare.com/sign-up
- 注册一个免费账户

### 2. 安装Wrangler CLI工具
```bash
npm install -g wrangler
wrangler login
```

### 3. 创建KV命名空间
```bash
wrangler kv:namespace create SUBSCRIPTIONS
```
复制输出的命名空间ID，并更新`wrangler.toml`文件中的ID值。

### 4. 配置VAPID密钥
```bash
wrangler secret put VAPID_PUBLIC_KEY
# 在提示处输入: BFpa0WyDaUOEPw7iKaxLHjf1yReNiMXHdSh4t3PBXq962LCjQmpeFKs63PDhwd_F5kPqi7PsI6KGpIoXsaXMJ70

wrangler secret put VAPID_PRIVATE_KEY
# 在提示处输入: 8J0ZKujkR48Rpgu9gIBkym7xsnH9yuZhuhhkw6XZ3fg
```

### 5. 部署Worker
```bash
wrangler publish
```

### 6. 使用Worker
部署完成后，您会得到一个`.workers.dev`的URL。您需要更新前端代码中的API端点：

**订阅API**: `https://your-worker.workers.dev/api/subscribe`
**发送通知API**: `https://your-worker.workers.dev/api/send-notification`
**测试配置API**: `https://your-worker.workers.dev/api/test-config`

## 前端代码调整

您需要更新`notification-handler.js`文件中的saveSubscription函数，将订阅发送到您的Worker:

```javascript
function saveSubscription(subscription) {
  const subscriptionJson = subscription.toJSON();
  
  // 获取当前用户信息（如果已登录）
  const userId = getCurrentUserId();
  
  // 发送到Cloudflare Worker
  fetch('https://your-worker.workers.dev/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      subscription: subscriptionJson
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('保存订阅失败');
    }
    console.log('订阅已保存');
  })
  .catch(error => {
    console.error('保存订阅失败:', error);
  });
}
```

## 安全注意事项

- 请勿在公共代码库中存储VAPID私钥
- 使用Cloudflare Worker的secret功能保护私钥
- 如需更改联系邮箱，请编辑`cloudflare-worker.js`文件中的邮箱地址 