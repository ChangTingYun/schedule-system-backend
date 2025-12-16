# 1. 使用官方 PHP 映像，包含 PHP-FPM 和所需的擴展
FROM php:8.2-fpm-alpine

# 安裝系統依賴 (git, curl, 等)
RUN apk update && apk add \
    git \
    curl \
    libxml2-dev \
    libzip-dev \
    zip \
    nodejs \
    npm

# 安裝 PHP 擴展
RUN docker-php-ext-install pdo_mysql zip opcache

# 設置工作目錄
WORKDIR /var/www/html

# 將程式碼複製到容器中
COPY . /var/www/html

# 安裝 Composer (PHP 依賴管理器)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 設置權限
RUN chown -R www-data:www-data /var/www/html