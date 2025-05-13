/**
 * Firebase到Cloudflare KV数据迁移辅助工具
 * 将Firebase中的数据导出并导入到Cloudflare KV存储
 */

// 使用方法：
// 1. 安装所需依赖：npm install node-fetch firebase-admin dotenv
// 2. 创建.env文件并填写所需配置
// 3. 运行脚本：node firebase-to-cloudflare.js

require('dotenv').config();
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 配置信息
const config = {
  // Cloudflare API配置
  cloudflare: {
    apiToken: process.env.CF_API_TOKEN,
    accountId: process.env.CF_ACCOUNT_ID,
    namespaces: {
      markers: process.env.CF_MARKERS_NAMESPACE_ID,
      subscriptions: process.env.CF_SUBSCRIPTIONS_NAMESPACE_ID,
      adminUsers: process.env.CF_ADMIN_USERS_NAMESPACE_ID
    }
  },
  
  // Firebase配置
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  },
  
  // 导出配置
  export: {
    path: './firebase-export',
    collections: ['markers', 'push-subscriptions', 'adminUsers']
  }
};

// 初始化Firebase Admin SDK
function initFirebase() {
  try {
    const serviceAccount = require(config.firebase.serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: config.firebase.databaseURL
    });
    console.log('Firebase初始化成功');
    return admin.database();
  } catch (error) {
    console.error('Firebase初始化失败:', error);
    process.exit(1);
  }
}

// 从Firebase导出数据
async function exportFromFirebase(db) {
  console.log('开始从Firebase导出数据...');
  
  // 创建导出目录
  if (!fs.existsSync(config.export.path)) {
    fs.mkdirSync(config.export.path, { recursive: true });
  }
  
  for (const collection of config.export.collections) {
    try {
      console.log(`导出 ${collection} 集合...`);
      const snapshot = await db.ref(collection).once('value');
      const data = snapshot.val() || {};
      
      // 保存到文件
      const filePath = path.join(config.export.path, `${collection}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`成功导出 ${Object.keys(data).length} 条记录到 ${filePath}`);
    } catch (error) {
      console.error(`导出 ${collection} 失败:`, error);
    }
  }
  
  console.log('Firebase数据导出完成');
}

// 将数据导入到Cloudflare KV
async function importToCloudflare() {
  console.log('开始导入数据到Cloudflare KV...');
  
  // 映射集合名称到KV命名空间
  const collectionToNamespace = {
    'markers': config.cloudflare.namespaces.markers,
    'push-subscriptions': config.cloudflare.namespaces.subscriptions,
    'adminUsers': config.cloudflare.namespaces.adminUsers
  };
  
  for (const [collection, namespaceId] of Object.entries(collectionToNamespace)) {
    try {
      const filePath = path.join(config.export.path, `${collection}.json`);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.warn(`找不到 ${filePath}，跳过导入`);
        continue;
      }
      
      console.log(`导入 ${collection} 到Cloudflare KV...`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      let importedCount = 0;
      let failedCount = 0;
      
      // 批量处理，每批25个
      const entries = Object.entries(data);
      const batchSize = 25;
      
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const batchPromises = batch.map(async ([key, value]) => {
          try {
            const response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${config.cloudflare.apiToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(value)
              }
            );
            
            if (response.ok) {
              importedCount++;
              return true;
            } else {
              console.error(`导入 ${collection}/${key} 失败:`, await response.text());
              failedCount++;
              return false;
            }
          } catch (error) {
            console.error(`导入 ${collection}/${key} 出错:`, error);
            failedCount++;
            return false;
          }
        });
        
        await Promise.all(batchPromises);
        console.log(`正在处理 ${collection}: ${i + batch.length}/${entries.length}`);
      }
      
      console.log(`${collection} 导入完成: 成功 ${importedCount}, 失败 ${failedCount}`);
    } catch (error) {
      console.error(`导入 ${collection} 失败:`, error);
    }
  }
  
  console.log('Cloudflare KV导入完成');
}

// 验证Cloudflare配置
async function validateCloudflareConfig() {
  console.log('验证Cloudflare配置...');
  
  // 检查API Token是否有效
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/user/tokens/verify`,
      {
        headers: {
          'Authorization': `Bearer ${config.cloudflare.apiToken}`
        }
      }
    );
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('Cloudflare API Token无效:', data.errors);
      return false;
    }
    
    console.log('Cloudflare API Token有效');
  } catch (error) {
    console.error('验证Cloudflare API Token失败:', error);
    return false;
  }
  
  // 检查命名空间是否存在
  const namespaces = Object.entries(config.cloudflare.namespaces);
  let allValid = true;
  
  for (const [name, id] of namespaces) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.accountId}/storage/kv/namespaces/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${config.cloudflare.apiToken}`
          }
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        console.error(`Cloudflare KV命名空间 ${name} (${id}) 无效:`, data.errors);
        allValid = false;
      } else {
        console.log(`Cloudflare KV命名空间 ${name} (${id}) 有效`);
      }
    } catch (error) {
      console.error(`验证Cloudflare KV命名空间 ${name} (${id}) 失败:`, error);
      allValid = false;
    }
  }
  
  return allValid;
}

// 主函数
async function main() {
  console.log('===== Firebase到Cloudflare KV数据迁移工具 =====');
  
  // 检查环境变量
  const requiredEnvVars = [
    'CF_API_TOKEN',
    'CF_ACCOUNT_ID',
    'CF_MARKERS_NAMESPACE_ID',
    'CF_SUBSCRIPTIONS_NAMESPACE_ID',
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    'FIREBASE_DATABASE_URL'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingEnvVars.length > 0) {
    console.error('缺少必要的环境变量:', missingEnvVars.join(', '));
    console.error('请在.env文件中设置这些变量');
    process.exit(1);
  }
  
  // 验证Cloudflare配置
  const cloudflareValid = await validateCloudflareConfig();
  if (!cloudflareValid) {
    console.error('Cloudflare配置无效，请检查您的设置');
    process.exit(1);
  }
  
  // 初始化Firebase并导出数据
  const db = initFirebase();
  await exportFromFirebase(db);
  
  // 导入数据到Cloudflare KV
  await importToCloudflare();
  
  console.log('===== 数据迁移完成 =====');
}

// 运行主函数
main().catch(error => {
  console.error('迁移过程中发生错误:', error);
  process.exit(1);
}); 