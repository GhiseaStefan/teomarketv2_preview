<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Customers Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Ensures customers exist for the 3 test users from TestUsersSeeder.
 * TestUsersSeeder already creates customers, so this is just a fallback.
 * 
 * Depends on: TestUsersSeeder (should run before this)
 */
class CustomersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding customers...');
        $this->seedCustomers();
        $this->command->info('✓ Customers seeded successfully');
    }

    private function seedCustomers(): void
    {
        // This seeder only ensures customers exist for the 3 test users from TestUsersSeeder
        // TestUsersSeeder already creates customers for: b2c@test.com, b2b-standard@test.com, b2b-premium@test.com
        
        // Get the 3 test users from TestUsersSeeder
        $testUserEmails = [
            'b2c@test.com',
            'b2b-standard@test.com',
            'b2b-premium@test.com',
        ];

        foreach ($testUserEmails as $email) {
            $user = DB::table('users')->where('email', $email)->first();
            
            if (!$user) {
                continue; // User doesn't exist (TestUsersSeeder not run yet)
            }

            // If user has a customer_id, customer already exists (created by TestUsersSeeder)
            if ($user->customer_id) {
                continue; // Customer already exists
            }

            // Get customer group ID from user's customer if exists, or use B2C as default
            $customerGroupId = null;
            if ($email === 'b2c@test.com') {
                $customerGroupId = DB::table('customer_groups')->where('code', 'B2C')->value('id');
            } elseif ($email === 'b2b-standard@test.com') {
                $customerGroupId = DB::table('customer_groups')->where('code', 'B2B_STANDARD')->value('id');
            } elseif ($email === 'b2b-premium@test.com') {
                $customerGroupId = DB::table('customer_groups')->where('code', 'B2B_PREMIUM')->value('id');
            }

            if (!$customerGroupId) {
                continue;
            }

            // Create customer for this user
            $customerId = DB::table('customers')->insertGetId([
                'customer_type' => $email === 'b2c@test.com' ? 'individual' : 'company',
                'customer_group_id' => $customerGroupId,
                'company_name' => $email !== 'b2c@test.com' ? 'Test Company SRL' : null,
                'fiscal_code' => $email !== 'b2c@test.com' ? 'RO00000000' : null,
                'reg_number' => $email !== 'b2c@test.com' ? 'J40/0000/2024' : null,
                'phone' => '0700000000',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update user with customer_id
            DB::table('users')->where('id', $user->id)->update([
                'customer_id' => $customerId,
                'updated_at' => now(),
            ]);
        }
    }
}
