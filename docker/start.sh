#!/bin/bash

# 1. 啟動 PHP-FPM（這是成功的部分）
/usr/sbin/php-fpm -F &

# 2. 啟動 Nginx
# 這是關鍵的 80 埠佔用者。
# 我們假設 /usr/sbin/nginx 是正確路徑。
/usr/sbin/nginx -g 'daemon off;'