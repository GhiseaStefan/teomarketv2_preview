<?php

namespace Database\Seeders;

use App\Enums\ShippingMethodType;
use App\Models\ShippingMethod;
use Illuminate\Database\Seeder;

/**
 * Shipping Methods Seeder
 * 
 * Static/Lookup Data - Required for production
 * 
 * Seeds shipping methods used in the application.
 * Uses updateOrCreate for idempotency.
 */
class ShippingMethodsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding shipping methods...');

        $methods = [
            ['name' => 'Curier Rapid', 'code' => 'sameday_locker', 'type' => ShippingMethodType::COURIER->value, 'cost' => 25.00, 'estimated_days' => 2],
            ['name' => 'Ridicare Sediu', 'code' => 'pickup_store', 'type' => ShippingMethodType::PICKUP->value, 'cost' => 0.00, 'estimated_days' => 1],
            ['name' => 'FanCourier', 'code' => 'fancourier', 'type' => ShippingMethodType::COURIER->value, 'cost' => 15.00, 'estimated_days' => 3],
            ['name' => 'GLS', 'code' => 'gls', 'type' => ShippingMethodType::COURIER->value, 'cost' => 20.00, 'estimated_days' => 2],
            ['name' => 'DPD', 'code' => 'dpd', 'type' => ShippingMethodType::COURIER->value, 'cost' => 18.00, 'estimated_days' => 3],
            ['name' => 'Ridicare Punct FanCourier', 'code' => 'pickup_fancourier', 'type' => ShippingMethodType::PICKUP->value, 'cost' => 0.00, 'estimated_days' => 1],
            ['name' => 'Ridicare Punct GLS', 'code' => 'pickup_gls', 'type' => ShippingMethodType::PICKUP->value, 'cost' => 0.00, 'estimated_days' => 1],
        ];

        foreach ($methods as $method) {
            ShippingMethod::updateOrCreate(
                ['code' => $method['code']],
                array_merge($method, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✓ Shipping methods seeded successfully');
    }
}

