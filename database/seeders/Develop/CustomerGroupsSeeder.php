<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Customer Groups Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds customer groups used for testing.
 * This seeder must run BEFORE TestUsersSeeder.
 * 
 * Depends on: None (customer groups are independent)
 */
class CustomerGroupsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding customer groups...');

        $customerGroups = [
            [
                'name' => 'B2C Standard',
                'code' => 'B2C',
            ],
            [
                'name' => 'B2B Standard',
                'code' => 'B2B_STANDARD',
            ],
            [
                'name' => 'B2B Premium',
                'code' => 'B2B_PREMIUM',
            ],
        ];

        foreach ($customerGroups as $group) {
            $existing = DB::table('customer_groups')->where('code', $group['code'])->first();

            if ($existing) {
                // Update existing group (preserve created_at)
                DB::table('customer_groups')
                    ->where('code', $group['code'])
                    ->update([
                        'name' => $group['name'],
                        'updated_at' => now(),
                    ]);
            } else {
                // Insert new group
                DB::table('customer_groups')->insert(array_merge($group, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }

        $this->command->info('✓ Customer groups seeded successfully');
    }
}
