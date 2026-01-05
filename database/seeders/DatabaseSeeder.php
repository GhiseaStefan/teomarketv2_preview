<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;

/**
 * Database Seeder - Master Orchestrator
 * 
 * This seeder acts as the main orchestrator for all seeders.
 * It does NOT contain actual seeding logic - it only calls other seeders
 * in the correct order to maintain referential integrity.
 * 
 * Structure:
 * 1. Static/Lookup Data (runs in ALL environments including production)
 * 2. Dummy/Test Data (runs ONLY in local, staging, testing environments)
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * 
     * This is the master orchestrator that calls:
     * 1. ProductionSeeder - for static/lookup data (runs in ALL environments)
     * 2. DevelopmentSeeder - for test data (runs ONLY in local/staging/testing)
     * 
     * You can also run these seeders separately:
     * - php artisan db:seed --class=ProductionSeeder
     * - php artisan db:seed --class=DevelopmentSeeder
     */
    public function run(): void
    {
        // ============================================
        // 1. STATIC/LOOKUP DATA (Production Data)
        // ============================================
        // These seeders run in ALL environments (including production)
        // They contain essential lookup tables and configuration data

        $this->call(ProductionSeeder::class);

        // ============================================
        // 2. DUMMY/TEST DATA (Development Only)
        // ============================================
        // These seeders run ONLY in local, staging, or testing environments
        // They contain sample/test data for development

        if (App::environment(['local', 'staging', 'testing'])) {
            $this->call(DevelopmentSeeder::class);
        }
    }
}
