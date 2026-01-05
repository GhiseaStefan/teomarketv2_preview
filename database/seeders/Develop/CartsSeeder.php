<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Carts Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds shopping carts for development/testing.
 * Creates active carts for various customers (both logged in and guest).
 * 
 * Depends on: CustomersSeeder, CustomerGroupsSeeder
 */
class CartsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding carts...');
        $this->seedCarts();
        $this->command->info('✓ Carts seeded successfully');
    }

    private function seedCarts(): void
    {
        // Get customer groups
        $b2cGroup = DB::table('customer_groups')->where('code', 'B2C')->first();
        $b2bStandardGroup = DB::table('customer_groups')->where('code', 'B2B_STANDARD')->first();
        $b2bPremiumGroup = DB::table('customer_groups')->where('code', 'B2B_PREMIUM')->first();

        // Get test users
        $testUsers = [
            'b2c@test.com',
            'b2b-standard@test.com',
            'b2b-premium@test.com',
        ];

        $cartsCreated = 0;

        // Create carts for test users
        foreach ($testUsers as $email) {
            $user = DB::table('users')->where('email', $email)->first();
            
            if (!$user || !$user->customer_id) {
                continue;
            }

            $customer = DB::table('customers')->where('id', $user->customer_id)->first();
            if (!$customer) {
                continue;
            }

            // Check if cart already exists
            $existingCart = DB::table('carts')
                ->where('customer_id', $user->customer_id)
                ->where('status', 'active')
                ->first();

            if ($existingCart) {
                continue;
            }

            $customerGroupId = $customer->customer_group_id;

            DB::table('carts')->insert([
                'session_id' => null,
                'customer_id' => $user->customer_id,
                'customer_group_id' => $customerGroupId,
                'coupon_code' => null,
                'total_amount' => null, // Will be calculated when items are added
                'status' => 'active',
                'client_ip' => '127.0.0.1',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $cartsCreated++;
        }

        // Create carts for some regular customers from CustomersSeeder
        $regularCustomers = DB::table('customers')
            ->join('users', 'customers.id', '=', 'users.customer_id')
            ->whereIn('users.email', [
                'ion.popescu@example.com',
                'maria.ionescu@example.com',
                'andrei.stoica@example.com',
            ])
            ->select('customers.id', 'customers.customer_group_id')
            ->limit(3)
            ->get();

        foreach ($regularCustomers as $customer) {
            $existingCart = DB::table('carts')
                ->where('customer_id', $customer->id)
                ->where('status', 'active')
                ->first();

            if ($existingCart) {
                continue;
            }

            DB::table('carts')->insert([
                'session_id' => null,
                'customer_id' => $customer->id,
                'customer_group_id' => $customer->customer_group_id,
                'coupon_code' => null,
                'total_amount' => null,
                'status' => 'active',
                'client_ip' => '127.0.0.1',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $cartsCreated++;
        }

        // Create a few guest carts (with session_id but no customer_id)
        for ($i = 1; $i <= 2; $i++) {
            DB::table('carts')->insert([
                'session_id' => 'guest_session_' . $i . '_' . time(),
                'customer_id' => null,
                'customer_group_id' => $b2cGroup ? $b2cGroup->id : null,
                'coupon_code' => null,
                'total_amount' => null,
                'status' => 'active',
                'client_ip' => '127.0.0.1',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $cartsCreated++;
        }

        if ($cartsCreated > 0) {
            $this->command->info("Created {$cartsCreated} cart(s).");
        } else {
            $this->command->info('All carts already exist or no customers found.');
        }
    }
}

