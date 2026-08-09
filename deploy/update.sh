#!/usr/bin/env bash
# 生产一键更新（在 ECS 上执行）：拉代码 → 构建前端 → 同步产物 → 重启后端
# 用法：bash /opt/xmg/ecs-frontend/deploy/update.sh
set -e

echo "==> 拉取最新代码"
git -C /opt/xmg/ecs-test-servers pull --ff-only
git -C /opt/xmg/ecs-frontend pull --ff-only
git -C /opt/xmg/ecs-blog pull --ff-only

echo "==> 构建并同步 ecs-frontend"
cd /opt/xmg/ecs-frontend
npm install --no-audit --no-fund --silent
npm run build
mkdir -p /var/www/admin && cp -r dist/* /var/www/admin/

echo "==> 构建并同步 ecs-blog"
cd /opt/xmg/ecs-blog
npm install --no-audit --no-fund --silent
npm run build
mkdir -p /var/www/blog && cp -r public/* /var/www/blog/

echo "==> 重启后端"
pm2 restart parse-server

echo "==> 更新完成"
