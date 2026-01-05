# ETAPA 1: Build (PHP + Node.js)
FROM php:8.4-fpm AS build

# Instalăm dependențele de sistem (am adăugat libpq-dev pentru Postgres)
RUN apt-get update && apt-get install -y \
    curl git unzip libpng-dev libonig-dev libxml2-dev libzip-dev zip libpq-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Instalăm extensiile PHP (am adăugat pdo_pgsql și pgsql)
RUN docker-php-ext-install pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

# Instalăm Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Instalăm dependențele PHP
RUN composer install --no-dev --optimize-autoloader

# Instalăm dependențele JS și compilăm frontend-ul
RUN npm install
RUN npm run build

# ETAPA 2: Serverul Final
FROM php:8.4-fpm

# Instalăm dependențele de sistem și în imaginea finală
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev libzip-dev zip unzip nginx libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Instalăm extensiile PHP și aici
RUN docker-php-ext-install pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .

# Copiem build-ul de React și folderul vendor
COPY --from=build /app/public/build ./public/build
COPY --from=build /app/vendor ./vendor

# Permisiuni și link de storage
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache && \
    chmod -R 775 /var/www/storage /var/www/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/sites-available/default

EXPOSE 80

# Comanda de start: Migrări, Seed, Link Storage și Pornire Server
CMD php artisan migrate --force --seed && php artisan storage:link && service nginx start && php-fpm