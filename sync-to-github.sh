#!/bin/bash
# 同步到GitHub的脚本

echo "开始同步到GitHub..."

# 检查是否已初始化Git仓库
if [ ! -d .git ]; then
  echo "初始化Git仓库..."
  git init
  echo "添加.gitignore文件..."
  # .gitignore应该已经存在
fi

# 添加所有更改的文件
echo "添加更改的文件..."
git add .

# 获取当前时间作为提交信息
COMMIT_MSG="更新推送通知代码: $(date '+%Y-%m-%d %H:%M:%S')"

# 提交更改
echo "提交更改..."
git commit -m "$COMMIT_MSG"

# 检查是否已设置远程仓库
REMOTE_EXISTS=$(git remote | grep origin)
if [ -z "$REMOTE_EXISTS" ]; then
  echo "您需要设置远程仓库，请输入您的GitHub仓库URL:"
  read REPO_URL
  git remote add origin $REPO_URL
  echo "设置origin为: $REPO_URL"
fi

# 推送到GitHub
echo "推送到GitHub..."
git push -u origin main

echo "同步完成!"
echo "注意: 请确保config.js文件未被提交 (应该在.gitignore中)" 