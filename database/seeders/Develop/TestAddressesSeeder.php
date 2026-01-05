<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Test Addresses Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds test addresses for all test users.
 * - B2B Premium: 1 headquarters address, 2 billing addresses, 2 shipping addresses
 * - B2C & B2B Standard: Random shipping addresses
 * 
 * Depends on: TestUsersSeeder, LocationSeeder
 */
class TestAddressesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding test addresses...');

        // Get Romania country
        $romania = DB::table('countries')->where('iso_code_2', 'RO')->first();

        if (!$romania) {
            $this->command->warn('Romania country not found. Please run CountriesSeeder first.');
            return;
        }

        // Seed addresses for all test users
        $this->seedB2BPremiumAddresses($romania);
        $this->seedB2CAddresses($romania);
        $this->seedB2BStandardAddresses($romania);

        $this->command->info('✓ Test addresses seeded successfully');
    }

    /**
     * Seed addresses for B2B Premium user.
     */
    private function seedB2BPremiumAddresses($romania): void
    {
        // Get B2B Premium user
        $user = DB::table('users')->where('email', 'b2b-premium@test.com')->first();

        if (!$user || !$user->customer_id) {
            $this->command->warn('B2B Premium user not found. Skipping address seeding.');
            return;
        }

        // Get states and cities
        $clujState = DB::table('states')
            ->where('country_id', $romania->id)
            ->where('name', 'like', '%Cluj%')
            ->first();

        $clujCity = null;
        if ($clujState) {
            $clujCity = DB::table('cities')
                ->where('state_id', $clujState->id)
                ->where('name', 'like', '%Cluj%')
                ->first();
        }

        $bucurestiState = DB::table('states')
            ->where('country_id', $romania->id)
            ->where(function ($query) {
                $query->where('name', 'like', '%București%')
                    ->orWhere('name', 'like', '%Ilfov%')
                    ->orWhere('name', 'like', '%Bucharest%');
            })
            ->first();

        $bucurestiCity = null;
        if ($bucurestiState) {
            $bucurestiCity = DB::table('cities')
                ->where('state_id', $bucurestiState->id)
                ->where(function ($query) {
                    $query->where('name', 'like', '%București%')
                        ->orWhere('name', 'like', '%Bucharest%')
                        ->orWhere('name', '=', 'Bucuresti');
                })
                ->first();
        }

        if ($bucurestiState && !$bucurestiCity) {
            $bucurestiCity = DB::table('cities')
                ->where('state_id', $bucurestiState->id)
                ->first();
        }

        // Get Timisoara for second billing address (different from headquarters)
        $timisoaraState = DB::table('states')
            ->where('country_id', $romania->id)
            ->where(function ($query) {
                $query->where('name', 'like', '%Timiș%')
                    ->orWhere('name', 'like', '%Timis%');
            })
            ->first();

        $timisoaraCity = null;
        if ($timisoaraState) {
            $timisoaraCity = DB::table('cities')
                ->where('state_id', $timisoaraState->id)
                ->where('name', 'like', '%Timișoara%')
                ->first();
        }

        $addressesCreated = 0;

        // 1. Create headquarters address in Cluj-Napoca
        $hasHeadquarters = DB::table('addresses')
            ->where('customer_id', $user->customer_id)
            ->where('address_type', 'headquarters')
            ->exists();

        if (!$hasHeadquarters && $clujState && $clujCity) {
            DB::table('addresses')->insert([
                'customer_id' => $user->customer_id,
                'address_type' => 'headquarters',
                'is_preferred' => false,
                'first_name' => 'B2B Premium',
                'last_name' => 'Test User',
                'phone' => '0733333333',
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
            $addressesCreated++;
            $this->command->info('Created headquarters address in Cluj-Napoca.');
        }

        // 2. Create billing addresses (2 total) - make sure they don't match headquarters
        $billingAddresses = DB::table('addresses')
            ->where('customer_id', $user->customer_id)
            ->where('address_type', 'billing')
            ->count();

        // First billing address in București
        if ($billingAddresses === 0 && $bucurestiState && $bucurestiCity) {
            DB::table('addresses')->insert([
                'customer_id' => $user->customer_id,
                'address_type' => 'billing',
                'is_preferred' => true,
                'first_name' => 'B2B Premium',
                'last_name' => 'Test User',
                'phone' => '0733333333',
                'address_line_1' => 'Calea Victoriei, Nr. 120',
                'address_line_2' => 'Et. 3, Birou 305',
                'city' => $bucurestiCity->name,
                'county_name' => $bucurestiState->name,
                'county_code' => $bucurestiState->code ?? 'B',
                'country_id' => $romania->id,
                'zip_code' => '010061',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $addressesCreated++;
            $billingAddresses++;
            $this->command->info('Created first billing address in București.');
        }

        // Second billing address in Timișoara (different from headquarters in Cluj)
        if ($billingAddresses === 1 && $timisoaraState && $timisoaraCity) {
            DB::table('addresses')->insert([
                'customer_id' => $user->customer_id,
                'address_type' => 'billing',
                'is_preferred' => false,
                'first_name' => 'B2B Premium',
                'last_name' => 'Test User',
                'phone' => '0733333333',
                'address_line_1' => 'Bd. Revolutiei din 1989, Nr. 5',
                'address_line_2' => 'Et. 2, Birou 201',
                'city' => $timisoaraCity->name,
                'county_name' => $timisoaraState->name,
                'county_code' => $timisoaraState->code ?? 'TM',
                'country_id' => $romania->id,
                'zip_code' => '300001',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $addressesCreated++;
            $this->command->info('Created second billing address in Timișoara.');
        }

        // 3. Create 2 shipping addresses (random locations)
        $shippingAddresses = DB::table('addresses')
            ->where('customer_id', $user->customer_id)
            ->where('address_type', 'shipping')
            ->count();

        // First shipping address
        if ($shippingAddresses === 0) {
            $randomLocation = $this->getRandomLocation($romania->id, ['Cluj', 'București', 'Timiș']);
            if ($randomLocation) {
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'shipping',
                    'is_preferred' => true,
                    'first_name' => 'B2B Premium',
                    'last_name' => 'Test User',
                    'phone' => '0733333333',
                    'address_line_1' => $this->generateRandomStreetAddress(),
                    'address_line_2' => $this->generateRandomAddressLine2(),
                    'city' => $randomLocation['city']->name,
                    'county_name' => $randomLocation['state']->name,
                    'county_code' => $randomLocation['state']->code ?? '',
                    'country_id' => $romania->id,
                    'zip_code' => $this->generateRandomZipCode(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $shippingAddresses++;
                $this->command->info("Created first shipping address in {$randomLocation['city']->name}.");
            }
        }

        // Second shipping address for B2B Premium
        if ($shippingAddresses === 1) {
            $randomLocation = $this->getRandomLocation($romania->id, ['Cluj', 'București', 'Timiș']);
            if ($randomLocation) {
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'shipping',
                    'is_preferred' => false,
                    'first_name' => 'B2B Premium',
                    'last_name' => 'Test User',
                    'phone' => '0733333333',
                    'address_line_1' => $this->generateRandomStreetAddress(),
                    'address_line_2' => $this->generateRandomAddressLine2(),
                    'city' => $randomLocation['city']->name,
                    'county_name' => $randomLocation['state']->name,
                    'county_code' => $randomLocation['state']->code ?? '',
                    'country_id' => $romania->id,
                    'zip_code' => $this->generateRandomZipCode(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $this->command->info("Created second shipping address in {$randomLocation['city']->name}.");
            }
        }

        if ($addressesCreated > 0) {
            $this->command->info("Added {$addressesCreated} address(es) for B2B Premium user.");
        }
    }

    /**
     * Seed shipping addresses for B2C user.
     */
    private function seedB2CAddresses($romania): void
    {
        $user = DB::table('users')->where('email', 'b2c@test.com')->first();

        if (!$user || !$user->customer_id) {
            return;
        }

        $shippingAddresses = DB::table('addresses')
            ->where('customer_id', $user->customer_id)
            ->where('address_type', 'shipping')
            ->count();

        // Add 1-2 random shipping addresses
        $addressCount = rand(1, 2);
        $addressesCreated = 0;

        for ($i = 0; $i < $addressCount && $shippingAddresses < 2; $i++) {
            $randomLocation = $this->getRandomLocation($romania->id);
            if ($randomLocation) {
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'shipping',
                    'is_preferred' => $i === 0,
                    'first_name' => 'B2C',
                    'last_name' => 'Test User',
                    'phone' => '0711111111',
                    'address_line_1' => $this->generateRandomStreetAddress(),
                    'address_line_2' => $this->generateRandomAddressLine2(),
                    'city' => $randomLocation['city']->name,
                    'county_name' => $randomLocation['state']->name,
                    'county_code' => $randomLocation['state']->code ?? '',
                    'country_id' => $romania->id,
                    'zip_code' => $this->generateRandomZipCode(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $shippingAddresses++;
            }
        }

        if ($addressesCreated > 0) {
            $this->command->info("Added {$addressesCreated} shipping address(es) for B2C user.");
        }
    }

    /**
     * Seed addresses for B2B Standard user.
     */
    private function seedB2BStandardAddresses($romania): void
    {
        $user = DB::table('users')->where('email', 'b2b-standard@test.com')->first();

        if (!$user || !$user->customer_id) {
            return;
        }

        // Get Iasi for headquarters
        $iasiState = DB::table('states')
            ->where('country_id', $romania->id)
            ->where(function ($query) {
                $query->where('name', 'like', '%Iași%')
                    ->orWhere('name', 'like', '%Iasi%');
            })
            ->first();

        $iasiCity = null;
        if ($iasiState) {
            $iasiCity = DB::table('cities')
                ->where('state_id', $iasiState->id)
                ->where(function ($query) {
                    $query->where('name', 'like', '%Iași%')
                        ->orWhere('name', 'like', '%Iasi%');
                })
                ->first();

            // Fallback: get any city from Iasi state
            if (!$iasiCity) {
                $iasiCity = DB::table('cities')
                    ->where('state_id', $iasiState->id)
                    ->first();
            }
        }

        // Get Constanta for first billing address
        $constantaState = DB::table('states')
            ->where('country_id', $romania->id)
            ->where(function ($query) {
                $query->where('name', 'like', '%Constanța%')
                    ->orWhere('name', 'like', '%Constanta%');
            })
            ->first();

        $constantaCity = null;
        if ($constantaState) {
            $constantaCity = DB::table('cities')
                ->where('state_id', $constantaState->id)
                ->where(function ($query) {
                    $query->where('name', 'like', '%Constanța%')
                        ->orWhere('name', 'like', '%Constanta%');
                })
                ->first();

            // Fallback: get any city from Constanta state
            if (!$constantaCity) {
                $constantaCity = DB::table('cities')
                    ->where('state_id', $constantaState->id)
                    ->first();
            }
        }

        // Get Brasov for second billing address
        $brasovState = DB::table('states')
            ->where('country_id', $romania->id)
            ->where(function ($query) {
                $query->where('name', 'like', '%Brașov%')
                    ->orWhere('name', 'like', '%Brasov%');
            })
            ->first();

        $brasovCity = null;
        if ($brasovState) {
            $brasovCity = DB::table('cities')
                ->where('state_id', $brasovState->id)
                ->where(function ($query) {
                    $query->where('name', 'like', '%Brașov%')
                        ->orWhere('name', 'like', '%Brasov%');
                })
                ->first();

            // Fallback: get any city from Brasov state
            if (!$brasovCity) {
                $brasovCity = DB::table('cities')
                    ->where('state_id', $brasovState->id)
                    ->first();
            }
        }

        $addressesCreated = 0;

        // 1. Create headquarters address in Iași
        $hasHeadquarters = DB::table('addresses')
            ->where('customer_id', $user->customer_id)
            ->where('address_type', 'headquarters')
            ->exists();

        if (!$hasHeadquarters) {
            if ($iasiState && $iasiCity) {
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'headquarters',
                    'is_preferred' => false,
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                    'phone' => '0722222222',
                    'address_line_1' => 'Bd. Carol I, Nr. 11',
                    'address_line_2' => 'Bl. A, Sc. 1, Et. 2',
                    'city' => $iasiCity->name,
                    'county_name' => $iasiState->name,
                    'county_code' => $iasiState->code ?? 'IS',
                    'country_id' => $romania->id,
                    'zip_code' => '700506',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $this->command->info('Created headquarters address in Iași.');
            } else {
                // Fallback: use hardcoded values
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'headquarters',
                    'is_preferred' => false,
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                    'phone' => '0722222222',
                    'address_line_1' => 'Bd. Carol I, Nr. 11',
                    'address_line_2' => 'Bl. A, Sc. 1, Et. 2',
                    'city' => 'Iasi',
                    'county_name' => $iasiState ? $iasiState->name : 'Iasi',
                    'county_code' => $iasiState ? ($iasiState->code ?? 'IS') : 'IS',
                    'country_id' => $romania->id,
                    'zip_code' => '700506',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $this->command->info('Created headquarters address in Iași (with hardcoded values).');
            }
        } else {
            $this->command->info('Headquarters address already exists. Skipping.');
        }

        // 2. Create billing addresses (2 total) - make sure they don't match headquarters
        $billingAddresses = DB::table('addresses')
            ->where('customer_id', $user->customer_id)
            ->where('address_type', 'billing')
            ->count();

        // First billing address in Constanța
        if ($billingAddresses === 0) {
            if ($constantaState && $constantaCity) {
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'billing',
                    'is_preferred' => true,
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                    'phone' => '0722222222',
                    'address_line_1' => 'Bd. Mamaia, Nr. 255',
                    'address_line_2' => 'Et. 1, Birou 15',
                    'city' => $constantaCity->name,
                    'county_name' => $constantaState->name,
                    'county_code' => $constantaState->code ?? 'CT',
                    'country_id' => $romania->id,
                    'zip_code' => '900001',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $billingAddresses++;
                $this->command->info('Created first billing address in Constanța.');
            } else {
                // Fallback: use hardcoded values
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'billing',
                    'is_preferred' => true,
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                    'phone' => '0722222222',
                    'address_line_1' => 'Bd. Mamaia, Nr. 255',
                    'address_line_2' => 'Et. 1, Birou 15',
                    'city' => 'Constanta',
                    'county_name' => $constantaState ? $constantaState->name : 'Constanta',
                    'county_code' => $constantaState ? ($constantaState->code ?? 'CT') : 'CT',
                    'country_id' => $romania->id,
                    'zip_code' => '900001',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $billingAddresses++;
                $this->command->info('Created first billing address in Constanța (with hardcoded values).');
            }
        } else if ($billingAddresses >= 1) {
            $this->command->info('First billing address already exists. Skipping.');
        }

        // Second billing address in Brașov
        if ($billingAddresses === 1) {
            if ($brasovState && $brasovCity) {
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'billing',
                    'is_preferred' => false,
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                    'phone' => '0722222222',
                    'address_line_1' => 'Str. Republicii, Nr. 34',
                    'address_line_2' => 'Et. 2, Birou 208',
                    'city' => $brasovCity->name,
                    'county_name' => $brasovState->name,
                    'county_code' => $brasovState->code ?? 'BV',
                    'country_id' => $romania->id,
                    'zip_code' => '500030',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $this->command->info('Created second billing address in Brașov.');
            } else {
                // Fallback: use hardcoded values
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'billing',
                    'is_preferred' => false,
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                    'phone' => '0722222222',
                    'address_line_1' => 'Str. Republicii, Nr. 34',
                    'address_line_2' => 'Et. 2, Birou 208',
                    'city' => 'Brasov',
                    'county_name' => $brasovState ? $brasovState->name : 'Brasov',
                    'county_code' => $brasovState ? ($brasovState->code ?? 'BV') : 'BV',
                    'country_id' => $romania->id,
                    'zip_code' => '500030',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $this->command->info('Created second billing address in Brașov (with hardcoded values).');
            }
        } else if ($billingAddresses >= 2) {
            $this->command->info('Billing addresses already exist (2 or more). Skipping.');
        } else if ($billingAddresses === 1) {
            $this->command->warn('Could not find Brasov state or city. Skipping second billing address.');
        }

        // 3. Create shipping addresses (random locations)
        $shippingAddresses = DB::table('addresses')
            ->where('customer_id', $user->customer_id)
            ->where('address_type', 'shipping')
            ->count();

        // Add 1-2 random shipping addresses
        $addressCount = rand(1, 2);

        for ($i = 0; $i < $addressCount && $shippingAddresses < 2; $i++) {
            $randomLocation = $this->getRandomLocation($romania->id, ['Iași', 'Constanța', 'Brașov']);
            if ($randomLocation) {
                DB::table('addresses')->insert([
                    'customer_id' => $user->customer_id,
                    'address_type' => 'shipping',
                    'is_preferred' => $i === 0,
                    'first_name' => 'B2B Standard',
                    'last_name' => 'Test User',
                    'phone' => '0722222222',
                    'address_line_1' => $this->generateRandomStreetAddress(),
                    'address_line_2' => $this->generateRandomAddressLine2(),
                    'city' => $randomLocation['city']->name,
                    'county_name' => $randomLocation['state']->name,
                    'county_code' => $randomLocation['state']->code ?? '',
                    'country_id' => $romania->id,
                    'zip_code' => $this->generateRandomZipCode(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $addressesCreated++;
                $shippingAddresses++;
            }
        }

        if ($addressesCreated > 0) {
            $this->command->info("Added {$addressesCreated} address(es) for B2B Standard user.");
        }
    }

    /**
     * Get a random location (state and city) from Romania.
     * 
     * @param int $countryId
     * @param array $excludeStateNames Optional array of state names to exclude
     * @return array|null ['state' => object, 'city' => object] or null
     */
    private function getRandomLocation(int $countryId, array $excludeStateNames = []): ?array
    {
        $query = DB::table('states')
            ->where('country_id', $countryId);

        if (!empty($excludeStateNames)) {
            foreach ($excludeStateNames as $excludeName) {
                $query->where('name', 'not like', "%{$excludeName}%");
            }
        }

        $states = $query->get();

        if ($states->isEmpty()) {
            // Fallback: get any state
            $states = DB::table('states')
                ->where('country_id', $countryId)
                ->get();
        }

        if ($states->isEmpty()) {
            return null;
        }

        // Get random state
        $randomState = $states->random();

        // Get cities for this state
        $cities = DB::table('cities')
            ->where('state_id', $randomState->id)
            ->get();

        if ($cities->isEmpty()) {
            return null;
        }

        // Get random city
        $randomCity = $cities->random();

        return [
            'state' => $randomState,
            'city' => $randomCity,
        ];
    }

    /**
     * Generate a random street address.
     */
    private function generateRandomStreetAddress(): string
    {
        $streetTypes = ['Str.', 'Bd.', 'Calea', 'Aleea', 'Sos.'];
        $streetNames = [
            'Unirii',
            'Libertatii',
            'Independenței',
            'Revoluției',
            'Victoriei',
            'Mihai Eminescu',
            'George Cosbuc',
            'Ion Creanga',
            'Stefan cel Mare',
            'Traian',
            'Decebal',
            '1 Mai',
            '23 August',
            'Republicii'
        ];

        $streetType = $streetTypes[array_rand($streetTypes)];
        $streetName = $streetNames[array_rand($streetNames)];
        $number = rand(1, 200);

        return "{$streetType} {$streetName}, Nr. {$number}";
    }

    /**
     * Generate a random address line 2 (optional details).
     */
    private function generateRandomAddressLine2(): ?string
    {
        if (rand(0, 1) === 0) {
            return null;
        }

        $options = [
            'Bl. ' . chr(65 + rand(0, 5)) . rand(1, 10) . ', Sc. ' . rand(1, 4) . ', Ap. ' . rand(1, 100),
            'Et. ' . rand(1, 5) . ', Birou ' . rand(100, 500),
            'Intrare ' . rand(1, 4),
        ];

        return $options[array_rand($options)];
    }

    /**
     * Generate a random Romanian zip code.
     */
    private function generateRandomZipCode(): string
    {
        return str_pad((string)rand(100000, 999999), 6, '0', STR_PAD_LEFT);
    }
}
