#!/bin/bash

# 1. 啟動 PHP-FPM（使用 -F 確保在前台運行，並將其推到背景 [&]）
# 這是確保 PHP-FPM 保持運行的必要步驟。
php-fpm -F &

# 2. 啟動 Nginx（使用 'daemon off;' 確保在前台運行，並作為主要進程）
# Nginx 現在監聽標準埠號 80。
nginx -g 'daemon off;'