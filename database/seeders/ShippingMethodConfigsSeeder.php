<?php

namespace Database\Seeders;

use App\Models\ShippingMethod;
use App\Models\ShippingMethodConfig;
use Illuminate\Database\Seeder;

/**
 * Shipping Method Configs Seeder
 * 
 * Static/Lookup Data - Required for production
 * 
 * Seeds shipping method configurations.
 * Depends on: ShippingMethodsSeeder
 * Uses updateOrCreate for idempotency.
 */
class ShippingMethodConfigsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding shipping method configs...');

        // Get shipping methods by code (not hardcoded IDs)
        $sameday = ShippingMethod::where('code', 'sameday_locker')->first();
        $fancourier = ShippingMethod::where('code', 'fancourier')->first();

        if (!$sameday || !$fancourier) {
            $this->command->error('Required shipping methods not found. Please run ShippingMethodsSeeder first.');
            return;
        }

        $configs = [
            [
                'shipping_method_id' => $sameday->id,
                'config_key' => 'api_user',
                'config_value' => 'sameday_user'
            ],
            [
                'shipping_method_id' => $sameday->id,
                'config_key' => 'api_key',
                'config_value' => 'sameday_api_key_123'
            ],
            [
                'shipping_method_id' => $sameday->id,
                'config_key' => 'client_id',
                'config_value' => 'client_123'
            ],
            [
                'shipping_method_id' => $fancourier->id,
                'config_key' => 'api_user',
                'config_value' => 'fancourier_user'
            ],
            [
                'shipping_method_id' => $fancourier->id,
                'config_key' => 'api_key',
                'config_value' => 'fancourier_api_key_456'
            ],
            [
                'shipping_method_id' => $fancourier->id,
                'config_key' => 'password',
                'config_value' => 'fancourier_pass'
            ],
        ];

        foreach ($configs as $config) {
            ShippingMethodConfig::updateOrCreate(
                [
                    'shipping_method_id' => $config['shipping_method_id'],
                    'config_key' => $config['config_key']
                ],
                array_merge($config, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✓ Shipping method configs seeded successfully');
    }
}

