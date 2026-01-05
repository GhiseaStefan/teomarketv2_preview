<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

/**
 * Countries Seeder
 * 
 * Static/Lookup Data - Required for production
 * 
 * Seeds countries that are used in the application.
 * Uses updateOrCreate for idempotency.
 */
class CountriesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding countries...');

        $countries = [
            ['name' => 'Romania', 'iso_code_2' => 'RO', 'iso_code_3' => 'ROU', 'status' => true],
            ['name' => 'Bulgaria', 'iso_code_2' => 'BG', 'iso_code_3' => 'BGR', 'status' => true],
            ['name' => 'Ungaria', 'iso_code_2' => 'HU', 'iso_code_3' => 'HUN', 'status' => true],
            ['name' => 'Italia', 'iso_code_2' => 'IT', 'iso_code_3' => 'ITA', 'status' => true],
            ['name' => 'Germania', 'iso_code_2' => 'DE', 'iso_code_3' => 'DEU', 'status' => true],
            ['name' => 'Moldova', 'iso_code_2' => 'MD', 'iso_code_3' => 'MDA', 'status' => true],
        ];

        foreach ($countries as $country) {
            Country::updateOrCreate(
                ['iso_code_3' => $country['iso_code_3']],
                array_merge($country, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✓ Countries seeded successfully');
    }
}

