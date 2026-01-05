# ETAPA 1: Compilăm React (Node.js)
FROM node:20 AS node-build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# ETAPA 2: Serverul PHP 8.4
FROM php:8.4-fpm

# Instalăm dependențele de sistem
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev libzip-dev zip unzip nginx

# Instalăm extensiile PHP
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Instalăm Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .

# Copiem fișierele React compilate din prima etapă
COPY --from=node-build /app/public/build ./public/build

# Instalăm dependențele Laravel
RUN composer install --no-dev --optimize-autoloader

# Permisiuni
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Configurația Nginx
COPY docker/nginx.conf /etc/nginx/sites-available/default

EXPOSE 80

# Rulăm migrările și pornim serverul
CMD php artisan migrate --force && service nginx start && php-fpm