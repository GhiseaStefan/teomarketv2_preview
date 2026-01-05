<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Development Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * This seeder contains sample/test data for development.
 * Should ONLY be run in local, staging, or testing environments.
 * 
 * Run with: php artisan db:seed --class=DevelopmentSeeder
 * 
 * Note: Make sure ProductionSeeder has been run first!
 */
class DevelopmentSeeder extends Seeder
{
    /**
     * Seed the application's database with development/test data.
     */
    public function run(): void
    {
        $this->command->info('🧪 Seeding dummy/test data (development)...');
        $this->command->warn('⚠️  Make sure ProductionSeeder has been run first!');

        $this->call([
            // Customer groups (must be seeded before test users)
            Develop\CustomerGroupsSeeder::class,

            // Test users (must be seeded before addresses and orders)
            Develop\TestUsersSeeder::class,
            Develop\TestAddressesSeeder::class,

            // Categories (must be seeded before products)
            Develop\CategoriesSeeder::class,

            // Brands (must be seeded before products)
            Develop\BrandsSeeder::class,

            // Products (must be seeded before orders, carts, wishlists, reviews)
            Develop\ProductsSeeder::class,
            Develop\ProductImagesSeeder::class,
            Develop\ProductToCategorySeeder::class,

            // Customers (must be seeded before orders, carts, wishlists, reviews)
            Develop\CustomersSeeder::class,
            
            // Product group prices (depends on products and customer groups)
            Develop\ProductGroupPricesSeeder::class,
            Develop\AddressesSeeder::class,

            // Carts (depends on customers, products, customer groups)
            Develop\CartsSeeder::class,
            Develop\CartItemsSeeder::class,

            // Wishlists (depends on customers, products)
            Develop\WishlistsSeeder::class,

            // Orders (depends on customers, products, payment methods, shipping methods)
            Develop\OrdersSeeder::class,
            Develop\OrderShippingSeeder::class,
            Develop\OrderAddressesSeeder::class,
            Develop\OrderProductsSeeder::class,
            Develop\OrderHistorySeeder::class,

            // Reviews (depends on orders, customers, products)
            Develop\ReviewsSeeder::class,
            Develop\ReviewUsefulSeeder::class,
        ]);

        $this->command->info('✓ Development/test data seeded successfully');
    }
}

