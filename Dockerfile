# ETAPA 1: Build (PHP + Node.js)
FROM php:8.4-fpm AS build

# Instalăm Node.js, npm și dependențele de sistem necesare
RUN apt-get update && apt-get install -y \
    curl git unzip libpng-dev libonig-dev libxml2-dev libzip-dev zip \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Instalăm extensiile PHP necesare pentru ca 'php artisan' să funcționeze
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Instalăm Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Instalăm dependențele PHP (necesare pentru Wayfinder/Artisan)
RUN composer install --no-dev --optimize-autoloader

# Instalăm dependențele JS și compilăm frontend-ul
RUN npm install
RUN npm run build

# ETAPA 2: Serverul Final (Imagine curată)
FROM php:8.4-fpm

RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev libzip-dev zip unzip nginx \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .

# Copiem build-ul de React din prima etapă
COPY --from=build /app/public/build ./public/build
# Copiem și folderul vendor creat în prima etapă pentru a economisi timp
COPY --from=build /app/vendor ./vendor

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/sites-available/default

EXPOSE 80

CMD php artisan migrate --force && service nginx start && php-fpm