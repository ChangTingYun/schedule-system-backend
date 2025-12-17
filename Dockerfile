# Dockerfile: Final Optimized Version for Render Deployment

# 使用帶有 PHP-FPM 的 Alpine Linux 作為基礎映像檔
FROM php:8.2-fpm-alpine

# 安裝系統依賴項
# gettext 包含 envsubst，雖然我們使用 sed，但這個包在處理環境變數時很有用。
RUN apk add --no-cache \
    nginx \
    git \
    curl \
    libxml2-dev \
    libzip-dev \
    zip \
    nodejs \
    npm \
    bash \
    gettext \
    # 安裝必要的工具，例如 sed 所在的 coreutils
    coreutils 

# 安裝 PHP 擴展
RUN docker-php-ext-install pdo_mysql zip opcache

# 安裝 Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# 設定工作目錄
WORKDIR /var/www/html

# 複製 Laravel 原始碼和啟動腳本
COPY . .

# 安裝 Laravel 依賴
RUN composer install --no-dev --optimize-autoloader

# 設定權限 (標準的 Laravel 權限設定)
RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 775 storage bootstrap/cache

# 將自定義 Nginx 配置複製到容器的預期位置
COPY docker/nginx.conf /etc/nginx/nginx.conf

# 複製並設定啟動腳本 (start.sh)
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Render 部署指令：執行 start.sh 腳本
# start.sh 會負責替換 Nginx 埠號，並啟動 Nginx 和 PHP-FPM
CMD ["/usr/local/bin/start.sh"]