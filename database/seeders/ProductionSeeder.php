<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Production Seeder
 * 
 * Static/Lookup Data - Production Data
 * 
 * This seeder contains all essential lookup tables and configuration data
 * that are required in ALL environments, including production.
 * 
 * Run with: php artisan db:seed --class=ProductionSeeder
 */
class ProductionSeeder extends Seeder
{
    /**
     * Seed the application's database with production/static data.
     */
    public function run(): void
    {
        $this->command->info('🌍 Seeding static/lookup data (production)...');

        $this->call([
            // Core data (must be seeded first)
            CountriesSeeder::class,
            CurrenciesSeeder::class,

            // Location data (depends on Countries)
            LocationSeeder::class,

            // Shipping & Payment
            ShippingMethodsSeeder::class,
            PaymentMethodsSeeder::class,

            // Tax system (depends on Countries)
            VatRatesSeeder::class,

            // Shop configuration (depends on Countries)
            ShopInfoSeeder::class,

            // Shipping configurations (depends on Shipping Methods)
            ShippingMethodConfigsSeeder::class,

            // Product attributes (required for variant products)
            AttributesSeeder::class,

            // Product attribute values (required for variant products)
            AttributeValuesSeeder::class,

            // Product families (electronice, fashion, mobila, jucarii, sport, casa si gradina)
            ProductFamiliesSeeder::class,

            // Associate attributes with product families
            AttributeFamilySeeder::class,

            // Admin user (creates production admin user)
            AdminSeeder::class,
        ]);

        $this->command->info('✓ Production/static data seeded successfully');
    }
}
