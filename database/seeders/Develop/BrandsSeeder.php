<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Brands Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds brands for development/testing.
 * Creates brands based on product names in ProductsSeeder.
 * 
 * Depends on: None (brands are independent)
 */
class BrandsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding brands...');
        $this->seedBrands();
        $this->command->info('✓ Brands seeded successfully');
    }

    private function seedBrands(): void
    {
        $brands = [
            ['name' => 'ASUS', 'slug' => 'asus'],
            ['name' => 'Lenovo', 'slug' => 'lenovo'],
            ['name' => 'Acer', 'slug' => 'acer'],
            ['name' => 'Apple', 'slug' => 'apple'],
            ['name' => 'Dell', 'slug' => 'dell'],
            ['name' => 'HP', 'slug' => 'hp'],
            ['name' => 'Samsung', 'slug' => 'samsung'],
            ['name' => 'Google', 'slug' => 'google'],
            ['name' => 'OnePlus', 'slug' => 'oneplus'],
            ['name' => 'Xiaomi', 'slug' => 'xiaomi'],
            ['name' => 'Sony', 'slug' => 'sony'],
            ['name' => 'Canon', 'slug' => 'canon'],
            ['name' => 'Nikon', 'slug' => 'nikon'],
            ['name' => 'Microsoft', 'slug' => 'microsoft'],
            ['name' => 'Nike', 'slug' => 'nike'],
            ['name' => 'Adidas', 'slug' => 'adidas'],
            ['name' => 'LG', 'slug' => 'lg'],
            ['name' => 'Huawei', 'slug' => 'huawei'],
            ['name' => 'Motorola', 'slug' => 'motorola'],
            ['name' => 'Nokia', 'slug' => 'nokia'],
        ];

        foreach ($brands as $brand) {
            DB::table('brands')->updateOrInsert(
                ['slug' => $brand['slug']],
                [
                    'name' => $brand['name'],
                    'slug' => $brand['slug'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('Created ' . count($brands) . ' brands.');
    }
}

