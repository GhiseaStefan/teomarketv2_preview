<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Test Users Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds test users and customers for each customer group.
 * Creates test accounts for B2C, B2B Premium, and B2B Standard groups.
 * 
 * Depends on: CustomerGroupsSeeder
 */
class TestUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding test users...');
        $this->seedTestUsers();
        $this->command->info('✓ Test users seeded successfully');
    }

    private function seedTestUsers(): void
    {
        // Get customer group IDs
        $customerGroupIds = DB::table('customer_groups')->pluck('id', 'code')->toArray();

        if (empty($customerGroupIds)) {
            $this->command->warn('Customer groups not found. Please run CustomerGroupsSeeder first.');
            return;
        }

        $defaultB2CGroupId = $customerGroupIds['B2C'] ?? null;

        // Create test customers and users for each group
        $testData = [
            [
                'group_code' => 'B2C',
                'customer' => [
                    'customer_type' => 'individual',
                    'phone' => '0711111111',
                ],
                'user' => [
                    'email' => 'b2c@test.com',
                    'password' => Hash::make('password'),
                    'first_name' => 'B2C',
                    'last_name' => 'Test User',
                ],
            ],
            [
                'group_code' => 'B2B_STANDARD',
                'customer' => [
                    'customer_type' => 'company',
                    'phone' => '0722222222',
                    'company_name' => 'B2B Standard Test SRL',
                    'fiscal_code' => 'RO22222222',
                    'reg_number' => 'J40/2222/2024',
                    'bank_name' => 'ING Bank',
                    'iban' => 'RO89INGB0000999901234567',
                ],
                'user' => [
                    'email' => 'b2b-standard@test.com',
                    'password' => Hash::make('password'),
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                ],
            ],
            [
                'group_code' => 'B2B_PREMIUM',
                'customer' => [
                    'customer_type' => 'company',
                    'phone' => '0733333333',
                    'company_name' => 'B2B Premium Test SRL',
                    'fiscal_code' => 'RO33333333',
                    'reg_number' => 'J40/3333/2024',
                    'bank_name' => 'BCR',
                    'iban' => 'RO49AAAA1B31007593840000',
                ],
                'user' => [
                    'email' => 'b2b-premium@test.com',
                    'password' => Hash::make('password'),
                    'first_name' => 'B2B Premium',
                    'last_name' => 'Test User',
                ],
            ],
        ];

        // Get Romania country for addresses
        $romania = DB::table('countries')->where('iso_code_2', 'RO')->first();

        // Get Cluj state and city for headquarters address
        $clujState = null;
        $clujCity = null;
        if ($romania) {
            $clujState = DB::table('states')
                ->where('country_id', $romania->id)
                ->where('code', 'CJ')
                ->first();

            if ($clujState) {
                $clujCity = DB::table('cities')
                    ->where('state_id', $clujState->id)
                    ->where('name', 'Cluj-Napoca')
                    ->first();
            }
        }

        foreach ($testData as $data) {
            $customerGroupId = $customerGroupIds[$data['group_code']] ?? $defaultB2CGroupId;

            // Check if user already exists
            $existingUser = DB::table('users')->where('email', $data['user']['email'])->first();

            if ($existingUser) {
                // User already exists, use existing customer_id
                $customerId = $existingUser->customer_id;

                // Update customer if needed
                DB::table('customers')->updateOrInsert(
                    ['id' => $customerId],
                    [
                        'customer_type' => $data['customer']['customer_type'],
                        'customer_group_id' => $customerGroupId,
                        'company_name' => $data['customer']['company_name'] ?? null,
                        'reg_number' => $data['customer']['reg_number'] ?? null,
                        'fiscal_code' => $data['customer']['fiscal_code'] ?? null,
                        'phone' => $data['customer']['phone'],
                        'bank_name' => $data['customer']['bank_name'] ?? null,
                        'iban' => $data['customer']['iban'] ?? null,
                        'updated_at' => now(),
                    ]
                );

                // Update user
                DB::table('users')->where('email', $data['user']['email'])->update([
                    'password' => $data['user']['password'],
                    'first_name' => $data['user']['first_name'],
                    'last_name' => $data['user']['last_name'],
                    'updated_at' => now(),
                ]);
            } else {
                // Create customer
                $customerId = DB::table('customers')->insertGetId([
                    'customer_type' => $data['customer']['customer_type'],
                    'customer_group_id' => $customerGroupId,
                    'company_name' => $data['customer']['company_name'] ?? null,
                    'reg_number' => $data['customer']['reg_number'] ?? null,
                    'fiscal_code' => $data['customer']['fiscal_code'] ?? null,
                    'phone' => $data['customer']['phone'],
                    'bank_name' => $data['customer']['bank_name'] ?? null,
                    'iban' => $data['customer']['iban'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Create user for this customer
                DB::table('users')->insert([
                    'customer_id' => $customerId,
                    'email' => $data['user']['email'],
                    'password' => $data['user']['password'],
                    'first_name' => $data['user']['first_name'],
                    'last_name' => $data['user']['last_name'],
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Create headquarters address for company customers (B2B Premium)
            if ($data['customer']['customer_type'] === 'company' && $data['group_code'] === 'B2B_PREMIUM') {
                $hasHeadquarters = DB::table('addresses')
                    ->where('customer_id', $customerId)
                    ->where('address_type', 'headquarters')
                    ->exists();

                if (!$hasHeadquarters && $romania && $clujState && $clujCity) {
                    DB::table('addresses')->insert([
                        'customer_id' => $customerId,
                        'address_type' => 'headquarters',
                        'is_preferred' => false,
                        'first_name' => $data['user']['first_name'],
                        'last_name' => $data['user']['last_name'],
                        'phone' => $data['customer']['phone'],
                        'address_line_1' => 'Str. Memorandumului, Nr. 28',
                        'address_line_2' => 'Bl. A1, Sc. 1, Ap. 10',
                        'city' => $clujCity->name,
                        'county_name' => $clujState->name,
                        'county_code' => $clujState->code ?? 'CJ',
                        'country_id' => $romania->id,
                        'zip_code' => '400114',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        $this->command->info('Created test users for all customer groups:');
        $this->command->info('- B2C: b2c@test.com / password');
        $this->command->info('- B2B Standard: b2b-standard@test.com / password');

        // Verify B2B Premium user was created
        $b2bPremiumUser = DB::table('users')->where('email', 'b2b-premium@test.com')->first();
        if ($b2bPremiumUser) {
            $this->command->info("- B2B Premium: b2b-premium@test.com / password (Customer ID: {$b2bPremiumUser->customer_id})");
        } else {
            $this->command->error('- B2B Premium: b2b-premium@test.com - FAILED TO CREATE!');
        }
    }
}
