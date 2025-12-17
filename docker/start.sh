#!/bin/bash

# 1. (關鍵步驟) 檢查 $PORT 是否存在，並將 Nginx 配置中的 80 埠號替換為 $PORT
# Render 將 $PORT 注入到環境中，我們用 sed 進行替換。
# 注意：這裡假設您的 docker/nginx.conf 中 listen 行是 listen 80;
sed -i "s/listen 80;/listen ${PORT};/g" /etc/nginx/nginx.conf

# 2. 啟動 PHP-FPM（保持在前台）
php-fpm -F &

# 3. 啟動 Nginx（保持在前台）
nginx -g 'daemon off;'