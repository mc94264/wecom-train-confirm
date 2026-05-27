#!/bin/bash
# 域名配置脚本：app.ruibx.com
# 通过阿里云 VNC 登录服务器后执行
# ssh aliyun96（如果 SSH 通）
# 或通过阿里云控制台 → ECS → 远程连接 → VNC

set -e

DOMAIN="app.ruibx.com"

echo "===== 1. 安装 acme.sh 申请 SSL 证书 ====="
curl https://get.acme.sh | sh -s email=admin@ruibx.com
source ~/.bashrc

echo "===== 2. 申请 SSL 证书 ====="
~/.acme.sh/acme.sh --issue -d $DOMAIN --standalone -k ec-256

echo "===== 3. 创建证书目录 ====="
mkdir -p /etc/nginx/ssl/$DOMAIN

echo "===== 4. 安装证书 ====="
~/.acme.sh/acme.sh --install-cert -d $DOMAIN \
  --key-file /etc/nginx/ssl/$DOMAIN/privkey.pem \
  --fullchain-file /etc/nginx/ssl/$DOMAIN/fullchain.pem \
  --ecc

echo "===== 5. 部署 Nginx 配置 ====="
# 备份旧配置
cp /etc/nginx/conf.d/app.conf /etc/nginx/conf.d/app.conf.bak
# 写入新配置
cat > /etc/nginx/conf.d/app.conf << 'NGINX_CONF'
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name app.ruibx.com 8.148.203.96;

    client_max_body_size 100M;

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    server_name app.ruibx.com;

    ssl_certificate     /etc/nginx/ssl/app.ruibx.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/app.ruibx.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}

# 保留 6080 端口（HTTP，无域名）
server {
    listen 6080;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
NGINX_CONF

echo "===== 6. 重载 Nginx ====="
nginx -t && systemctl reload nginx

echo ""
echo "===== ✅ 域名配置完成 ====="
echo "https://$DOMAIN"
echo ""
echo "===== 下一步 ====="
echo "1. https://$DOMAIN 是否可访问"
echo "2. 企微后台配置可信域名：$DOMAIN"
echo "3. 下载验证文件放到 /root/wecom-train-confirm/public/"
echo "4. 重新构建部署或更新 .env.production 后重启："
echo "   cd /opt/wecom-train-confirm"
echo "   kill \$(lsof -ti:3000)"
echo "   export NEXT_PUBLIC_BASE_URL=https://$DOMAIN"
echo "   nohup node .next/standalone/server.js > app.log 2>&1 &"
