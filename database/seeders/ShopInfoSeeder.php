<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\ShopInfo;
use Illuminate\Database\Seeder;

/**
 * Shop Info Seeder
 * 
 * Static/Lookup Data - Required for production
 * 
 * Seeds shop information.
 * Depends on: CountriesSeeder
 * Uses updateOrCreate for idempotency.
 */
class ShopInfoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding shop info...');

        // Get Romania by ISO code (not hardcoded ID)
        $romania = Country::where('iso_code_2', 'RO')->first();

        if (!$romania) {
            $this->command->error('Romania country not found. Please run CountriesSeeder first.');
            return;
        }

        ShopInfo::updateOrCreate(
            ['id' => 1],
            [
                'shop_name' => 'TeoMarket',
                'company_name' => 'TeoMarket SRL',
                'cui' => 'RO27078460',
                'reg_com' => 'J2010000700161',
                'address' => 'Str. Grefierului Nr. 2',
                'city' => 'Dobridor',
                'county' => 'Dolj',
                'country_id' => $romania->id,
                'email_contact' => 'contact@teomarket.ro',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $this->command->info('✓ Shop info seeded successfully');
    }
}
