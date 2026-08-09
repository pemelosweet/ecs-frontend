# 生产部署指南（ECS + nginx 直装）

部署架构：nginx 托管两个前端静态站并反代 `/parse`，pm2 常驻 Parse Server，MongoDB 本机运行，文件存 OSS。

```
admin.xmg111.xyz ─┬─ /            → /var/www/admin（管理后台静态产物）
                  ├─ /parse/      → 127.0.0.1:1337（Parse Server）
                  └─ /dashboard/  → 127.0.0.1:1337（看板）
xmg111.xyz ───────┬─ /            → /var/www/blog（博客静态产物）
                  └─ /parse/      → 127.0.0.1:1337
```

## 1. 安装运行环境

```bash
# Node.js 20 + pm2
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
npm install -g pm2

# MongoDB 8
cat > /etc/yum.repos.d/mongodb-org-8.0.repo <<'EOF'
[mongodb-org-8.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/8.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-8.0.asc
EOF
dnf install -y mongodb-org
systemctl enable --now mongod
```

## 2. 拉代码 + 启动后端

```bash
mkdir -p /opt/xmg && cd /opt/xmg
git clone https://github.com/pemelosweet/ecs-test-servers.git
git clone https://github.com/pemelosweet/ecs-frontend.git
git clone https://github.com/pemelosweet/ecs-blog.git

cd ecs-test-servers
cp .env.example .env && vi .env
```

`.env` 生产值（与本地的差异见注释）：

```bash
PARSE_APP_ID=com.xmg.admin                          # 必须与前端代码一致
PARSE_MASTER_KEY=<openssl rand -hex 32 新生成>       # 建议生产单独一个
PARSE_SERVER_URL=http://127.0.0.1:1337/parse        # 内部寻址用本机回环
DATABASE_URI=mongodb://127.0.0.1:27017/ecs
PUBLIC_SERVER_URL=https://admin.xmg111.xyz/parse    # 对外地址必须是域名
OSS_*                                               # 四项照抄本地 .env
PARSE_DASHBOARD_PASSWORD=<强密码>                    # 看板默认 admin/admin123 必须换
```

```bash
npm ci
pm2 start ecosystem.config.js && pm2 save && pm2 startup
curl http://127.0.0.1:1337/health    # 应返回 {"status":"ok"}
```

## 3. 构建两个前端

```bash
cd /opt/xmg/ecs-frontend && npm ci && npm run build
mkdir -p /var/www/admin && cp -r dist/* /var/www/admin/

cd /opt/xmg/ecs-blog && npm ci && npm run build     # 该项目 outDir 是 public/
mkdir -p /var/www/blog && cp -r public/* /var/www/blog/
```

## 4. 切换 nginx

```bash
# 旧 form-frontend 容器占着 80/443，先停（验证通过后再 rm）
docker stop form-frontend

# 确认证书在宿主机上
ls /etc/letsencrypt/live/admin.xmg111.xyz/ /etc/letsencrypt/live/xmg111.xyz/
```

**情况 A：ECS 上没装宝塔** —— 装系统 nginx：

```bash
dnf install -y nginx
cp /opt/xmg/ecs-frontend/deploy/nginx-xmg.conf /etc/nginx/conf.d/xmg.conf
nginx -t && systemctl enable --now nginx
```

**情况 B：ECS 上已装宝塔** —— 别装系统 nginx（会和宝塔的抢端口），把配置放进宝塔 nginx 的站点目录：

```bash
cp /opt/xmg/ecs-frontend/deploy/nginx-xmg.conf /www/server/panel/vhost/nginx/xmg.conf
# 宝塔面板里删掉之前手动建的 admin/xmg 两个站点（避免配置重复），或确认站点配置不冲突
nginx -t && /etc/init.d/nginx reload
```

## 5. 验证

```bash
curl -k https://127.0.0.1/ -H "Host: admin.xmg111.xyz"               # 管理后台 HTML
curl -k "https://127.0.0.1/parse/classes/Profile?limit=1" \
     -H "Host: admin.xmg111.xyz" -H "X-Parse-Application-Id: com.xmg.admin"
curl -k https://127.0.0.1/ -H "Host: xmg111.xyz"                     # 博客 HTML
```

浏览器打开 `https://admin.xmg111.xyz` 注册登录、保存档案，`https://xmg111.xyz` 看博客回填。

## 注意事项

1. 生产 MongoDB 是空库，注册新账号后重填档案即可
2. 安全组只开 80 / 443，1337、27017 不对公网开放
3. 证书续期：certbot renew 后 `nginx -s reload`
4. 更新代码：`git pull` 后后端 `pm2 restart parse-server`，前端重新 build 覆盖 /var/www
