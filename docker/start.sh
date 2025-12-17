#!/bin/bash

# 1. 啟動 PHP-FPM（使用 -F 確保在前台運行，並將其推到背景 [&]）
# 這是確保 PHP-FPM 保持運行的必要步驟。
php-fpm -F &

/usr/sbin/nginx -g 'daemon off;'