#!/bin/bash

# 1. (強制性) 檢查 Nginx 配置語法並輸出結果，如果失敗則腳本退出
# -c /etc/nginx/nginx.conf 確保它讀取的是我們 COPY 進去的配置文件
# -t 測試模式
/usr/sbin/nginx -c /etc/nginx/nginx.conf -t 

# 檢查 Nginx 語法是否成功 (exit code 0)
if [ $? -ne 0 ]; then
    echo "🚨 FINAL NGINX FATAL ERROR: Nginx config is invalid. Check syntax in docker/nginx.conf."
    exit 1 
fi

# 2. 啟動 PHP-FPM
/usr/sbin/php-fpm -F &

# 3. 啟動 Nginx (在確保配置正確後，啟動服務)
/usr/sbin/nginx -g 'daemon off;'