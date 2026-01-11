# ==========================================
# ETAPA 1: Build (PHP + Node.js)
# ==========================================
FROM php:8.4-fpm AS build

# Instalăm dependențele de sistem necesare (inclusiv libpq-dev pentru Postgres și libxml2-dev pentru SOAP)
RUN apt-get update && apt-get install -y \
    curl git unzip libpng-dev libonig-dev libxml2-dev libzip-dev zip libpq-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Instalăm extensiile PHP necesare (adaugat soap și pdo_pgsql)
RUN docker-php-ext-install pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip soap

# Instalăm Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Instalăm dependențele PHP (necesare pentru build-ul de frontend și rutele Wayfinder)
RUN composer install --no-dev --optimize-autoloader

# Instalăm dependențele JS și compilăm frontend-ul pentru Inertia
RUN npm install
RUN npm run build

# ==========================================
# ETAPA 2: Serverul Final (Imagine curată)
# ==========================================
FROM php:8.4-fpm

# Instalăm dependențele de sistem și în imaginea finală (trebuie să avem libpq și libxml)
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev libzip-dev zip unzip nginx libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Reinstalăm extensiile PHP și în imaginea finală pentru a fi active la runtime
RUN docker-php-ext-install pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip soap

# Copiem Composer (util pentru optimizări ulterioare dacă e cazul)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .

# Copiem build-ul de React/Inertia și folderul vendor din etapa de build
COPY --from=build /app/public/build ./public/build
COPY --from=build /app/vendor ./vendor

# Setăm permisiunile corecte pentru storage și cache (esențial pentru a evita eroarea 500)
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache && \
    chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Copiem configurația Nginx custom
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Expunem portul standard
EXPOSE 80

# COMANDA DE START:
# 1. Rulăm migrările (force pentru producție)
# 2. Populăm baza de date (seeding)
# 3. Creăm link-ul către storage (pentru imagini)
# 4. Pornim Nginx și PHP-FPM
CMD php artisan migrate:fresh --force --seed && \
    php artisan storage:link && \
    service nginx start && \
    php-fpm