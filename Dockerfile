# Folosim PHP 8.4 care este cerut de noile pachete Symfony/Laravel
FROM php:8.4-fpm

# Instalăm dependențele de sistem incluzând libzip pentru extensia zip
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    nginx

# Ștergem cache-ul
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Instalăm extensiile PHP (am adăugat și 'zip')
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Instalăm Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Setăm directorul de lucru
WORKDIR /var/www

# Copiem fișierele proiectului
COPY . /var/www

# Instalăm dependențele Laravel folosind flag-ul de ignorare platformă pentru siguranță
RUN composer install --no-dev --optimize-autoloader

# Setăm permisiunile
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Copiem configurația Nginx
COPY docker/nginx.conf /etc/nginx/sites-available/default

EXPOSE 80

CMD php artisan migrate --force && service nginx start && php-fpm