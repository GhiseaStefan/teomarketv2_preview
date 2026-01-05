FROM php:8.2-fpm

# Instalăm dependențele de sistem
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    nginx

# Ștergem cache-ul
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Instalăm extensiile PHP necesare pentru Laravel
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Instalăm Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Setăm directorul de lucru
WORKDIR /var/www

# Copiem fișierele proiectului
COPY . /var/www

# Instalăm dependențele Laravel
RUN composer install --no-dev --optimize-autoloader

# Setăm permisiunile pentru Laravel
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Copiem configurația Nginx (o vom crea la pasul următor)
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Expunem portul pe care îl va folosi Render
EXPOSE 80

# Scriptul de pornire
CMD service nginx start && php-fpm