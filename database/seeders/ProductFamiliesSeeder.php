<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductFamily;

/**
 * Product Families Seeder
 * 
 * Static/Lookup Data - Production Data
 * 
 * Seeds only the product families (electronice, fashion, mobila, jucarii, sport, casa si gradina).
 * Does NOT associate attributes or products - that's done in other seeders:
 * - AttributeFamilySeeder: associates attributes with families
 * - ProductAttributeValuesSeeder (develop): associates products with families and attributes
 * 
 * Run with: php artisan db:seed --class=ProductFamiliesSeeder
 */
class ProductFamiliesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating/Updating product families...');

        // Create families (or get existing ones)
        $this->createFamilies();

        $this->command->info('✓ Product families seeded successfully');
    }

    /**
     * Create product families.
     */
    private function createFamilies(): void
    {
        $familiesData = [
            [
                'name' => 'Electronice',
                'code' => 'electronics',
            ],
            [
                'name' => 'Fashion',
                'code' => 'fashion',
            ],
            [
                'name' => 'Mobila',
                'code' => 'furniture',
            ],
            [
                'name' => 'Jucarii',
                'code' => 'toys',
            ],
            [
                'name' => 'Sport',
                'code' => 'sports',
            ],
            [
                'name' => 'Casa si Gradina',
                'code' => 'home-garden',
            ],
        ];

        foreach ($familiesData as $familyData) {
            $family = ProductFamily::firstOrCreate(
                ['code' => $familyData['code']],
                [
                    'name' => $familyData['name'],
                    'status' => true,
                ]
            );
            $this->command->info("  ✓ Created/Updated family: {$family->name} ({$family->code})");
        }
    }
}
