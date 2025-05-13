# Cloudflare Worker 推送通知和数据存储设置指南

本指南将帮助您将PtvAlert的推送通知服务和数据存储从Firebase完全迁移到**免费**的Cloudflare Worker平台。

## 重要注意事项

1. Cloudflare Workers环境与Node.js不同，**不支持直接导入Node.js模块**（如web-push）。
2. Cloudflare Workers中的**环境变量只能通过`env`参数访问**，不能作为全局变量直接引用。
3. 本实现使用Cloudflare **KV命名空间**替代Firebase数据库功能，存储订阅信息和地图标记数据。

## 第一步：创建Cloudflare账户

1. 访问 [Cloudflare注册页面](https://dash.cloudflare.com/sign-up)
2. 使用您的电子邮箱完成注册流程
3. 登录到Cloudflare控制面板

## 第二步：创建Worker项目

1. 在Cloudflare控制面板左侧菜单中选择 **Workers & Pages**
2. 点击 **创建应用程序**
3. 选择 **创建Worker**
4. 为Worker命名为 `push-notification-service`
5. 点击 **部署** 创建一个默认Worker
6. 部署后，点击 **编辑代码** 进入编辑器
7. 删除默认代码，然后将 `cloudflare-workers/cloudflare-worker-updated.js` 文件中的所有代码复制粘贴到编辑器中
8. 点击 **保存并部署**

## 第三步：创建KV命名空间

需要创建三个KV命名空间用于存储数据：

1. 在Cloudflare控制面板左侧菜单中选择 **Workers & Pages**
2. 点击 **KV**
3. 创建三个KV命名空间：
   - **SUBSCRIPTIONS**: 存储推送订阅信息
   - **MARKERS**: 存储地图标记数据
   - **ADMIN_USERS**: 存储管理员用户信息
4. 记下每个命名空间的ID，稍后会用到

## 第四步：绑定KV命名空间到Worker

1. 进入您创建的Worker详情页面
2. 点击 **设置** -> **变量**
3. 在 **KV 命名空间绑定** 部分，点击 **添加绑定**
4. 添加以下三个绑定：
   - 变量名: `SUBSCRIPTIONS`，选择对应的KV命名空间
   - 变量名: `MARKERS`，选择对应的KV命名空间
   - 变量名: `ADMIN_USERS`，选择对应的KV命名空间
5. 点击 **保存并部署**

## 第五步：设置VAPID密钥

1. 转到Worker的 **设置** -> **变量**
2. 在 **环境变量** 部分，点击 **添加变量**
3. 添加两个环境变量：
   - `VAPID_PUBLIC_KEY`: 您的VAPID公钥
   - `VAPID_PRIVATE_KEY`: 您的VAPID私钥
4. 点击 **保存并部署**

如果您需要生成新的VAPID密钥对，可以使用以下在线工具：
[https://tools.reactpwa.com/vapid](https://tools.reactpwa.com/vapid)

## 第六步：设置定时触发器

如果您希望定期检查新标记并发送通知，可以设置定时触发器：

1. 在Worker详情页面，点击 **触发器**
2. 点击 **添加触发器** -> **Cron**
3. 设置一个Cron表达式，如 `0 */12 * * *`（每12小时运行一次）
4. 点击 **添加触发器**

## 第七步：更新前端代码

1. 确保在前端代码中使用正确的Worker URL进行API调用
2. 标记数据API端点：
   - 获取所有标记: `https://push-notification-service.xxx.workers.dev/api/markers`
   - 添加标记: `https://push-notification-service.xxx.workers.dev/api/markers` (POST)
   - 获取单个标记: `https://push-notification-service.xxx.workers.dev/api/markers/{id}` (GET)
   - 更新标记: `https://push-notification-service.xxx.workers.dev/api/markers/{id}` (PUT)
   - 删除标记: `https://push-notification-service.xxx.workers.dev/api/markers/{id}` (DELETE)

## 第八步：数据迁移

如需从Firebase迁移现有数据，请按照以下步骤操作：

1. 从Firebase导出数据：
   - 使用Firebase Admin SDK或Firebase Console导出订阅数据和标记数据
   - 将数据保存为JSON格式

2. 使用批量导入脚本将数据导入到Cloudflare KV：
   - 我们提供了一个简单的导入脚本，您可以在本地运行
   - 脚本使用Cloudflare API将数据批量导入到对应的KV命名空间

3. 导入脚本示例：
```javascript
// 导入脚本示例 - 保存为import-data.js
const fs = require('fs');
const fetch = require('node-fetch');

// Cloudflare API配置
const CF_API_TOKEN = 'your-api-token';
const CF_ACCOUNT_ID = 'your-account-id';
const MARKERS_NAMESPACE_ID = 'your-markers-namespace-id';
const SUBSCRIPTIONS_NAMESPACE_ID = 'your-subscriptions-namespace-id';

// 读取Firebase导出的数据
const markersData = JSON.parse(fs.readFileSync('./firebase-markers-export.json', 'utf8'));
const subscriptionsData = JSON.parse(fs.readFileSync('./firebase-subscriptions-export.json', 'utf8'));

// 导入标记数据
async function importMarkers() {
  console.log('Importing markers...');
  
  for (const [id, marker] of Object.entries(markersData)) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${MARKERS_NAMESPACE_ID}/values/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(marker)
        }
      );
      
      if (response.ok) {
        console.log(`Imported marker ${id}`);
      } else {
        console.error(`Failed to import marker ${id}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error importing marker ${id}:`, error);
    }
  }
}

// 导入订阅数据
async function importSubscriptions() {
  console.log('Importing subscriptions...');
  
  for (const [id, subscription] of Object.entries(subscriptionsData)) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${SUBSCRIPTIONS_NAMESPACE_ID}/values/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subscription)
        }
      );
      
      if (response.ok) {
        console.log(`Imported subscription ${id}`);
      } else {
        console.error(`Failed to import subscription ${id}:`, await response.text());
      }
    } catch (error) {
      console.error(`Error importing subscription ${id}:`, error);
    }
  }
}

// 运行导入
async function runImport() {
  await importMarkers();
  await importSubscriptions();
  console.log('Import completed!');
}

runImport();
```

## 第九步：验证配置

访问以下URL检查配置是否正确:
```
https://push-notification-service.qingyangzhou85.workers.dev/api/test-config
```

如果一切正常，应该返回:
```json
{
  "success": true,
  "message": "推送通知配置正确",
  "publicKeyConfigured": true
}
```

## 常见问题解答

### KV存储限制
- 免费账户每日可进行100,000次KV操作
- 每个KV值最大可存储25MB
- 更多信息请参见[Cloudflare KV存储限制文档](https://developers.cloudflare.com/workers/platform/limits/#kv-limits)

### 数据备份建议
- 定期导出KV数据以防数据丢失
- 可以使用Cloudflare的API或Wrangler CLI进行数据备份

### 调试提示
- 使用Cloudflare Workers的日志功能查看错误信息
- 在Worker编辑器中使用console.log记录关键操作

### 与Firebase相比的优势
1. **更低的延迟**: Cloudflare Workers在全球边缘网络上运行
2. **更少的代码**: 无需维护单独的云函数和数据库
3. **零成本**: 大多数小型应用可以在免费账户限制内运行
4. **更简单的部署**: 单一代码库，无需分开部署

如有任何问题，请联系管理员获取帮助。 