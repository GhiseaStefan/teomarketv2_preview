<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

/**
 * Payment Methods Seeder
 * 
 * Static/Lookup Data - Required for production
 * 
 * Seeds payment methods used in the application.
 * Uses updateOrCreate for idempotency.
 */
class PaymentMethodsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding payment methods...');

        $methods = [
            ['name' => 'Card Online', 'code' => 'stripe', 'is_active' => true],
            ['name' => 'Ramburs', 'code' => 'cash_on_delivery', 'is_active' => true],
            ['name' => 'OP', 'code' => 'bank_transfer', 'is_active' => true],
        ];

        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(
                ['code' => $method['code']],
                array_merge($method, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✓ Payment methods seeded successfully');
    }
}

